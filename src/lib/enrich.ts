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

// Use web_search to find a stock image URL of the item's label/bottle
async function findLabelImageUrl(wine: Record<string, unknown>): Promise<string | null> {
  const query = [wine.winery, wine.name, wine.vintage].filter(Boolean).join(" ");
  if (!query) return null;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
      messages: [
        {
          role: "user",
          content: `Search the web for a clear photo of the bottle label for: "${query}".

Look on the producer's website, Wine-Searcher, Vivino, Wine.com, or other reliable wine sites. Find a direct image URL (ending in .jpg, .jpeg, .png, or .webp) showing the front of the bottle/label.

Return ONLY a JSON object with a single field: {"imageUrl": "https://..."} — a direct image URL that an HTML <img> tag could use. If you cannot find a suitable image, return {"imageUrl": null}.

Do not include any other text, explanation, or markdown code blocks.`,
        },
      ],
    });

    // Find the last text block (final response after any tool use)
    const textBlocks = message.content.filter((b) => b.type === "text");
    const finalText = textBlocks[textBlocks.length - 1];
    if (!finalText || finalText.type !== "text") return null;

    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = finalText.text.match(/\{[^}]*"imageUrl"[^}]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const url = parsed.imageUrl;
    if (typeof url !== "string" || !url.startsWith("http")) return null;
    return url;
  } catch {
    return null;
  }
}

export async function enrichWine(wineId: number): Promise<{ success: boolean; error?: string }> {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return { success: false, error: "Not found" };

  const category = wine.category || "wine";
  const promptFn = ENRICH_PROMPTS[category] || ENRICH_PROMPTS.wine;
  const prompt = promptFn(wine as unknown as Record<string, unknown>);

  try {
    // Run enrichment + label image search in parallel
    const [message, labelImageUrl] = await Promise.all([
      anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nReturn ONLY valid JSON, no markdown code blocks or other text.`,
          },
        ],
      }),
      // Only search for label image if missing
      wine.labelImageUrl ? Promise.resolve(null) : findLabelImageUrl(wine as unknown as Record<string, unknown>),
    ]);

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);

    const data: Record<string, unknown> = {};
    if (parsed.description) data.description = parsed.description;
    if (parsed.tastingNotes) data.tastingNotes = parsed.tastingNotes;
    if (parsed.drinkingWindow) data.drinkingWindow = parsed.drinkingWindow;
    if (parsed.criticReviews) data.criticReviews = parsed.criticReviews;
    if (parsed.foodPairings) data.foodPairings = parsed.foodPairings;
    if (parsed.onlineRating) data.onlineRating = parseFloat(parsed.onlineRating);
    if (labelImageUrl) data.labelImageUrl = labelImageUrl;

    await prisma.wine.update({ where: { id: wineId }, data });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

// Manual trigger to refresh the label image for a wine
export async function refreshLabelImage(wineId: number): Promise<string | null> {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return null;

  const url = await findLabelImageUrl(wine as unknown as Record<string, unknown>);
  if (url) {
    await prisma.wine.update({ where: { id: wineId }, data: { labelImageUrl: url } });
  }
  return url;
}
