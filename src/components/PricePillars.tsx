"use client";

import TrafficLight from "./TrafficLight";
import type { Signal } from "@/lib/decisionEngine";

function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface PricePillarsProps {
  todayPrice: number | null;
  yesterdayPrice: number | null;
  tomorrowPrice: number | null;
  delta: number | null;
  signal: Signal | null;
}

interface PillarProps {
  label: string;
  price: number | null;
  variant: "muted" | "bold" | "dashed";
  badge?: React.ReactNode;
  deltaLabel?: string | null;
  note?: string;
}

function Pillar({ label, price, variant, badge, deltaLabel, note }: PillarProps) {
  const borderStyle =
    variant === "bold"
      ? "2px solid #111827"
      : variant === "dashed"
      ? "1.5px dashed #111827"
      : "1px solid #E5E7EB";

  const priceColor =
    variant === "muted" ? "#6B7280" : "#111827";

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        border: borderStyle,
        borderRadius: 8,
        padding: "28px 20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "Inter, sans-serif",
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#9CA3AF",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: "1.75rem",
          fontWeight: 700,
          color: priceColor,
          lineHeight: 1.1,
          wordBreak: "break-all",
        }}
      >
        {formatInr(price)}
      </p>

      {deltaLabel && (
        <p
          style={{
            margin: 0,
            fontFamily: "Inter, sans-serif",
            fontSize: "0.8125rem",
            color: "#6B7280",
          }}
        >
          {deltaLabel}
        </p>
      )}

      {badge && <div style={{ marginTop: 4 }}>{badge}</div>}

      {note && (
        <p
          style={{
            margin: 0,
            fontFamily: "Inter, sans-serif",
            fontSize: "0.75rem",
            color: "#9CA3AF",
            fontStyle: "italic",
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

export default function PricePillars({
  todayPrice,
  yesterdayPrice,
  tomorrowPrice,
  delta,
  signal,
}: PricePillarsProps) {
  const deltaPercent =
    delta != null ? `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}% predicted change` : null;

  const vsYesterday =
    todayPrice != null && yesterdayPrice != null
      ? todayPrice < yesterdayPrice
        ? `↓ ${formatInr(yesterdayPrice - todayPrice)} cheaper`
        : `↑ ${formatInr(todayPrice - yesterdayPrice)} pricier`
      : null;

  return (
    <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
      <Pillar
        label="Yesterday"
        price={yesterdayPrice}
        variant="muted"
        note={yesterdayPrice == null ? "No history yet" : undefined}
      />
      <Pillar
        label="Today"
        price={todayPrice}
        variant="bold"
        badge={signal ? <TrafficLight signal={signal} /> : null}
        deltaLabel={vsYesterday}
      />
      <Pillar
        label="Tomorrow (Predicted)"
        price={tomorrowPrice}
        variant="dashed"
        deltaLabel={deltaPercent}
        note="Weighted forecast"
      />
    </div>
  );
}
