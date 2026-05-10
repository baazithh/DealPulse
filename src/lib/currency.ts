/**
 * Currency conversion utility.
 * Fetches live USD→INR and EUR→INR rates from exchangerate-api (free tier, no key needed).
 * Falls back to env var USD_TO_INR (default 83.5) and EUR_TO_INR (default 90.0) if the request fails.
 */

export interface Rates {
  usdToInr: number;
  eurToInr: number;
}

let cachedRates: Rates | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<Rates> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL_MS) return cachedRates;

  let usdToInr = parseFloat(process.env.USD_TO_INR ?? "83.5");
  if (isNaN(usdToInr)) usdToInr = 83.5;
  let eurToInr = parseFloat(process.env.EUR_TO_INR ?? "90.0");
  if (isNaN(eurToInr)) eurToInr = 90.0;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500);

    // open.er-api.com returns a base of USD, providing rates for INR and EUR.
    // EUR -> INR = (USD -> INR) / (USD -> EUR)
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 3600 }, signal: controller.signal }
    );
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR && data?.rates?.EUR) {
        usdToInr = data.rates.INR as number;
        eurToInr = (data.rates.INR as number) / (data.rates.EUR as number);

        cachedRates = { usdToInr, eurToInr };
        cacheTimestamp = now;
        return cachedRates;
      }
    }
  } catch {
    // Silent fallback
  }

  return { usdToInr, eurToInr };
}

// Deprecated usage backward compatibility wrapper
export async function getUsdToInrRate(): Promise<number> {
  const r = await getExchangeRates();
  return r.usdToInr;
}

/**
 * Parse an Amazon price string (e.g. "$1,299.99" or "€1.299,99") and convert to a generic number.
 * Returns null if unparseable.
 */
export function parseUsdString(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Handle European comma format "€1.299,99" -> "1299.99"
  let cleaned = raw.replace(/[^\d.,]/g, "");
  if (raw.includes("€") || (cleaned.includes(",") && cleaned.includes(".") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf("."))) {
     cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
     cleaned = cleaned.replace(/,/g, "");
  }
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
