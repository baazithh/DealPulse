"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function AITLDR({ title, rawDesc }: { title: string; rawDesc: any }) {
  const [data, setData] = useState<{win: string, risk: string, bottomLine: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTldr() {
      try {
        const res = await fetch("/api/tldr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, details: rawDesc })
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTldr();
  }, [title, rawDesc]);

  if (loading) {
    return (
      <div className="card mt-6" style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "0.875rem", fontFamily: "Inter", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="skeleton" style={{ width: 16, height: 16, borderRadius: "50%" }}></span>
          Generating TL;DR...
        </h3>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card mt-6" style={{ padding: 24 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: "0.875rem", fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
        The TL;DR
      </h3>
      <ul style={{ margin: 0, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 12, color: "#111827", fontFamily: "Inter, sans-serif", fontSize: "0.875rem" }}>
        <li><strong style={{ color: "#16A34A" }}>The Win:</strong> {data.win}</li>
        <li><strong style={{ color: "#DC2626" }}>The Risk:</strong> {data.risk}</li>
        <li><strong style={{ color: "#111827" }}>Bottom Line:</strong> {data.bottomLine}</li>
      </ul>
    </div>
  );
}
