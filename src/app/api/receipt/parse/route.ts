import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const COLOR_VALUES: Record<string, string[]> = {
  wine: ["red", "white", "rosé", "sparkling", "dessert", "orange"],
  coffee: ["light", "medium", "medium-dark", "dark", "espresso", "decaf"],
  beer: ["ipa", "lager", "stout", "pilsner", "wheat", "sour", "porter", "pale-ale"],
};

function buildPrompt(category: string): string {
  const validColors = COLOR_VALUES[category]?.join('", "') || COLOR_VALUES.wine.join('", "');
  const producerLabel = category === "coffee" ? "roaster" : category === "beer" ? "brewery" : "winery/producer";
  const varietalLabel = category === "coffee" ? "origin" : category === "beer" ? "style" : "grape varietal";
  const itemLabel = category === "coffee" ? "coffee" : category === "beer" ? "beer" : "wine";

  return `You are reading a purchase receipt for ${itemLabel}. Extract every line item.

Return a JSON object with two fields:
- storeName: the store/retailer name from the receipt header (string or null)
- items: array of line items

Each item must have these fields (use null where unknown):
- name: the product name as it appears on the receipt (string, required)
- winery: ${producerLabel} name — infer from the product name using your knowledge (string or null)
- vintage: year if printed on the receipt or known for the bottling (number or null)
- varietal: ${varietalLabel} — infer from the product name using your knowledge (string or null)
- region: wine/coffee/beer region — infer from your knowledge (string or null)
- country: country of origin — infer from your knowledge (string or null)
- color: one of "${validColors}" — infer from product name + your knowledge (string or null)
- price: the REGULAR (list) price per bottle/unit, NOT the sale price. If only one price is shown, use that. (number or null)
- quantity: how many of this item were purchased. Watch for "x 2" / "x 3" multipliers. (number, minimum 1)

Important rules:
- If the receipt shows BOTH a regular price and a discounted/sale price, use the REGULAR price.
- If a line shows "$X.XX x N", that means quantity = N at $X.XX each — set price=X.XX and quantity=N.
- Ignore bottle deposits, taxes, GST/HST, subtotals, totals, savings, customer info, dates.
- Skip lines that aren't products (SKU numbers alone, "Regular Price:", "Bottle Deposit", etc.)
- Use your knowledge of ${itemLabel} producers to fill in winery/varietal/region/country even when the receipt only shows an abbreviated name.`;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { text, images, category = "wine" } = (await req.json()) as {
    text?: string;
    images?: string[];
    category?: string;
  };

  if (!text?.trim() && (!images || images.length === 0)) {
    return NextResponse.json({ error: "Provide receipt text or images" }, { status: 400 });
  }

  const prompt = buildPrompt(category);

  const content: Anthropic.Messages.ContentBlockParam[] = [];

  if (images?.length) {
    for (const img of images) {
      const base64 = img.replace(/^data:image\/\w+;base64,/, "");
      const mediaType: "image/png" | "image/jpeg" = img.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      });
    }
  }

  if (text?.trim()) {
    content.push({ type: "text", text: `Receipt text:\n\n${text.trim()}` });
  }

  content.push({
    type: "text",
    text: `${prompt}\n\nReturn ONLY valid JSON in the format {"storeName": ..., "items": [...]}. No markdown code blocks or other text.`,
  });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Could not parse receipt", raw: cleaned }, { status: 500 });
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const validColors = new Set(COLOR_VALUES[category] || COLOR_VALUES.wine);

    const normalized = items.map((it: Record<string, unknown>) => ({
      name: typeof it.name === "string" ? it.name : "",
      winery: typeof it.winery === "string" ? it.winery : null,
      vintage: it.vintage != null ? parseInt(String(it.vintage)) || null : null,
      varietal: typeof it.varietal === "string" ? it.varietal : null,
      region: typeof it.region === "string" ? it.region : null,
      country: typeof it.country === "string" ? it.country : null,
      color: typeof it.color === "string" && validColors.has(it.color) ? it.color : null,
      price: it.price != null ? parseFloat(String(it.price)) || null : null,
      quantity: it.quantity != null ? Math.max(1, parseInt(String(it.quantity)) || 1) : 1,
    })).filter((it: { name: string }) => it.name.trim().length > 0);

    return NextResponse.json({
      storeName: typeof parsed.storeName === "string" ? parsed.storeName : null,
      items: normalized,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 500 }
    );
  }
}
