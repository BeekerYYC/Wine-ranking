import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUDIT_CONSUMED_NOTE } from "@/lib/audit";

/**
 * Bottles the cellar audit has logged as drunk, grouped by wine and day, so
 * they can be reviewed and undone.
 *
 * Before the audit was fixed, a photo that failed to scan made its bottles look
 * missing, pre-set to "Mark consumed" — so past audits may have logged bottles
 * as drunk that are still in the fridge.
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";

  const logs = await prisma.consumptionLog.findMany({
    where: { notes: AUDIT_CONSUMED_NOTE, wine: { category } },
    select: {
      id: true,
      createdAt: true,
      wine: { select: { id: true, name: true, winery: true, vintage: true, quantity: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const groups = new Map<string, {
    wineId: number; name: string; winery: string | null; vintage: number | null;
    quantityNow: number; day: string; bottles: number; logIds: number[];
  }>();
  for (const log of logs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    const key = `${log.wine.id}|${day}`;
    const g = groups.get(key) ?? {
      wineId: log.wine.id, name: log.wine.name, winery: log.wine.winery, vintage: log.wine.vintage,
      quantityNow: log.wine.quantity, day, bottles: 0, logIds: [],
    };
    g.bottles += 1;
    g.logIds.push(log.id);
    groups.set(key, g);
  }

  return NextResponse.json({ groups: Array.from(groups.values()) });
}
