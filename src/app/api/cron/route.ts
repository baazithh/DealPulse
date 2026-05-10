import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { parseUsdString, getExchangeRates } from "@/lib/currency";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? "real-time-amazon-data.p.rapidapi.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function isDummySupabase() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");
}

function museumLightEmailHtml(asin: string, title: string, price: number) {
  return `
    <div style="font-family: 'Inter', system-ui, sans-serif; background-color: #FBFBFD; padding: 40px 20px; color: #111827;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 40px; text-align: center;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0 0 10px;">Price Drop Alert</h1>
        <p style="font-size: 16px; color: #6B7280; margin: 0 0 30px;">Your tracked item just hit your target price!</p>
        
        <div style="border: 1px dashed #E5E7EB; border-radius: 6px; padding: 20px; margin-bottom: 30px; text-align: left;">
          <h2 style="font-size: 14px; font-weight: 600; margin: 0 0 10px; color: #111827;">${title}</h2>
          <p style="font-size: 28px; font-weight: 700; color: #16A34A; margin: 0;">₹${price.toLocaleString("en-IN")}</p>
        </div>

        <a href="https://dealpulse.vercel.app/dashboard?asin=${asin}" style="display: inline-block; background: #111827; color: #FBFBFD; padding: 14px 28px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
          View on DealPulse
        </a>
      </div>
      <p style="text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 30px; letter-spacing: 0.05em; text-transform: uppercase;">Sent by the DealPulse Arbitrage Engine</p>
    </div>
  `;
}

export async function GET(req: NextRequest) {
  // CRON endpoint protection: You can secure this using a CRON_SECRET if on Vercel
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isDummySupabase()) {
    console.log("[CRON] Supabase dummy detected. Simulating run success.");
    return NextResponse.json({ success: true, mocked: true });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. Fetch active watchlists limit 10 (batch limit to save Free Tier API credits)
    const { data: watchlists, error: watchErr } = await sb
      .from("watchlists")
      .select("*")
      .eq("status", "active")
      .limit(10);

    if (watchErr) throw watchErr;
    if (!watchlists || watchlists.length === 0) {
       return NextResponse.json({ success: true, message: "No active watchlists found" });
    }

    const rates = await getExchangeRates();

    let sentCount = 0;

    // 2. Loop through and check prices sequentially to respect RapidAPI burst limits
    for (const item of watchlists) {
      try {
        const detailRes = await fetch(`https://${RAPIDAPI_HOST}/product-details?asin=${item.asin}&country=IN`, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST,
          },
        });
        
        if (!detailRes.ok) continue;

        const detailData = await detailRes.json();
        const p = detailData?.data ?? detailData;
        
        const rawPrice = parseUsdString(p.product_price ?? p.price?.value);
        if (rawPrice === null) continue;

        const isAlreadyInr = p.currency === "INR" || (p.product_price as string)?.includes("₹");
        const currentPriceInr = isAlreadyInr ? rawPrice : Math.round(rawPrice * rates.usdToInr);

        // 3. Eval Target Price
        if (currentPriceInr <= item.target_price_inr) {
          // Send Museum Light Email
          const title = p.product_title ?? p.title ?? "Amazon Product";
          
          if (resend) {
             await resend.emails.send({
                from: "DealPulse Automation <alerts@dealpulse.dev>",
                to: item.email,
                subject: `Price Drop Alert: ${title.substring(0, 40)}...`,
                html: museumLightEmailHtml(item.asin, title, currentPriceInr),
             });
          } else {
             console.log(`[MOCK EMAIL to ${item.email}]: ${title} hit ₹${currentPriceInr}`);
          }

          // Mark as notified so we don't spam
          await sb.from("watchlists").update({ status: "notified" }).eq("id", item.id);
          sentCount++;
        }
        
        // Wait 500ms to avoid RapidAPI rate limits
        await new Promise((resume) => setTimeout(resume, 500));
        
      } catch (innerErr) {
        console.error(`Cron processing error for ASIN ${item.asin}:`, innerErr);
      }
    }

    return NextResponse.json({ success: true, processed: watchlists.length, alerts_sent: sentCount });
  } catch (err) {
    console.error("Cron GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
