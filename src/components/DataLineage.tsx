"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DataLineage() {
  const [isOpen, setIsOpen] = useState(false);

  const nodes = [
    { title: "RapidAPI Ingestion", desc: "US/DE/IN Parallel endpoints" },
    { title: "Decision Engine", desc: "Pricing + Sentiment Overlay" },
    { title: "Supabase Write-Through", desc: "Cache & Cron Persistence" },
    { title: "Museum Light UI", desc: "React + Framer + Tailwind" }
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="card-bold"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          padding: "8px 16px",
          background: "#111827",
          color: "#fff",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          zIndex: 50,
          cursor: "pointer"
        }}
      >
        &lt;/&gt; Data Flow
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(251, 251, 253, 0.9)",
              backdropFilter: "blur(4px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-bold"
              style={{ padding: 40, background: "#fff", minWidth: 400, maxWidth: "90vw" }}
            >
              <h2 style={{ margin: "0 0 32px", fontSize: "1.25rem", borderBottom: "1px solid #E5E7EB", paddingBottom: 16 }}>
                Real-Time Data Lineage
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {nodes.map((node, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#111827", marginTop: 6 }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700 }}>{node.title}</h4>
                      <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#6B7280" }}>{node.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  marginTop: 32,
                  width: "100%",
                  padding: "10px",
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 6,
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close Developer View
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
