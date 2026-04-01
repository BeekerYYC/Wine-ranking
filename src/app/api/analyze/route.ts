import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { imageData } = await req.json();

  if (!imageData) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = imageData.startsWith("data:image/png")
    ? "image/png"
    : "image/jpeg";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `Analyze this wine bottle label image. Extract and return a JSON object with these fields:
- name: the wine name
- winery: the producer/winery name
- vintage: the year (number or null)
- varietal: grape variety (e.g. "Cabernet Sauvignon", "Chardonnay")
- region: wine region (e.g. "Napa Valley", "Bordeaux")
- country: country of origin
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange"
- description: 2-3 sentences about this wine - what makes it notable, typical flavor profile. Use your knowledge to provide helpful context.
- foodPairings: 3-4 specific food pairing suggestions as a comma-separated string (e.g. "Grilled lamb chops, Aged cheddar, Dark chocolate, Mushroom risotto")
- onlineRating: your best estimate of this wine's typical community/critic rating on a 100-point scale based on your knowledge (number or null if unknown). Consider vintage, producer reputation, and region.

Return ONLY valid JSON, no markdown code blocks or other text.`,
          },
        ],
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response", raw: text },
      { status: 500 }
    );
  }
}
