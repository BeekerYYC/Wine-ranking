import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const PROMPTS: Record<string, string> = {
  wine: `Analyze this wine bottle label image. Extract and return a JSON object with these fields:
- name: the wine name
- winery: the producer/winery name
- vintage: the year (number or null)
- varietal: grape variety (e.g. "Cabernet Sauvignon", "Chardonnay")
- region: wine region (e.g. "Napa Valley", "Bordeaux")
- country: country of origin
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange"
- description: 2-3 sentences about this wine
- foodPairings: 3-4 specific food pairing suggestions as a comma-separated string
- onlineRating: estimated community/critic rating on a 100-point scale (number or null)
- confidence: how confident you are in this identification, 0.0 to 1.0`,

  coffee: `Analyze this coffee bag/label image. Extract and return a JSON object with these fields:
- name: the coffee name
- winery: the roaster name
- vintage: roast date if visible (as year number or null)
- varietal: origin country/region (e.g. "Ethiopia", "Colombia Huila")
- region: specific growing region if visible
- country: country of origin
- color: one of "light", "medium", "medium-dark", "dark", "espresso", "decaf"
- description: 2-3 sentences about this coffee
- foodPairings: 3-4 things that pair well as a comma-separated string
- onlineRating: estimated quality rating on a 100-point scale (number or null)
- confidence: how confident you are in this identification, 0.0 to 1.0`,

  beer: `Analyze this beer can/bottle/label image. Extract and return a JSON object with these fields:
- name: the beer name
- winery: the brewery name
- vintage: brew date if visible (as year number or null)
- varietal: beer style (e.g. "IPA", "Stout", "Lager")
- region: brewery location/region
- country: country of origin
- color: one of "ipa", "lager", "stout", "pilsner", "wheat", "sour", "porter", "pale-ale"
- description: 2-3 sentences about this beer
- foodPairings: 3-4 food pairing suggestions as a comma-separated string
- onlineRating: estimated rating on a 100-point scale (number or null)
- confidence: how confident you are in this identification, 0.0 to 1.0`,
};

export async function POST(req: NextRequest) {
  const { imageData, category = "wine" } = await req.json();

  if (!imageData) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
  const mediaType = imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  const prompt = PROMPTS[category] || PROMPTS.wine;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `${prompt}\n\nReturn ONLY valid JSON, no markdown code blocks or other text.` },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}
