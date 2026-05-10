"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { runDecisionEngine } from "@/lib/decisionEngine";

export default function PriceArcheology({ 
  todayPrice, 
  yesterdayPrice, 
  stockPct, 
  onHover 
}: { 
  todayPrice: number | null; 
  yesterdayPrice: number | null; 
  stockPct: number; 
  onHover: (data: any) => void;
}) {
  
  // Generate 30 days of mock/interpolated data based on today & yesterday
  const data = useMemo(() => {
    if (todayPrice === null || yesterdayPrice === null) return [];
    
    const arr = [];
    let current = yesterdayPrice;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      if (i === 0) current = todayPrice;
      else if (i === 1) current = yesterdayPrice;
      else {
        // Add random walk volatility between 0.95 and 1.05 of yesterday
        current = Math.round(current * (Math.random() * (1.05 - 0.96) + 0.96));
      }

      // Pre-calculate what the decision engine WOULD have signaled that day
      // Assuming a stable stock pct for past days
      const signalData = runDecisionEngine(current, current * 0.98, stockPct);

      arr.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: current,
        signal: signalData.signal,
        delta: signalData.delta,
        tomorrowPrice: signalData.tomorrowPrice
      });
    }
    return arr;
  }, [todayPrice, yesterdayPrice, stockPct]);

  if (data.length === 0) return null;

  return (
    <div className="card mt-6" style={{ padding: "24px 24px 8px 24px" }} onMouseLeave={() => onHover(null)}>
      <h3 style={{ margin: "0 0 4px", fontSize: "0.875rem", fontFamily: "Inter, sans-serif", fontWeight: 700, color: "#111827" }}>
        Price Archeology
      </h3>
      <p style={{ margin: "0 0 24px", fontSize: "0.75rem", color: "#6B7280" }}>
        Scrub to see retro-active DealPulse signals.
      </p>

      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data}
            onMouseMove={(state) => {
              if (state.isTooltipActive && state.activePayload?.length) {
                onHover(state.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={{ stroke: "#E5E7EB" }} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#9CA3AF" }} 
              dy={10} 
            />
            <YAxis 
              hide 
              domain={['dataMin - 100', 'dataMax + 100']} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: 6, border: "1px solid #111827", boxShadow: "none", fontSize: "12px", fontFamily: "Inter" }}
              cursor={{ stroke: "#111827", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#111827" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              activeDot={{ r: 4, fill: "#111827", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
