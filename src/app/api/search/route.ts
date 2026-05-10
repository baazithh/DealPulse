import { NextRequest, NextResponse } from "next/server";
import { getUsdToInrRate, parseUsdString } from "@/lib/currency";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? "real-time-amazon-data.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const inrRate = await getUsdToInrRate();

    const apiRes = await fetch(
      `https://${RAPIDAPI_HOST}/search?query=${encodeURIComponent(q)}&page=1&country=IN&sort_by=RELEVANCE&product_condition=ALL`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
        next: { revalidate: 300 }, // 5-min edge cache for search results
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("RapidAPI search error:", errText);
      return NextResponse.json({ error: "Upstream search failed" }, { status: 502 });
    }

    const data = await apiRes.json();
    const products = (data?.data?.products ?? []).slice(0, 12).map(
      (p: Record<string, unknown>) => {
        const rawPrice = parseUsdString(p.product_price as string);
        
        // If the API already returns INR (country=IN), don't convert again
        const isAlreadyInr = p.currency === "INR" || (p.product_price as string)?.includes("₹");
        const inrPrice = rawPrice != null ? (isAlreadyInr ? rawPrice : Math.round(rawPrice * inrRate)) : null;

        return {
          asin: p.asin,
          title: p.product_title,
          image: p.product_photo ?? p.thumbnail,
          priceInr: inrPrice,
          rating: p.product_star_rating,
          url: p.product_url,
        };
      }
    );

    return NextResponse.json({ products, inrRate });
  } catch (err) {
    console.error("Search route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
