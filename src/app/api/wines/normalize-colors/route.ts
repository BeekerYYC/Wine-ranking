import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeColor } from "@/lib/colors";

/**
 * One-shot data fix: rewrites Wine.color to the canonical value for each
 * category (e.g. "rose" / "Rosé" / "ROSE" → "rosé"). Idempotent.
 *
 * Pass ?dryRun=true to preview the changes without writing.
 */
export async function POST(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  const wines = await prisma.wine.findMany({
    select: { id: true, name: true, color: true },
  });

  const changes: { id: number; name: string; from: string | null; to: string | null }[] = [];
  for (const w of wines) {
    const normalized = normalizeColor(w.color);
    if (w.color !== normalized) {
      changes.push({ id: w.id, name: w.name, from: w.color, to: normalized });
    }
  }

  if (!dryRun) {
    for (const c of changes) {
      await prisma.wine.update({
        where: { id: c.id },
        data: { color: c.to },
      });
    }
  }

  return NextResponse.json({
    dryRun,
    totalScanned: wines.length,
    changed: changes.length,
    changes,
  });
}
