import { NextRequest, NextResponse } from "next/server";
import { getUsdToInrRate, parseUsdString } from "@/lib/currency";
import { runDecisionEngine } from "@/lib/decisionEngine";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? "real-time-amazon-data.p.rapidapi.com";

// ── RapidAPI fetch helper ─────────────────────────────────────────────────────
function rapidFetch(path: string) {
  return fetch(`https://${RAPIDAPI_HOST}${path}`, {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  });
}

// ── Extract yesterday's price from price-history response ─────────────────────
function extractYesterdayUsd(
  historyData: Record<string, unknown>
): number | null {
  try {
    // The API returns an array under data.price_history or data
    const arr: unknown[] =
      (historyData?.data as Record<string, unknown>)?.price_history as unknown[] ??
      historyData?.price_history as unknown[] ??
      [];

    if (!Array.isArray(arr) || arr.length === 0) return null;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Find the entry closest to 24 h ago (between 20h and 36h ago)
    const candidates = arr.filter((entry) => {
      const e = entry as Record<string, unknown>;
      const ts = e.date ?? e.timestamp ?? e.time ?? e.datetime;
      if (!ts) return false;
      const diff = now - new Date(ts as string).getTime();
      return diff >= oneDayMs * 0.8 && diff <= oneDayMs * 1.5;
    });

    // If nothing in that window, take the second-to-last entry
    const target =
      candidates.length > 0
        ? candidates[candidates.length - 1]
        : arr.length >= 2
        ? arr[arr.length - 2]
        : null;

    if (!target) return null;

    const e = target as Record<string, unknown>;
    const raw =
      e.price ??
      e.product_price ??
      e.value ??
      (e.prices as Record<string, unknown>)?.[0];

    return parseUsdString(String(raw));
  } catch {
    return null;
  }
}

// ── Supabase helpers (graceful no-op if credentials not set) ─────────────────
async function getCachedProduct(asin: string) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await sb
      .from("product_cache")
      .select("*")
      .eq("asin", asin)
      .gt("fetched_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

async function upsertProductCache(row: Record<string, unknown>) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await sb.from("product_cache").upsert(row, { onConflict: "asin" });
  } catch { /* ignore */ }
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ asin: string }> }
) {
  const { asin } = await params;
  if (!asin) return NextResponse.json({ error: "ASIN required" }, { status: 400 });

  // 1. Check write-through cache (< 6 h old)
  const cached = await getCachedProduct(asin);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  // 2. Fetch product details + price history + exchange rate in parallel
  try {
    const [inrRate, detailRes, historyRes] = await Promise.all([
      getUsdToInrRate(),
      rapidFetch(`/product-details?asin=${asin}&country=IN`),
      rapidFetch(`/product-price-history?asin=${asin}&country=IN`),
    ]);

    if (!detailRes.ok) {
      const errText = await detailRes.text();
      console.error("RapidAPI product-details error:", errText);
      return NextResponse.json({ error: "Upstream product fetch failed" }, { status: 502 });
    }

    const detailData = await detailRes.json();
    const p = detailData?.data ?? detailData;

    // ── Price history for Yesterday ───────────────────────────────────────────
    let yesterdayPriceInr: number | null = null;
    if (historyRes.ok) {
      const historyData: Record<string, unknown> = await historyRes.json();
      const yesterdayUsd = extractYesterdayUsd(historyData);
      if (yesterdayUsd != null) {
        yesterdayPriceInr = Math.round(yesterdayUsd * inrRate);
        console.log(`[${asin}] Yesterday USD via API: $${yesterdayUsd} → ₹${yesterdayPriceInr}`);
      } else {
        console.log(`[${asin}] No yesterday price found in history response`);
      }
    } else {
      console.warn(`[${asin}] price-history endpoint returned ${historyRes.status}`);
    }

    // ── Current price ─────────────────────────────────────────────────────────
    const usdPrice = parseUsdString(p.product_price ?? p.price?.value);
    const priceInr = usdPrice != null ? Math.round(usdPrice * inrRate) : null;

    // ── Stock percentage ──────────────────────────────────────────────────────
    let stockPct = 50;
    const availText: string = (p.product_availability ?? p.availability ?? "").toLowerCase();
    if (availText.includes("out of stock")) stockPct = 0;
    else if (availText.includes("only")) {
      const m = availText.match(/only (\d+)/);
      if (m) stockPct = Math.min(parseInt(m[1], 10) * 5, 30);
    } else if (availText.includes("in stock")) stockPct = 70;

    // ── Decision Engine ───────────────────────────────────────────────────────
    const engine =
      priceInr != null
        ? runDecisionEngine(priceInr, yesterdayPriceInr, stockPct)
        : null;

    const row = {
      asin,
      title: p.product_title ?? p.title,
      image: p.product_photo ?? p.main_image ?? p.images?.[0],
      price_inr: priceInr,
      yesterday_price_inr: yesterdayPriceInr,
      tomorrow_price_inr: engine ? Math.round(engine.tomorrowPrice) : null,
      delta: engine?.delta ?? null,
      signal: engine?.signal ?? null,
      stock_pct: stockPct,
      product_url: p.product_url ?? p.url,
      raw_availability: availText,
      inr_rate: inrRate,
      fetched_at: new Date().toISOString(),
    };

    // 3. Write-through cache upsert (non-blocking)
    upsertProductCache(row);

    return NextResponse.json({ ...row, fromCache: false });
  } catch (err) {
    console.error("Product route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
