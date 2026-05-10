"use client";

import { useMemo } from "react";
import { formatInr } from "@/lib/currency";

interface GlobalDeal {
  country: string;
  price_inr: number;
}

export default function ArbitrageTable({ localPrice, globalDeals }: { localPrice: number | null; globalDeals: GlobalDeal[] }) {
  const allDeals = useMemo(() => {
    const deals = [...globalDeals];
    if (localPrice !== null) {
      deals.push({ country: "IN", price_inr: localPrice });
    }
    return deals.sort((a, b) => a.price_inr - b.price_inr);
  }, [localPrice, globalDeals]);

  if (allDeals.length <= 1) return null; // Nothing to compare

  const bestPrice = allDeals[0].price_inr;

  return (
    <div className="card mt-6">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", background: "#f9fafb", borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>
        <h3 style={{ margin: 0, fontSize: "0.875rem", fontFamily: "Inter, sans-serif", fontWeight: 600, color: "#374151" }}>
          GLOBAL ARBITRAGE
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#6B7280" }}>
          Converted to INR including base estimate
        </p>
      </div>
      <div>
        {allDeals.map((deal, idx) => {
          const isBest = idx === 0;
          return (
            <div
              key={deal.country}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: idx < allDeals.length - 1 ? "1px solid #E5E7EB" : "none",
                background: isBest ? "#F0FDF4" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.25rem" }}>
                  {deal.country === "IN" ? "🇮🇳" : deal.country === "US" ? "🇺🇸" : deal.country === "DE" ? "🇩🇪" : "🌍"}
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: isBest ? "#16A34A" : "#111827" }}>
                  Amazon {deal.country} {isBest && "(Best Data)"}
                </span>
              </div>
              <span style={{ fontWeight: isBest ? 700 : 500, fontSize: "0.875rem", color: isBest ? "#16A34A" : "#111827" }}>
                {formatInr(deal.price_inr)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
