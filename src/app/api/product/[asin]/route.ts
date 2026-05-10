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
// Since the free plan does not include the price-history endpoint,
// we'll attempt to use the product_original_price (MRP/List price) or
// rely entirely on our Supabase cache.
function getOriginalUsd(
  p: Record<string, unknown>
): number | null {
  const raw = p.product_original_price ?? p.list_price ?? p.mrp;
  return parseUsdString(String(raw));
}

// ── Supabase helpers (graceful no-op if credentials not set) ─────────────────
function isDummySupabase() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");
}

async function getCachedProduct(asin: string) {
  if (isDummySupabase()) return null;
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
  if (isDummySupabase()) return;
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

async function getYesterdayPrice(asin: string): Promise<number | null> {
  if (isDummySupabase()) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await sb
      .from("price_history")
      .select("price_inr")
      .eq("asin", asin)
      .lt("recorded_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();
    return (data?.price_inr as number) ?? null;
  } catch {
    return null;
  }
}

async function upsertPriceHistory(asin: string, priceInr: number, stockPct: number) {
  if (isDummySupabase()) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await sb.from("price_history").insert({ asin, price_inr: priceInr, stock_pct: stockPct });
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

  // 2. Fetch product details + exchange rate in parallel
  try {
    const [inrRate, detailRes, dbYesterdayInr] = await Promise.all([
      getUsdToInrRate(),
      rapidFetch(`/product-details?asin=${asin}&country=IN`),
      getYesterdayPrice(asin),
    ]);

    if (!detailRes.ok) {
      const errText = await detailRes.text();
      console.error("RapidAPI product-details error:", errText);
      return NextResponse.json({ error: "Upstream product fetch failed" }, { status: 502 });
    }

    const detailData = await detailRes.json();
    const p = detailData?.data ?? detailData;

    // ── Current price ─────────────────────────────────────────────────────────
    const rawPrice = parseUsdString(p.product_price ?? p.price?.value);
    const isAlreadyInr = p.currency === "INR" || (p.product_price as string)?.includes("₹");
    const priceInr = rawPrice != null ? (isAlreadyInr ? rawPrice : Math.round(rawPrice * inrRate)) : null;

    // ── Yesterday Price ───────────────────────────────────────────────────────
    // Prefer Supabase's historical price if it exists
    let yesterdayPriceInr: number | null = dbYesterdayInr;
    
    // If no Supabase history, try to use the "Original Price" (MRP) from Amazon as a proxy
    if (yesterdayPriceInr == null) {
      const origUsd = getOriginalUsd(p);
      if (origUsd != null) {
         yesterdayPriceInr = isAlreadyInr ? origUsd : Math.round(origUsd * inrRate);
      }
    }


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

    // 3. Write-through cache upsert and history record (non-blocking)
    await Promise.all([
      upsertProductCache(row),
      priceInr != null ? upsertPriceHistory(asin, priceInr, stockPct) : Promise.resolve(),
    ]);

    return NextResponse.json({ ...row, fromCache: false });
  } catch (err) {
    console.error("Product route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
