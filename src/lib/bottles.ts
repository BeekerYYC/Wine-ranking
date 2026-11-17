import { prisma } from "@/lib/db";

/**
 * Put bottles back in the cellar by deleting the consumption logs that took
 * them out — used to undo an accidental "Open this bottle" and bottles a cellar
 * audit wrongly logged as drunk.
 *
 * Restores the count, returns an emptied wine to the cellar, and recomputes
 * when it was last opened: the latest log that stays; or, if none stay and the
 * removed logs are what stamped consumedAt, nothing (wines opened before drink
 * logging existed have consumedAt but no logs, and keep it).
 */
export async function restoreBottles(wineId: number, logIds: number[]) {
  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  if (!wine) return null;
  const logs = await prisma.consumptionLog.findMany({
    where: { id: { in: logIds }, wineId },
    select: { id: true, createdAt: true },
  });
  if (logs.length === 0) return null;
  const ids = logs.map((l) => l.id);

  const latestRemaining = await prisma.consumptionLog.findFirst({
    where: { wineId, id: { notIn: ids } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const earliestRemoved = Math.min(...logs.map((l) => l.createdAt.getTime()));
  const consumedAt = latestRemaining
    ? latestRemaining.createdAt
    : wine.consumedAt && wine.consumedAt.getTime() >= earliestRemoved - 60_000
      ? null
      : wine.consumedAt;

  const [, updated] = await prisma.$transaction([
    prisma.consumptionLog.deleteMany({ where: { id: { in: ids } } }),
    prisma.wine.update({
      where: { id: wineId },
      data: {
        quantity: wine.quantity + ids.length,
        consumedAt,
        ...(wine.status === "consumed" ? { status: "collection" } : {}),
      },
      include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
    }),
  ]);
  return { wine: updated, bottles: ids.length };
}
