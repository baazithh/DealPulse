"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import SearchBar from "@/components/SearchBar";
import PricePillars from "@/components/PricePillars";
import RelatedInsights from "@/components/RelatedInsights";
import ArbitrageTable from "@/components/ArbitrageTable";
import WatchlistInput from "@/components/WatchlistInput";
import DataLineage from "@/components/DataLineage";
import type { Signal } from "@/lib/decisionEngine";

interface ProductData {
  asin: string;
  title: string;
  image: string;
  price_inr: number | null;
  yesterday_price_inr: number | null;
  tomorrow_price_inr: number | null;
  delta: number | null;
  signal: Signal | null;
  stock_pct: number;
  product_url: string;
  raw_availability: string;
  one_star_pct?: Pick<number, "valueOf"> | number;
  global_deals?: { country: string; price_inr: number }[];
  usd_rate: number;
  eur_rate?: Pick<number, "valueOf"> | number;
  fetched_at?: string;
  inr_rate?: number; // legacy
  fromCache: boolean;
}

interface RelatedProd {
  asin: string;
  title: string;
  image: string;
  priceInr: number | null;
}

// Skeleton loader for the product view
function ProductSkeleton() {
  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      <div className="skeleton" style={{ width: 320, height: 320, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="skeleton" style={{ height: 28, width: "75%", borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 20, width: "50%", borderRadius: 4 }} />
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ flex: 1, height: 140, borderRadius: 8 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 52, borderRadius: 6, marginTop: 8 }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          border: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "#9CA3AF" }}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <h2
        style={{
          margin: "0 0 10px",
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: "1.625rem",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        Search any product
      </h2>
      <p
        style={{
          margin: 0,
          fontFamily: "Inter, sans-serif",
          fontSize: "0.9375rem",
          color: "#6B7280",
          maxWidth: 340,
          lineHeight: 1.55,
        }}
      >
        Type a product name above — we'll fetch live Amazon data and predict tomorrow's price for you.
      </p>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const asin = searchParams.get("asin");

  const [product, setProduct] = useState<ProductData | null>(null);
  const [related, setRelated] = useState<RelatedProd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);

    try {
      const res = await fetch(`/api/product/${id}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: ProductData = await res.json();
      setProduct(data);

      // Fetch related products using title keywords
      if (data.title) {
        const words = data.title.split(" ").slice(0, 4).join(" ");
        const relRes = await fetch(`/api/search?q=${encodeURIComponent(words)}`);
        if (relRes.ok) {
          const relData = await relRes.json();
          setRelated(
            (relData.products ?? []).filter((p: RelatedProd) => p.asin !== id).slice(0, 10)
          );
        }
      }
    } catch (e) {
      setError((e as Error).message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (asin) fetchProduct(asin);
  }, [asin, fetchProduct]);

  function handleRelatedSelect(newAsin: string) {
    router.push(`/dashboard?asin=${newAsin}`);
  }

  const hasImageDomain =
    product?.image?.includes("amazon.com") ||
    product?.image?.includes("cloudfront.net") ||
    product?.image?.includes("media-amazon");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ minHeight: "100vh", background: "#FBFBFD", paddingBottom: 80 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid #E5E7EB",
          padding: "0 clamp(20px, 5vw, 80px)",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "sticky",
          top: 0,
          background: "#FBFBFD",
          zIndex: 40,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: "1.25rem",
            fontWeight: 900,
            color: "#111827",
            letterSpacing: "-0.02em",
            padding: 0,
            flexShrink: 0,
          }}
        >
          DealPulse
        </button>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <SearchBar />
        </div>
        <div style={{ flexShrink: 0, width: 100 }} />
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "48px clamp(20px, 5vw, 60px) 0",
        }}
      >
        {loading && <ProductSkeleton />}

        {error && (
          <div
            style={{
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              borderRadius: 8,
              padding: "20px 24px",
              color: "#DC2626",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
            }}
          >
            {error}. Please try a different search.
          </div>
        )}

        {!loading && !error && !product && <EmptyState />}

        {product && !loading && (
          <motion.div
            key={product.asin}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: 40 }}
          >
            {/* ── Bento: Image + Price Pillars ────────────────────────────── */}
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* Product image */}
              <div
                style={{
                  width: 320,
                  flexShrink: 0,
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                  aspectRatio: "1/1",
                }}
              >
                {product.image &&
                  (hasImageDomain ? (
                    <Image
                      src={product.image}
                      alt={product.title ?? "Product image"}
                      width={280}
                      height={280}
                      style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.title ?? "Product image"}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ))}
              </div>

              {/* Right column */}
              <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Product title */}
                <div>
                  <h1
                    style={{
                      margin: "0 0 8px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "#111827",
                      lineHeight: 1.45,
                    }}
                  >
                    {product.title}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      ASIN: {product.asin}
                    </span>
                    {product.fromCache && (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#9CA3AF", border: "1px solid #E5E7EB", borderRadius: 10, padding: "2px 8px" }}>
                        Cached
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: "#F3F4F6",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${product.stock_pct}%`,
                        background:
                          product.stock_pct < 5
                            ? "#DC2626"
                            : product.stock_pct < 20
                            ? "#D97706"
                            : "#16A34A",
                        borderRadius: 2,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: "0.75rem",
                      color: "#6B7280",
                      flexShrink: 0,
                    }}
                  >
                    Stock ~{product.stock_pct}%
                  </span>
                </div>

                {/* Price Pillars */}
                <PricePillars
                  todayPrice={product.price_inr}
                  yesterdayPrice={product.yesterday_price_inr}
                  tomorrowPrice={product.tomorrow_price_inr}
                  delta={product.delta}
                  signal={product.signal}
                />

                {/* VIEW ON AMAZON */}
                {product.product_url && (
                  <a
                    id="view-on-amazon-btn"
                    href={product.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-amazon"
                    style={{ width: "100%" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14 5h5v5M19 5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 7h6M5 12h8M5 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    View on Amazon
                  </a>
                )}

                {/* Smart Alert / Watchlist */}
                <div style={{ marginTop: 8 }}>
                  <WatchlistInput asin={product.asin} currentPrice={product.price_inr} />
                </div>

                {/* Exchange rate footnote */}
                <p
                  style={{
                    margin: 0,
                    fontFamily: "Inter, sans-serif",
                    fontSize: "0.7rem",
                    color: "#9CA3AF",
                  }}
                >
                  Rates: 1 USD = ₹{(product.usd_rate ?? product.inr_rate)?.toFixed(2)} | 1 EUR = ₹{(product.eur_rate as number ?? 90).toFixed(2)}
                </p>

                {/* Global Arbitrage */}
                {product.global_deals && product.global_deals.length > 0 && (
                   <ArbitrageTable localPrice={product.price_inr} globalDeals={product.global_deals} />
                )}
              </div>
            </div>

            {/* ── Related Insights ──────────────────────────────────────────── */}
            {related.length > 0 && (
              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 32 }}>
                <RelatedInsights products={related} onSelect={handleRelatedSelect} />
              </div>
            )}
          </motion.div>
        )}

        {/* Floating Dev Mode Lineage Toggle */}
        <DataLineage />
      </main>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#FBFBFD" }} />}>
      <DashboardContent />
    </Suspense>
  );
}
