import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUDIT_CONSUMED_NOTE } from "@/lib/audit";

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
    select: { id: true, wineId: true, createdAt: true },
  });
  if (logs.length === 0) {
    return NextResponse.json({ error: "No audit-logged bottles found to undo" }, { status: 404 });
  }

  const byWine = new Map<number, typeof logs>();
  for (const l of logs) byWine.set(l.wineId, [...(byWine.get(l.wineId) ?? []), l]);

  const restored: { wineId: number; bottles: number; quantity: number }[] = [];
  for (const [wineId, wineLogs] of byWine) {
    const wine = await prisma.wine.findUnique({ where: { id: wineId } });
    if (!wine) continue;
    const ids = wineLogs.map((l) => l.id);

    // When was it last really opened? The latest log that stays. If none stay
    // and the audit is what stamped consumedAt, clear it; otherwise keep it
    // (wines opened before drink logging existed have consumedAt but no logs).
    const latestRemaining = await prisma.consumptionLog.findFirst({
      where: { wineId, id: { notIn: ids } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const earliestUndone = Math.min(...wineLogs.map((l) => l.createdAt.getTime()));
    const consumedAt = latestRemaining
      ? latestRemaining.createdAt
      : wine.consumedAt && wine.consumedAt.getTime() >= earliestUndone - 60_000
        ? null
        : wine.consumedAt;

    const quantity = wine.quantity + ids.length;
    await prisma.$transaction([
      prisma.consumptionLog.deleteMany({ where: { id: { in: ids } } }),
      prisma.wine.update({
        where: { id: wineId },
        data: {
          quantity,
          consumedAt,
          ...(wine.status === "consumed" ? { status: "collection" } : {}),
        },
      }),
    ]);
    restored.push({ wineId, bottles: ids.length, quantity });
  }

  return NextResponse.json({ restored, bottles: restored.reduce((n, r) => n + r.bottles, 0) });
}
