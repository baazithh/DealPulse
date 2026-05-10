import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, details } = await req.json();
    if (!title || !details) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const openAiKey = process.env.OPENAI_API_KEY;

    // Default mock AI functionality if missing keys (just like Supabase)
    if (!openAiKey) {
      await new Promise(r => setTimeout(r, 1200)); // Simulate AI delay
      
      let sentiment = "Neutral";
      let risk = "Stock volatility and dynamic pricing.";
      const sDetails = JSON.stringify(details).toLowerCase();
      if (sDetails.includes("plastic") || sDetails.includes("breaks")) risk = "Durability concerns highlighted in descriptions.";
      if (sDetails.includes("battery")) risk = "Battery degradation may occur over time.";

      return NextResponse.json({
        win: "High conversion specs based on product lineage.",
        risk: risk,
        bottomLine: "A safe aggregate purchase if the DealPulse signal is green."
      });
    }

    // Actual LLM Integration (OpenAI)
    const prompt = `Analyze this Amazon product and act as an expert strict product analyst. Return a JSON object with exactly three string keys: 'win' (the biggest positive), 'risk' (the biggest negative/concern), and 'bottomLine' (the final decision). Keep each under 15 words. \nProduct: ${title}\nDetails: ${JSON.stringify(details).slice(0, 1500)}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!res.ok) throw new Error("LLM failed");
    
    const data = await res.json();
    const content = JSON.parse(data.choices[0].message.content);
    
    return NextResponse.json({
      win: content.win || "Solid product specs.",
      risk: content.risk || "Standard e-commerce risks.",
      bottomLine: content.bottomLine || "Purchase conditionally."
    });
  } catch (err) {
    console.error("TLDR error:", err);
    return NextResponse.json({ error: "LLM error" }, { status: 500 });
  }
}
