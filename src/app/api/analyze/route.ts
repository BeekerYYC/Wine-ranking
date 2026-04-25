import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const PROMPTS: Record<string, string> = {
  wine: `You are a master sommelier and wine expert. Identify this wine from the label and provide COMPREHENSIVE details using your full knowledge of wine, including critic reviews and online rankings.

Return a JSON object with these fields. Be thorough — pull every detail you know about this specific wine and vintage:

- name: the wine name
- winery: the producer/winery name
- vintage: the year (number or null)
- varietal: grape variety (e.g. "Cabernet Sauvignon", "Chardonnay")
- region: wine region (e.g. "Napa Valley", "Bordeaux")
- country: country of origin
- color: one of "red", "white", "rosé", "sparkling", "dessert", "orange"
- description: 4-6 sentences about this wine — the winery's history and reputation, what makes this specific wine/vintage notable, terroir, and winemaking techniques
- tastingNotes: detailed professional tasting note — describe appearance, aroma (primary, secondary, tertiary), palate (body, tannins, acidity, flavors), and finish. Be specific and evocative (e.g. "blackcurrant, cedar, and tobacco on the nose; full-bodied with firm tannins and notes of cassis and graphite on the palate")
- drinkingWindow: recommended drinking window (e.g. "2024-2030" or "Drink now through 2026"). Use null if truly unknown
- criticReviews: known critic scores and brief excerpts from MULTIPLE sources. Format as "Robert Parker: 93 — Rich and layered; Wine Spectator: 91 — Elegant with firm tannins; James Suckling: 94; Vivino: 4.2/5 (1,200 ratings); Wine Enthusiast: 92". Include as many notable scores as you know — Parker, Wine Spectator, Suckling, Decanter, Vivino, Wine Enthusiast, Jancis Robinson, etc. Only use null if this is a truly obscure wine
- foodPairings: 6-8 specific food pairing suggestions as a comma-separated string (be specific: "grilled lamb chops with rosemary" not just "lamb")
- onlineRating: estimated community/critic consensus rating on a 100-point scale (weighted average of known scores)
- confidence: how confident you are in this identification, 0.0 to 1.0`,

  coffee: `Analyze this coffee bag/label image. Identify the coffee and use your knowledge to provide comprehensive details.

Extract and return a JSON object with these fields:
- name: the coffee name
- winery: the roaster name
- vintage: roast date if visible (as year number or null)
- varietal: origin country/region (e.g. "Ethiopia", "Colombia Huila")
- region: specific growing region if visible
- country: country of origin
- color: one of "light", "medium", "medium-dark", "dark", "espresso", "decaf"
- description: 3-5 sentences about this coffee — the roaster, processing method, what makes it notable
- tastingNotes: detailed tasting profile — describe aroma, flavor notes, body, acidity, and aftertaste. Be specific (e.g. "bright citrus acidity with blueberry and jasmine, silky body" not just "fruity")
- drinkingWindow: best consumed by date or freshness window (e.g. "Within 4 weeks of roast"). Use null if unknown
- criticReviews: any notable reviews or awards. Use null if unknown
- foodPairings: 5-6 things that pair well as a comma-separated string
- onlineRating: estimated quality rating on a 100-point scale (number or null)
- confidence: how confident you are in this identification, 0.0 to 1.0`,

  beer: `Analyze this beer can/bottle/label image. Identify the beer and use your knowledge to provide comprehensive details.

Extract and return a JSON object with these fields:
- name: the beer name
- winery: the brewery name
- vintage: brew date if visible (as year number or null)
- varietal: beer style (e.g. "IPA", "Stout", "Lager")
- region: brewery location/region
- country: country of origin
- color: one of "ipa", "lager", "stout", "pilsner", "wheat", "sour", "porter", "pale-ale"
- description: 3-5 sentences about this beer — the brewery's background, what makes this beer notable, brewing style
- tastingNotes: detailed tasting profile — describe aroma, flavor, mouthfeel, bitterness (IBU if known), and finish. Be specific
- drinkingWindow: freshness guidance (e.g. "Best fresh, within 3 months"). Use null if unknown
- criticReviews: any notable reviews, Untappd score, or awards. Use null if unknown
- foodPairings: 5-6 food pairing suggestions as a comma-separated string
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
    max_tokens: 3072,
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
