/**
 * Currency conversion utility.
 * Fetches live USD→INR rate from exchangerate-api (free tier, no key needed).
 * Falls back to env var USD_TO_INR (default 83.5) if the request fails.
 */

let cachedRate: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdToInrRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && now - cacheTimestamp < CACHE_TTL_MS) return cachedRate;

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 3600 }, signal: controller.signal }
    );
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      if (data?.rates?.INR) {
        cachedRate = data.rates.INR as number;
        cacheTimestamp = now;
        return cachedRate;
      }
    }
  } catch {
    // Silent fallback
  }

  const fallback = parseFloat(process.env.USD_TO_INR ?? "83.5");
  return isNaN(fallback) ? 83.5 : fallback;
}

/**
 * Parse an Amazon price string (e.g. "$1,299.99") and convert to INR.
 * Returns null if unparseable.
 */
export function parseUsdString(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
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
