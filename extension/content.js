// This extracts ASIN via regex and injects a subtle floating button
(function() {
  const match = window.location.href.match(/([A-Z0-9]{10})(?:[/?]|$)/);
  if (!match) return;
  const asin = match[1];

  const btn = document.createElement("a");
  btn.innerText = "⚡ Pulse Check";
  btn.href = `http://localhost:3000/dashboard?asin=${asin}`;
  btn.target = "_blank";
  
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999",
    background: "#111827",
    color: "#FBFBFD",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.875rem",
    fontWeight: "700",
    padding: "12px 20px",
    borderRadius: "6px",
    textDecoration: "none",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  });

  document.body.appendChild(btn);
})();
