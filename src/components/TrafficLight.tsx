"use client";

import type { Signal } from "@/lib/decisionEngine";

const LABELS: Record<Signal, string> = {
  buy: "BUY",
  monitor: "MONITOR",
  avoid: "AVOID",
};

const DOT_COLORS: Record<Signal, string> = {
  buy: "#16A34A",
  monitor: "#D97706",
  avoid: "#DC2626",
};

export default function TrafficLight({ signal }: { signal: Signal }) {
  return (
    <span
      className={`badge-${signal}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        fontFamily: "Inter, sans-serif",
        fontSize: "0.6875rem",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: DOT_COLORS[signal],
          flexShrink: 0,
        }}
      />
      {LABELS[signal]}
    </span>
  );
}
