"use client";

interface RelatedProduct {
  asin: string;
  title: string;
  image: string;
  priceInr: number | null;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RelatedInsights({
  products,
  onSelect,
}: {
  products: RelatedProduct[];
  onSelect: (asin: string) => void;
}) {
  if (!products.length) return null;

  return (
    <div>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#9CA3AF",
          margin: "0 0 14px",
        }}
      >
        Related Insights
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
        }}
        className="scrollbar-none"
      >
        {products.map((p) => (
          <button
            key={p.asin}
            onClick={() => onSelect(p.asin)}
            style={{
              flexShrink: 0,
              width: 160,
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              padding: "14px 12px",
              background: "#FBFBFD",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "border-color 0.18s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "#111827")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          >
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt={p.title}
                style={{
                  width: "100%",
                  height: 100,
                  objectFit: "contain",
                  borderRadius: 4,
                }}
              />
            )}
            <p
              style={{
                margin: 0,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "#111827",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.4,
              }}
            >
              {p.title}
            </p>
            {p.priceInr != null && (
              <p
                style={{
                  margin: 0,
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#16A34A",
                }}
              >
                {formatInr(p.priceInr)}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
