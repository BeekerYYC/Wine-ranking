/**
 * Client-side sorting and grouping for the cellar shelf.
 *
 * Everything in the cellar is already loaded, so sorting here is instant and
 * lets the shelf offer sorts the API doesn't know about (taste profile, region).
 */

export type SortKey = "recent" | "score" | "price" | "region" | "body" | "name";
export type SortDir = "asc" | "desc";

export interface SortableWine {
  id: number;
  name: string;
  winery?: string | null;
  varietal?: string | null;
  region?: string | null;
  country?: string | null;
  color?: string | null;
  price?: number | null;
  rating?: number | null;
  onlineRating?: number | null;
  criticReviews?: string | null;
  tastingNotes?: string | null;
  description?: string | null;
}

export const SORT_OPTIONS: { key: SortKey; label: string; defaultDir: SortDir }[] = [
  { key: "recent", label: "Recent", defaultDir: "desc" },
  { key: "score", label: "Score", defaultDir: "desc" },
  { key: "price", label: "Price", defaultDir: "asc" },
  { key: "body", label: "Body", defaultDir: "asc" },
  { key: "region", label: "Region", defaultDir: "asc" },
  { key: "name", label: "A–Z", defaultDir: "asc" },
];

/** Sorts where tapping the active pill again flips the direction. */
export const FLIPPABLE: SortKey[] = ["score", "price"];

// --- Taste profile (body) ---------------------------------------------------

export type Body = "light" | "medium" | "full";
export const BODY_LABELS: Record<Body, string> = {
  light: "Light & fresh",
  medium: "Medium-bodied",
  full: "Full & bold",
};
const BODY_ORDER: Body[] = ["light", "medium", "full"];

// Fallback when there are no tasting notes: typical body by grape or style.
const FULL_GRAPES = ["cabernet sauvignon", "cabernet", "shiraz", "syrah", "malbec", "nebbiolo", "barolo", "tannat", "petite sirah", "zinfandel", "primitivo", "mourvèdre", "mourvedre", "monastrell", "amarone", "touriga", "aglianico", "priorat"];
const LIGHT_GRAPES = ["pinot noir", "gamay", "beaujolais", "sauvignon blanc", "riesling", "pinot grigio", "pinot gris", "albariño", "albarino", "vinho verde", "grüner", "gruner", "muscadet", "prosecco", "cava", "champagne", "trepat", "schiava", "frappato", "rosé"];
const MEDIUM_GRAPES = ["merlot", "grenache", "garnacha", "sangiovese", "chianti", "tempranillo", "rioja", "barbera", "carignan", "cariñena", "chardonnay", "zweigelt", "montepulciano", "côtes du rhône", "cotes du rhone", "ventoux"];

export function inferBody(w: SortableWine): Body | null {
  const notes = `${w.tastingNotes ?? ""} ${w.description ?? ""}`.toLowerCase();
  // Tasting notes say it outright most of the time ("medium-bodied", "full body").
  if (/medium[- ]to[- ]full|medium\(\+\)|medium-plus|medium plus/.test(notes)) return "full";
  if (/light[- ]to[- ]medium/.test(notes)) return "medium";
  if (/full[- ]bod(y|ied)/.test(notes)) return "full";
  if (/medium[- ]bod(y|ied)/.test(notes)) return "medium";
  if (/light[- ]bod(y|ied)/.test(notes)) return "light";

  const text = `${w.varietal ?? ""} ${w.name} ${w.region ?? ""}`.toLowerCase();
  if (text.includes("cabernet franc")) return "medium"; // before "cabernet" matches it as full
  if (FULL_GRAPES.some((g) => text.includes(g))) return "full";
  if (LIGHT_GRAPES.some((g) => text.includes(g))) return "light";
  if (MEDIUM_GRAPES.some((g) => text.includes(g))) return "medium";
  const color = (w.color ?? "").toLowerCase();
  if (color.startsWith("ros") || color === "sparkling" || color === "white") return "light";
  return null;
}

// --- Score ------------------------------------------------------------------

/** The number shown on the card's score badge: a critic score, else the AI estimate. */
export function wineScore(w: SortableWine): number | null {
  const m = w.criticReviews?.match(/([A-Za-z .]+?):\s*(\d{2,3})(?!\d)/);
  if (m) {
    const s = parseInt(m[2], 10);
    if (s >= 50 && s <= 100) return s;
  }
  return w.onlineRating != null ? Math.round(w.onlineRating) : null;
}

// --- Sorting & grouping -----------------------------------------------------

export interface Section<W> {
  title: string | null;
  wines: W[];
}

/** Missing values always sort last, whichever way the sort runs. */
function byNumber<W>(get: (w: W) => number | null | undefined, dir: SortDir) {
  return (a: W, b: W) => {
    const x = get(a), y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir === "asc" ? x - y : y - x;
  };
}

const byName = <W extends SortableWine>(a: W, b: W) =>
  (a.winery || a.name).localeCompare(b.winery || b.name);

/**
 * `wines` must arrive newest first (the API's order); "recent" keeps that.
 * Body and region come back as titled sections; the rest is one untitled section.
 */
export function sortCellar<W extends SortableWine>(wines: W[], key: SortKey, dir: SortDir): Section<W>[] {
  const list = [...wines];
  const scoreDesc = byNumber<W>(wineScore, "desc");

  switch (key) {
    case "recent":
      return [{ title: null, wines: list }];
    case "score":
      return [{ title: null, wines: list.sort(byNumber(wineScore, dir)) }];
    case "price":
      return [{ title: null, wines: list.sort(byNumber((w) => w.price, dir)) }];
    case "name":
      return [{ title: null, wines: list.sort(byName) }];
    case "body": {
      const groups = new Map<Body | null, W[]>();
      for (const w of list) {
        const b = inferBody(w);
        groups.set(b, [...(groups.get(b) ?? []), w]);
      }
      const order: (Body | null)[] = [...BODY_ORDER, null];
      return order
        .filter((b) => groups.has(b))
        .map((b) => ({
          title: b ? BODY_LABELS[b] : "Not profiled yet",
          wines: groups.get(b)!.sort(scoreDesc),
        }));
    }
    case "region": {
      const groups = new Map<string, W[]>();
      for (const w of list) {
        const c = w.country?.trim() || "";
        groups.set(c, [...(groups.get(c) ?? []), w]);
      }
      return [...groups.entries()]
        // Biggest countries first, then alphabetical; unknown at the end.
        .sort(([a, x], [b, y]) => (!a ? 1 : !b ? -1 : y.length - x.length || a.localeCompare(b)))
        .map(([country, ws]) => ({
          title: country || "Unknown region",
          wines: ws.sort((a, b) => (a.region ?? "").localeCompare(b.region ?? "") || scoreDesc(a, b)),
        }));
    }
  }
}
