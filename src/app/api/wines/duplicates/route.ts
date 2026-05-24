import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface DbWine {
  id: number;
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  rating: number | null;
  notes: string | null;
  imageData: string | null;
  labelImageUrl: string | null;
  createdAt: Date;
}

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[''’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(partially|visible|partial|obscured|blurry|unknown)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(s: string): string[] {
  return s.split(" ").filter((t) => t.length >= 3);
}

function tokenOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  let n = 0;
  for (const t of a) if (setB.has(t)) n++;
  return n;
}

// Stricter scoring than the audit matcher — we're grouping wines within the
// same collection and need higher confidence to call them duplicates (false
// merges destroy data).
function pairScore(a: DbWine, b: DbWine): number {
  const aName = normalize(a.name);
  const bName = normalize(b.name);
  const aWinery = normalize(a.winery);
  const bWinery = normalize(b.winery);
  const aTokens = tokensOf(aName);
  const bTokens = tokensOf(bName);

  // Different vintages → different wine. Hard separator.
  if (a.vintage && b.vintage && a.vintage !== b.vintage) return 0;

  let score = 0;

  // Exact normalized name (after vintage strip) is the strongest signal
  if (aName && bName && aName === bName) score += 100;

  // Full substring containment with substantial length on both sides
  if (score === 0 && aName.length >= 6 && bName.length >= 6) {
    if (aName.includes(bName) || bName.includes(aName)) score += 70;
  }

  // Token overlap — require fairly heavy overlap
  const nameOverlap = tokenOverlap(aTokens, bTokens);
  const minTokens = Math.min(aTokens.length, bTokens.length);
  if (minTokens >= 2 && nameOverlap >= 2 && nameOverlap / minTokens >= 0.6) {
    score += 25 + nameOverlap * 5;
  }

  // Winery match adds confidence
  if (aWinery && bWinery && aWinery === bWinery) score += 30;

  // Winery cross-match (one side has winery as prefix of name)
  const aWineryTokens = tokensOf(aWinery);
  const bWineryTokens = tokensOf(bWinery);
  const wineryCross = tokenOverlap(aWineryTokens, bTokens) + tokenOverlap(bWineryTokens, aTokens);
  if (wineryCross >= 1) score += 5 * wineryCross;

  // Color must agree if both have it (else penalize heavily — different colors
  // means different bottling even if names overlap)
  if (a.color && b.color && a.color !== b.color) score -= 80;

  return score;
}

// Simple disjoint-set union
class DSU {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(i: number, j: number) {
    const ri = this.find(i);
    const rj = this.find(j);
    if (ri !== rj) this.parent[ri] = rj;
  }
}

// Heuristic for picking the canonical wine in a group: prefer the one with
// the most user-contributed data (rating, notes, image), then highest qty,
// then oldest createdAt (earliest entry usually has the cleanest metadata).
function richnessScore(w: DbWine): number {
  let s = 0;
  if (w.rating) s += 4;
  if (w.notes && w.notes.trim().length > 0) s += 3;
  if (w.imageData) s += 2;
  if (w.labelImageUrl) s += 1;
  return s;
}

function pickCanonical(group: DbWine[]): number {
  const sorted = [...group].sort((a, b) => {
    const r = richnessScore(b) - richnessScore(a);
    if (r !== 0) return r;
    const q = b.quantity - a.quantity;
    if (q !== 0) return q;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return sorted[0].id;
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";
  const status = req.nextUrl.searchParams.get("status") || "collection";

  const wines = await prisma.wine.findMany({
    where: { category, status },
    select: {
      id: true, name: true, winery: true, vintage: true, varietal: true,
      color: true, quantity: true, rating: true, notes: true,
      imageData: true, labelImageUrl: true, createdAt: true,
    },
  });

  const THRESHOLD = 50; // higher = stricter
  const dsu = new DSU(wines.length);

  for (let i = 0; i < wines.length; i++) {
    for (let j = i + 1; j < wines.length; j++) {
      if (pairScore(wines[i], wines[j]) >= THRESHOLD) {
        dsu.union(i, j);
      }
    }
  }

  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < wines.length; i++) {
    const root = dsu.find(i);
    const arr = groupMap.get(root) ?? [];
    arr.push(i);
    groupMap.set(root, arr);
  }

  const groups = Array.from(groupMap.values())
    .filter((idxs) => idxs.length >= 2)
    .map((idxs) => {
      const groupWines = idxs.map((i) => wines[i]);
      const canonicalId = pickCanonical(groupWines);
      return {
        suggestedCanonicalId: canonicalId,
        wines: groupWines.map((w) => ({
          id: w.id,
          name: w.name,
          winery: w.winery,
          vintage: w.vintage,
          varietal: w.varietal,
          color: w.color,
          quantity: w.quantity,
          rating: w.rating,
          hasNotes: !!(w.notes && w.notes.trim().length > 0),
          hasImage: !!(w.imageData || w.labelImageUrl),
          createdAt: w.createdAt,
        })),
      };
    })
    // Sort by group size desc, then by total bottles desc — biggest cleanups first
    .sort((a, b) => {
      const s = b.wines.length - a.wines.length;
      if (s !== 0) return s;
      return b.wines.reduce((n, w) => n + w.quantity, 0) - a.wines.reduce((n, w) => n + w.quantity, 0);
    });

  return NextResponse.json({
    totalWinesScanned: wines.length,
    groupCount: groups.length,
    totalDuplicates: groups.reduce((n, g) => n + (g.wines.length - 1), 0),
    groups,
  });
}
