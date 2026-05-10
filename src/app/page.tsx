"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function handleEnter() {
    setLeaving(true);
    setTimeout(() => router.push("/dashboard"), 600);
  }

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.main
          key="landing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen flex flex-col items-center justify-center px-6"
          style={{ background: "#FBFBFD" }}
        >
          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-2 flex items-center gap-3"
          >
            {/* Logo mark */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#111827",
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l5-5 4 4 9-10" stroke="#FBFBFD" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" fill="#FBFBFD"/>
              </svg>
            </span>
          </motion.div>

          {/* Hero title */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: "clamp(4rem, 14vw, 10rem)",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#111827",
              textAlign: "center",
              margin: "0 0 16px",
            }}
          >
            DealPulse
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.6 }}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "1.0625rem",
              fontWeight: 400,
              color: "#6B7280",
              letterSpacing: "0.01em",
              textAlign: "center",
              maxWidth: 380,
              marginBottom: 52,
              lineHeight: 1.55,
            }}
          >
            Real-time Amazon telemetry meets predictive pricing.
            <br />
            Know whether to <strong style={{ color: "#111827" }}>buy, monitor, or avoid</strong> — today.
          </motion.p>

          {/* CTA */}
          <motion.button
            id="enter-engine-btn"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.48, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleEnter}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#111827",
              color: "#FBFBFD",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.875rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "16px 36px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Enter Engine
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>

          {/* Bottom caption */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.75rem",
              color: "#9CA3AF",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Prices shown in Indian Rupees (₹)
          </motion.p>
        </motion.main>
      )}
    </AnimatePresence>
  );
}
