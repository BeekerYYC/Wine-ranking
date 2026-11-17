import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUDIT_CONSUMED_NOTE } from "@/lib/audit";
import { restoreBottles } from "@/lib/bottles";

/**
 * Undo bottles a cellar audit logged as drunk: put them back in the cellar and
 * delete those consumption logs. Only audit-written logs can be undone, so a
 * bottle you logged yourself is never touched.
 */
export async function POST(req: NextRequest) {
  const { logIds } = (await req.json().catch(() => ({}))) as { logIds?: unknown };
  if (!Array.isArray(logIds) || logIds.length === 0 || !logIds.every((n) => Number.isInteger(n))) {
    return NextResponse.json({ error: "logIds required" }, { status: 400 });
  }

  const logs = await prisma.consumptionLog.findMany({
    where: { id: { in: logIds as number[] }, notes: AUDIT_CONSUMED_NOTE },
    select: { id: true, wineId: true },
  });
  if (logs.length === 0) {
    return NextResponse.json({ error: "No audit-logged bottles found to undo" }, { status: 404 });
  }

  const byWine = new Map<number, number[]>();
  for (const l of logs) byWine.set(l.wineId, [...(byWine.get(l.wineId) ?? []), l.id]);

  const restored: { wineId: number; bottles: number; quantity: number }[] = [];
  for (const [wineId, ids] of byWine) {
    const result = await restoreBottles(wineId, ids);
    if (result) restored.push({ wineId, bottles: result.bottles, quantity: result.wine.quantity });
  }

  return NextResponse.json({ restored, bottles: restored.reduce((n, r) => n + r.bottles, 0) });
}
