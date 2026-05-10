export type Signal = "buy" | "monitor" | "avoid" | "avoid-quality";

export interface EngineResult {
  tomorrowPrice: number;
  delta: number;       // fractional change, e.g. 0.032 = +3.2%
  signal: Signal;
}

/**
 * Weighted predictive forecasting engine.
 *
 * Δ = 0.60 × priceChange24hFraction + 0.40 × stockVelocityFactor
 * Tomorrow = Today × (1 + Δ)
 *
 * Sentiment Override:
 * If Price is decreasing but 1-star reviews have increased by >10%
 * in the last 30 days, override "buy" to "avoid-quality".
 */
export function runDecisionEngine(
  todayPrice: number,
  yesterdayPrice: number | null,
  stockPct: number,         // 0-100; use 50 as neutral if unknown
  currentOneStarPct: number = 0,
  historicOneStarPct: number | null = null
): EngineResult {
  // ── Price trend (60 % weight) ──────────────────────────────────────────────
  let priceChange24h = 0;
  if (yesterdayPrice && yesterdayPrice > 0) {
    priceChange24h = (todayPrice - yesterdayPrice) / yesterdayPrice;
  }

  // ── Stock velocity (40 % weight) ──────────────────────────────────────────
  let stockVelocity = 0;
  if (stockPct <= 5) {
    stockVelocity = 0.04;   // critical scarcity → strong price push
  } else if (stockPct <= 20) {
    stockVelocity = 0.02;   // low stock → mild push
  } else if (stockPct >= 80) {
    stockVelocity = -0.01;  // abundant stock → slight downward pressure
  }

  const delta = 0.6 * priceChange24h + 0.4 * stockVelocity;
  const tomorrowPrice = todayPrice * (1 + delta);

  // ── Base Signal ───────────────────────────────────────────────────────────
  let signal: Signal = "monitor";

  if (yesterdayPrice !== null) {
    const priceUp = todayPrice > yesterdayPrice;
    const stockLow = stockPct < 5;
    const stockOk = stockPct > 20;
    const priceDrop = todayPrice < yesterdayPrice;

    if (priceDrop && stockOk) {
      signal = "buy";
    } else if (priceUp || stockLow) {
      signal = "avoid";
    }
  }

  // ── Sentiment Override ────────────────────────────────────────────────────
  if (historicOneStarPct !== null && signal === "buy") {
    if (currentOneStarPct - historicOneStarPct >= 10) {
      signal = "avoid-quality";
    }
  }

  return { tomorrowPrice, delta, signal };
}
