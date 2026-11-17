import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { restoreBottles } from "@/lib/bottles";

async function logFrom(params: Promise<{ logId: string }>) {
  const logId = parseInt((await params).logId);
  if (!Number.isFinite(logId)) return null;
  return prisma.consumptionLog.findUnique({ where: { id: logId } });
}

/** Undo opening a bottle: the bottle goes back in the cellar and the log is removed. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const log = await logFrom(params);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await restoreBottles(log.wineId, [log.id]);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.wine);
}

/**
 * Rate a bottle that was opened earlier, or stop being asked about it.
 * Body: { rating: 1-5, notes?: string } or { dismiss: true }.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const log = await logFrom(params);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { rating?: unknown; notes?: unknown; dismiss?: unknown };

  const clearPending = () => prisma.pendingReview.deleteMany({ where: { logId: log.id } });

  if (body.dismiss === true) {
    await clearPending();
    return NextResponse.json({ ok: true, dismissed: true });
  }

  const rating = body.rating as number;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  const wine = await prisma.wine.findUnique({ where: { id: log.wineId }, select: { notes: true } });
  await prisma.$transaction([
    prisma.consumptionLog.update({ where: { id: log.id }, data: { rating, ...(notes ? { notes } : {}) } }),
    // The wine's rating is your latest verdict on it; your first tasting note
    // becomes its note, but an existing note is never overwritten.
    prisma.wine.update({
      where: { id: log.wineId },
      data: { rating, ...(notes && !wine?.notes ? { notes } : {}) },
    }),
    clearPending(),
  ]);
  return NextResponse.json({ ok: true, rating });
}
