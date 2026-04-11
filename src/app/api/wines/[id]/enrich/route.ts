import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic();

const ENRICH_PROMPTS: Record<string, (wine: Record<string, unknown>) => string> = {
  wine: (w) => `You are a master sommelier and wine expert. Research this wine and provide comprehensive details.

Wine: ${w.name}
${w.winery ? `Winery: ${w.winery}` : ""}
${w.vintage ? `Vintage: ${w.vintage}` : ""}
${w.varietal ? `Varietal: ${w.varietal}` : ""}
${w.region ? `Region: ${w.region}` : ""}
${w.country ? `Country: ${w.country}` : ""}

Return a JSON object with these fields (use null for anything you're not confident about):
- description: 4-6 sentences about this wine — the winery's history and reputation, what makes this specific wine/vintage notable, terroir, and winemaking techniques
- tastingNotes: detailed professional tasting note — describe appearance, aroma (primary, secondary, tertiary), palate (body, tannins, acidity, flavors), and finish. Be specific and evocative
- drinkingWindow: recommended drinking window (e.g. "2024-2030" or "Drink now through 2026")
- criticReviews: known critic scores and brief excerpts. Format as "Robert Parker: 93 — Rich and layered; Wine Spectator: 91 — Elegant with firm tannins; Vivino: 4.2/5". Include as many notable reviews as you know. Use null only if this is a truly unknown wine
- foodPairings: 6-8 specific food pairing suggestions as a comma-separated string (be specific: "grilled lamb chops with rosemary" not just "lamb")
- onlineRating: estimated community/critic consensus rating on a 100-point scale (weighted average of known scores)`,

  coffee: (w) => `You are an expert coffee sommelier and Q grader. Research this coffee and provide comprehensive details.

Coffee: ${w.name}
${w.winery ? `Roaster: ${w.winery}` : ""}
${w.varietal ? `Origin: ${w.varietal}` : ""}
${w.region ? `Region: ${w.region}` : ""}
${w.country ? `Country: ${w.country}` : ""}

Return a JSON object with these fields (use null for anything you're not confident about):
- description: 4-6 sentences about this coffee — the roaster, origin, processing method, what makes it notable
- tastingNotes: detailed cupping notes — describe aroma, flavor, aftertaste, acidity, body, balance, uniformity, and sweetness
- drinkingWindow: freshness guidance (e.g. "Best within 4 weeks of roast date")
- criticReviews: any notable reviews, awards, or cupping scores. Use null if unknown
- foodPairings: 6-8 things that pair well as a comma-separated string
- onlineRating: estimated quality rating on a 100-point scale`,

  beer: (w) => `You are an expert cicerone and beer judge. Research this beer and provide comprehensive details.

Beer: ${w.name}
${w.winery ? `Brewery: ${w.winery}` : ""}
${w.varietal ? `Style: ${w.varietal}` : ""}
${w.region ? `Region: ${w.region}` : ""}
${w.country ? `Country: ${w.country}` : ""}

Return a JSON object with these fields (use null for anything you're not confident about):
- description: 4-6 sentences about this beer — the brewery, what makes this beer notable, brewing style and ingredients
- tastingNotes: detailed tasting profile — describe appearance, aroma, flavor, mouthfeel, bitterness (estimated IBU), and finish
- drinkingWindow: freshness guidance (e.g. "Best fresh, within 90 days" or "Can cellar 2-5 years" for stouts/barleywines)
- criticReviews: known reviews or scores (Untappd, BeerAdvocate, RateBeer). Use null if unknown
- foodPairings: 6-8 food pairing suggestions as a comma-separated string
- onlineRating: estimated community rating on a 100-point scale`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const wine = await prisma.wine.findUnique({ where: { id: parseInt(id) } });
  if (!wine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const category = wine.category || "wine";
  const promptFn = ENRICH_PROMPTS[category] || ENRICH_PROMPTS.wine;
  const prompt = promptFn(wine as unknown as Record<string, unknown>);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${prompt}\n\nReturn ONLY valid JSON, no markdown code blocks or other text.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);

    const data: Record<string, unknown> = {};
    if (parsed.description) data.description = parsed.description;
    if (parsed.tastingNotes) data.tastingNotes = parsed.tastingNotes;
    if (parsed.drinkingWindow) data.drinkingWindow = parsed.drinkingWindow;
    if (parsed.criticReviews) data.criticReviews = parsed.criticReviews;
    if (parsed.foodPairings) data.foodPairings = parsed.foodPairings;
    if (parsed.onlineRating) data.onlineRating = parseFloat(parsed.onlineRating);

    const updated = await prisma.wine.update({
      where: { id: parseInt(id) },
      data,
      include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}
