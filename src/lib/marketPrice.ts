import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface MarketPrice {
  price: number;
  currency: string;
  note: string | null;
}

/**
 * Research what a bottle currently sells for.
 *
 * This is the *market* price — roughly what the wine trades for now — not the
 * price that was paid, which lives in `Wine.price`. There is no free
 * authoritative feed for this (Wine-Searcher has the data but no open API), so it
 * comes from a web search summarised by the model. That makes it an estimate, and
 * it is stored with the currency and a source note so the UI can present it
 * honestly rather than as a quoted fact.
 *
 * Returns null when nothing usable was found, which is a normal outcome for
 * obscure bottles — better an empty field than an invented number.
 */
export async function findMarketPrice(wine: {
  name: string;
  winery?: string | null;
  vintage?: number | null;
  region?: string | null;
  country?: string | null;
}): Promise<MarketPrice | null> {
  const descriptor = [wine.winery, wine.name, wine.vintage, wine.region, wine.country]
    .filter(Boolean)
    .join(" ");
  if (!descriptor.trim()) return null;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Find the current market price for one 750ml bottle of: "${descriptor}".

Search retailer listings and price aggregators (Wine-Searcher, Vivino, wine.com, LCBO, Canadian retailers). Report a typical current price per bottle, not a case price, not a sale or clearance price, and not an auction hammer price.

Prefer a price in CAD (the collection is in Canada). If you only find another currency, report that currency rather than converting.

Return ONLY a JSON object:
{"price": 24.99, "currency": "CAD", "note": "avg of 3 Canadian retailer listings"}

- price: a number, the per-bottle price
- currency: ISO code such as "CAD", "USD", "EUR", "GBP"
- note: under 80 characters saying what the figure is based on

If you cannot find a credible price for this specific wine, return {"price": null}. Do not guess from similar wines and do not extrapolate from the producer's other bottlings.`,
        },
      ],
    });

    // The final text block is the answer; earlier blocks are search activity.
    const textBlocks = message.content.filter((b) => b.type === "text");
    const last = textBlocks[textBlocks.length - 1];
    if (!last || last.type !== "text") return null;

    const match = last.text.match(/\{[\s\S]*?"price"[\s\S]*?\}/);
    if (!match) return null;

    let parsed: { price?: unknown; currency?: unknown; note?: unknown };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }

    const price = typeof parsed.price === "number" ? parsed.price : Number(parsed.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    // A four-figure bottle is possible but a four-figure *parse* is usually the
    // model having picked up a case price or a mangled number.
    if (price > 5000) return null;

    const currency =
      typeof parsed.currency === "string" && /^[A-Za-z]{3}$/.test(parsed.currency.trim())
        ? parsed.currency.trim().toUpperCase()
        : "CAD";

    const note = typeof parsed.note === "string" ? parsed.note.slice(0, 120) : null;

    return { price: Math.round(price * 100) / 100, currency, note };
  } catch {
    return null;
  }
}
