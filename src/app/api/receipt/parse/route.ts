import { NextRequest, NextResponse } from "next/server";
import { askForJson, arrayOf, hasApiKey, imageBlock, int, nullable, num, object, oneOf, str } from "@/lib/claude";
import type Anthropic from "@anthropic-ai/sdk";

// Reading a long receipt with Claude takes longer than the default function budget.
export const maxDuration = 60;

const COLOR_VALUES: Record<string, string[]> = {
  wine: ["red", "white", "rosé", "sparkling", "dessert", "orange"],
  coffee: ["light", "medium", "medium-dark", "dark", "espresso", "decaf"],
  beer: ["ipa", "lager", "stout", "pilsner", "wheat", "sour", "porter", "pale-ale"],
};

function receiptSchema(colors: string[]) {
  return object({
    storeName: nullable(str),
    items: arrayOf(object({
      name: str,
      winery: nullable(str),
      vintage: nullable(int),
      varietal: nullable(str),
      region: nullable(str),
      country: nullable(str),
      color: nullable(oneOf(colors)),
      price: nullable(num),
      quantity: int,
    })),
  });
}

function buildPrompt(category: string): string {
  const validColors = COLOR_VALUES[category]?.join('", "') || COLOR_VALUES.wine.join('", "');
  const producerLabel = category === "coffee" ? "roaster" : category === "beer" ? "brewery" : "winery/producer";
  const varietalLabel = category === "coffee" ? "origin" : category === "beer" ? "style" : "grape varietal";
  const itemLabel = category === "coffee" ? "coffee" : category === "beer" ? "beer" : "wine";

  return `You are reading a purchase receipt for ${itemLabel}. Extract every line item.

Fill in:
- storeName: the store/retailer name from the receipt header (or null)
- items: one entry per line item

Each item has these fields (use null where unknown):
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
  if (!hasApiKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { text, images, category: rawCategory = "wine" } = (await req.json()) as {
    text?: string;
    images?: string[];
    category?: string;
  };
  const category = rawCategory in COLOR_VALUES ? rawCategory : "wine";

  if (!text?.trim() && (!images || images.length === 0)) {
    return NextResponse.json({ error: "Provide receipt text or images" }, { status: 400 });
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = (images ?? []).map(imageBlock);
  if (text?.trim()) {
    content.push({ type: "text", text: `Receipt text:\n\n${text.trim()}` });
  }
  content.push({ type: "text", text: buildPrompt(category) });

  try {
    const parsed = await askForJson<{ storeName: string | null; items: Record<string, unknown>[] }>({
      content,
      schema: receiptSchema(COLOR_VALUES[category]),
    });

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const validColors = new Set(COLOR_VALUES[category]);

    const normalized = items.map((it) => ({
      name: typeof it.name === "string" ? it.name : "",
      winery: typeof it.winery === "string" ? it.winery : null,
      vintage: it.vintage != null ? parseInt(String(it.vintage)) || null : null,
      varietal: typeof it.varietal === "string" ? it.varietal : null,
      region: typeof it.region === "string" ? it.region : null,
      country: typeof it.country === "string" ? it.country : null,
      color: typeof it.color === "string" && validColors.has(it.color) ? it.color : null,
      price: it.price != null ? parseFloat(String(it.price)) || null : null,
      quantity: it.quantity != null ? Math.max(1, parseInt(String(it.quantity)) || 1) : 1,
    })).filter((it) => it.name.trim().length > 0);

    return NextResponse.json({
      storeName: typeof parsed.storeName === "string" ? parsed.storeName : null,
      items: normalized,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      { status: 502 }
    );
  }
}
