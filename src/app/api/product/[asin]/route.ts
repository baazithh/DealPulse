import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, parseUsdString } from "@/lib/currency";
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

// ── Extraction Helpers ────────────────────────────────────────────────────────
function getOriginalUsd(
  p: Record<string, unknown>
): number | null {
  const raw = p.product_original_price ?? p.list_price ?? p.mrp;
  return parseUsdString(String(raw));
}

function getOneStarPct(
  p: Record<string, unknown>
): number {
  if (!p.rating_distribution) return 0;
  const dist = p.rating_distribution as Record<string, string | number>;
  const oneStar = dist["1"];
  if (oneStar == null) return 0;
  return parseInt(String(oneStar).replace("%", ""), 10) || 0;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
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

async function getHistoricData(asin: string): Promise<{ priceInr: number | null, oneStarPct: number | null }> {
  if (isDummySupabase()) return { priceInr: null, oneStarPct: null };
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data } = await sb
      .from("price_history")
      .select("price_inr, one_star_pct")
      .eq("asin", asin)
      .lt("recorded_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();
    return {
      priceInr: data?.price_inr as number ?? null,
      oneStarPct: data?.one_star_pct as number ?? null
    };
  } catch {
    return { priceInr: null, oneStarPct: null };
  }
}

async function upsertPriceHistory(asin: string, priceInr: number, stockPct: number, oneStarPct: number) {
  if (isDummySupabase()) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    await sb.from("price_history").insert({ asin, price_inr: priceInr, stock_pct: stockPct, one_star_pct: oneStarPct });
  } catch { /* ignore */ }
}

// ── Global Ping Wrapper ───────────────────────────────────────────────────────
async function safePingGlobal(asin: string, country: string): Promise<{ country: string, priceRaw: number | null, currency: string | null }> {
  try {
    // Timeout applied to not block main IN request if RapidAPI is slow globally
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://${RAPIDAPI_HOST}/product-details?asin=${asin}&country=${country}`, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      signal: controller.signal
    });
    clearTimeout(id);

    if (!res.ok) return { country, priceRaw: null, currency: null };
    const data = await res.json();
    const p = data?.data ?? data;
    const raw = parseUsdString(p.product_price ?? p.price?.value);
    return { country, priceRaw: raw, currency: p.currency ?? null };
  } catch {
    return { country, priceRaw: null, currency: null };
  }
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

  // 2. Fetch product details, global arbitrage, exchange rates, and history
  try {
    const [rates, detailRes, dbHistory, usPing, dePing] = await Promise.all([
      getExchangeRates(),
      rapidFetch(`/product-details?asin=${asin}&country=IN`),
      getHistoricData(asin),
      safePingGlobal(asin, "US"),
      safePingGlobal(asin, "DE")
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
    const priceInr = rawPrice != null ? (isAlreadyInr ? rawPrice : Math.round(rawPrice * rates.usdToInr)) : null;

    // ── Sentiment Analysis ────────────────────────────────────────────────────
    const currentOneStarPct = getOneStarPct(p);

    // ── Yesterday Price ───────────────────────────────────────────────────────
    let yesterdayPriceInr: number | null = dbHistory.priceInr;
    
    if (yesterdayPriceInr == null) {
      const origUsd = getOriginalUsd(p);
      if (origUsd != null) {
         yesterdayPriceInr = isAlreadyInr ? origUsd : Math.round(origUsd * rates.usdToInr);
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
        ? runDecisionEngine(
            priceInr, 
            yesterdayPriceInr, 
            stockPct, 
            currentOneStarPct, 
            dbHistory.oneStarPct
          )
        : null;

    // ── Global Arbitrage ──────────────────────────────────────────────────────
    const global_deals = [];
    if (usPing.priceRaw) {
      const pInr = usPing.currency === "INR" ? usPing.priceRaw : Math.round(usPing.priceRaw * rates.usdToInr);
      global_deals.push({ country: "US", price_inr: pInr });
    }
    if (dePing.priceRaw) {
      const pInr = dePing.currency === "INR" ? dePing.priceRaw : Math.round(dePing.priceRaw * rates.eurToInr);
      global_deals.push({ country: "DE", price_inr: pInr });
    }

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
      one_star_pct: currentOneStarPct,
      global_deals: global_deals,
      usd_rate: rates.usdToInr,
      eur_rate: rates.eurToInr,
      fetched_at: new Date().toISOString(),
    };

    // 3. Write-through cache upsert and history record (non-blocking)
    await Promise.all([
      upsertProductCache(row),
      priceInr != null ? upsertPriceHistory(asin, priceInr, stockPct, currentOneStarPct) : Promise.resolve(),
    ]);

    return NextResponse.json({ ...row, fromCache: false });
  } catch (err) {
    console.error("Product route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
