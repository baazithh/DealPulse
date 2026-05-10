import { NextRequest, NextResponse } from "next/server";

function isDummySupabase() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");
}

export async function POST(req: NextRequest) {
  if (isDummySupabase()) {
    // If Supabase is just a dummy, simulate a successful creation
    console.log("Mock Watchlist Creation:", await req.json());
    return NextResponse.json({ success: true, mocked: true });
  }

  try {
    const body = await req.json();
    const { asin, targetPriceInr, email } = body;

    if (!asin || !targetPriceInr || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await sb.from("watchlists").insert({
      asin,
      target_price_inr: targetPriceInr,
      email,
      status: "active"
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Watchlist POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
