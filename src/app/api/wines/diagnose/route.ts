import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Receipt items expected from the 5/23/2026 Kensington Wine Market receipt.
// Names are partial — matched case-insensitive against `Wine.name`.
const RECEIPT_NAMES = [
  "Aubuisieres Cuvée de Silex",
  "Dagueneau Pouilly Fumé",
  "Kloof Street Old Vine Chenin",
  "Evodia Old Vines Garnacha",
  "Terminus Meldor",
  "Durigutti Cabernet Franc",
  "Sola Fred",
  "Mas Blanch i Jove Saó Rosat",
  "Mulderbosch Rosé",
  "Dagueneau Rosé Côte Charité",
  "Clos du Soleil Rosé",
  "Glup Rosado",
  "Narrative Rosé",
  "Perrin Miraval Provence Rosé",
  "JL Denois Brut Rosé",
  "Croix des Pins Ventoux Rosé",
];

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";

  const all = await prisma.wine.findMany({
    where: { category },
    select: {
      id: true, name: true, winery: true, color: true,
      quantity: true, status: true, storeId: true,
      imageData: true, labelImageUrl: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const byStatus: Record<string, number> = {};
  const byColor: Record<string, { count: number; bottles: number }> = {};
  const byStore: Record<string, number> = {};
  let missingImages = 0;

  const stores = await prisma.store.findMany();
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  for (const w of all) {
    byStatus[w.status || "?"] = (byStatus[w.status || "?"] || 0) + 1;
    const colorKey = w.color === null ? "<null>" : JSON.stringify(w.color); // expose exact bytes
    if (!byColor[colorKey]) byColor[colorKey] = { count: 0, bottles: 0 };
    byColor[colorKey].count += 1;
    byColor[colorKey].bottles += w.quantity;
    const sn = w.storeId ? storeName.get(w.storeId) || `store#${w.storeId}` : "<no store>";
    byStore[sn] = (byStore[sn] || 0) + 1;
    if (!w.imageData && !w.labelImageUrl) missingImages += 1;
  }

  // Receipt-item presence check (case-insensitive substring on either side).
  const receiptStatus = RECEIPT_NAMES.map((expected) => {
    const norm = expected.toLowerCase();
    const matches = all.filter((w) => {
      const wn = w.name.toLowerCase();
      return wn.includes(norm) || norm.includes(wn);
    });
    return {
      expected,
      found: matches.length > 0,
      matches: matches.map((m) => ({
        id: m.id, name: m.name, color: m.color,
        quantity: m.quantity, status: m.status,
      })),
    };
  });

  return NextResponse.json({
    totalRows: all.length,
    totalBottles: all.reduce((n, w) => n + w.quantity, 0),
    byStatus,
    byColor,
    byStore,
    missingImages,
    receiptStatus,
  });
}
