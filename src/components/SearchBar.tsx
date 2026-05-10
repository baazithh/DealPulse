"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  asin: string;
  title: string;
  image: string;
  priceInr: number | null;
  url: string;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.products ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 420);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectProduct(asin: string) {
    setOpen(false);
    router.push(`/dashboard?asin=${asin}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && results.length > 0) selectProduct(results[0].asin);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 680 }}>
      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid #111827",
          borderRadius: 8,
          background: "#FBFBFD",
          padding: "0 16px",
          gap: 10,
        }}
      >
        {/* Search icon */}
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, color: "#6B7280" }}>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M15 15l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          id="product-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search any Amazon product…"
          autoFocus={autoFocus}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "Inter, sans-serif",
            fontSize: "1rem",
            color: "#111827",
            padding: "15px 0",
          }}
        />
        {loading && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite", color: "#9CA3AF" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#FBFBFD",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            zIndex: 50,
            maxHeight: 400,
            overflowY: "auto",
          }}
          className="scrollbar-none"
        >
          {results.map((r) => (
            <button
              key={r.asin}
              onClick={() => selectProduct(r.asin)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 16px",
                textAlign: "left",
                background: "none",
                border: "none",
                borderBottom: "1px solid #F3F4F6",
                cursor: "pointer",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt={r.title}
                  style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0, borderRadius: 4 }}
                />
              )}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 500, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.title}
                </p>
                {r.priceInr != null && (
                  <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.8125rem", color: "#16A34A", fontWeight: 600 }}>
                    {formatInr(r.priceInr)}
                  </p>
                )}
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#9CA3AF" }}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
