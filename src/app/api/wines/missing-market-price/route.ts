import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Wines with no market price yet, so a caller can fill them in. */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";
  const status = req.nextUrl.searchParams.get("status") || "collection";

  const wines = await prisma.wine.findMany({
    where: { category, status, marketPrice: null },
    select: { id: true, name: true, winery: true, vintage: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ wines, count: wines.length });
}
