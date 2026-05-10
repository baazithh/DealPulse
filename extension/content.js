// This extracts ASIN via regex and injects a subtle floating button
(function() {
  const match = window.location.href.match(/([A-Z0-9]{10})(?:[/?]|$)/);
  if (!match) return;
  const asin = match[1];

  const btn = document.createElement("button");
  btn.innerText = "⚡ Pulse Check";
  
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999",
    background: "#111827",
    color: "#FBFBFD",
    fontFamily: "sans-serif",
    fontSize: "14px",
    fontWeight: "700",
    padding: "12px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    letterSpacing: "0.05em",
    textTransform: "uppercase"
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    position: "fixed",
    bottom: "80px",
    right: "24px",
    width: "320px",
    background: "#FBFBFD",
    border: "1px solid #111827",
    borderRadius: "8px",
    padding: "24px",
    zIndex: "99999",
    fontFamily: "sans-serif",
    display: "none",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
  });

  document.body.appendChild(btn);
  document.body.appendChild(modal);

  btn.addEventListener("click", async () => {
    if (modal.style.display === "flex") {
      modal.style.display = "none";
      return;
    }
    
    modal.style.display = "flex";
    modal.innerHTML = '<div style="color: #6B7280; font-size: 14px; text-align: center;">Analyzing DealPulse Engine...</div>';

    try {
      const res = await fetch(`http://localhost:3000/api/product/${asin}`);
      const data = await res.json();
      
      const sigColor = data.signal === "buy" ? "#16A34A" : data.signal === "avoid" ? "#DC2626" : data.signal === "avoid-quality" ? "#EA580C" : "#D97706";
      const sigText = data.signal ? data.signal.toUpperCase() : "MONITOR";

      modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <strong style="color: #111827;">DealPulse TL;DR</strong>
          <span style="background: ${sigColor}20; color: ${sigColor}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">${sigText}</span>
        </div>
        <div style="font-size: 24px; font-weight: 800; color: #111827; margin-top: 8px;">₹${data.price_inr}</div>
        <div style="color: #6B7280; font-size: 12px; margin-bottom: 12px;">Tomorrow's Forecast: ₹${data.tomorrow_price_inr}</div>
        <a href="http://localhost:3000/dashboard?asin=${asin}" target="_blank" style="background: #111827; color: #fff; text-align: center; padding: 10px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; display: block;">VIEW FULL REPORT</a>
      `;
    } catch {
       modal.innerHTML = '<div style="color: #DC2626; font-size: 14px; text-align: center;">Failed to connect to local DealPulse engine. Ensure http://localhost:3000 is running.</div>';
    }
  });

})();
