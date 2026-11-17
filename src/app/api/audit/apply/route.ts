import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ApplyAction {
  type: "decrement" | "increment" | "create" | "ignore";
  // "increment" is also used when the audit UI's "merge into existing"
  // resolves a new-in-photos row to a DB wine: same operation as adjusting
  // up a quantity mismatch.
  wineId?: number;
  deltaQty?: number;
  // Source photo from the audit — saved on the wine for "create", and
  // backfilled onto the target wine for "increment" when it has no image yet.
  imageData?: string | null;
  newWine?: {
    name: string;
    winery: string | null;
    vintage: number | null;
    varietal: string | null;
    color: string | null;
    quantity: number;
  };
}

export async function POST(req: NextRequest) {
  const { actions, category = "wine" } = (await req.json()) as {
    actions: ApplyAction[];
    category?: string;
  };

  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: "actions required" }, { status: 400 });
  }

  const results: { type: string; wineId?: number; ok: boolean; detail?: string }[] = [];

  for (const action of actions) {
    if (action.type === "ignore") {
      results.push({ type: "ignore", ok: true });
      continue;
    }

    // Counts must be positive whole numbers; the direction comes from the type.
    if ((action.type === "decrement" || action.type === "increment") &&
        !(Number.isInteger(action.deltaQty) && (action.deltaQty as number) > 0)) {
      results.push({ type: action.type, wineId: action.wineId, ok: false, detail: "invalid quantity" });
      continue;
    }

    if (action.type === "decrement" && action.wineId != null && action.deltaQty != null) {
      const wine = await prisma.wine.findUnique({ where: { id: action.wineId } });
      if (!wine) {
        results.push({ type: "decrement", wineId: action.wineId, ok: false, detail: "wine not found" });
        continue;
      }
      const newQty = Math.max(0, wine.quantity - action.deltaQty);
      const consumedDelta = wine.quantity - newQty;
      // Log each missing bottle as a consumption event so dashboard stats stay honest.
      for (let i = 0; i < consumedDelta; i++) {
        await prisma.consumptionLog.create({
          data: { wineId: wine.id, notes: "Marked consumed via cellar audit" },
        });
      }
      const updated = await prisma.wine.update({
        where: { id: wine.id },
        data: {
          quantity: newQty,
          // Bottles were drunk, so stamp when. An empty wine is consumed whether
          // or not it was opened before — this used to require consumedAt to be
          // unset, so a wine opened earlier stayed "in collection" at zero
          // bottles, invisible in the cellar.
          ...(consumedDelta > 0 ? { consumedAt: new Date() } : {}),
          ...(newQty === 0 ? { status: "consumed" } : {}),
        },
      });
      results.push({ type: "decrement", wineId: updated.id, ok: true, detail: `qty ${wine.quantity} → ${newQty}` });
      continue;
    }

    if (action.type === "increment" && action.wineId != null && action.deltaQty != null) {
      const wine = await prisma.wine.findUnique({ where: { id: action.wineId } });
      if (!wine) {
        results.push({ type: "increment", wineId: action.wineId, ok: false, detail: "wine not found" });
        continue;
      }
      const updated = await prisma.wine.update({
        where: { id: wine.id },
        data: {
          quantity: wine.quantity + action.deltaQty,
          status: "collection",
          // Backfill the photo if the target had none yet — but never overwrite
          // an existing user photo.
          ...(action.imageData && !wine.imageData ? { imageData: action.imageData } : {}),
        },
      });
      results.push({ type: "increment", wineId: updated.id, ok: true, detail: `qty ${wine.quantity} → ${updated.quantity}` });
      continue;
    }

    if (action.type === "create" && action.newWine) {
      const w = action.newWine;
      const created = await prisma.wine.create({
        data: {
          name: w.name,
          category,
          winery: w.winery,
          vintage: w.vintage,
          varietal: w.varietal,
          color: w.color,
          quantity: Math.max(1, w.quantity),
          status: "collection",
          imageData: action.imageData ?? null,
        },
      });
      results.push({ type: "create", wineId: created.id, ok: true, detail: w.name });
      continue;
    }

    results.push({ type: action.type, ok: false, detail: "missing required fields" });
  }

  return NextResponse.json({ applied: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}
