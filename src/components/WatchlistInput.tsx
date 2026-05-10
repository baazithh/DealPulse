"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function WatchlistInput({ asin, currentPrice }: { asin: string; currentPrice: number | null }) {
  const [targetPrice, setTargetPrice] = useState(currentPrice !== null ? Math.round(currentPrice * 0.9).toString() : "");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetPrice || !email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin, targetPriceInr: parseFloat(targetPrice), email }),
      });
      if (!res.ok) throw new Error("Failed to save watchlist");
      setStatus("success");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, width: "100%", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#6B7280", fontWeight: 600 }}>PRICE DROP ALERT</label>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          placeholder="Target ₹"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          required
          className="card"
          style={{ width: "30%", padding: "10px 14px", outline: "none", fontSize: "0.875rem" }}
        />
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="card"
          style={{ flex: 1, padding: "10px 14px", outline: "none", fontSize: "0.875rem" }}
        />
      </div>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "10px 14px",
              background: "#16A34A",
              color: "#fff",
              borderRadius: 6,
              textAlign: "center",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Alert active!
          </motion.div>
        ) : (
          <motion.button
            key="submit"
            type="submit"
            disabled={status === "loading"}
            whileTap={{ scale: 0.98 }}
            className="card-bold"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: status === "error" ? "#FEF2F2" : "#FBFBFD",
              color: status === "error" ? "#DC2626" : "#111827",
              textAlign: "center",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {status === "loading" ? "Activating..." : status === "error" ? "Error, try again" : "Track Price"}
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}
