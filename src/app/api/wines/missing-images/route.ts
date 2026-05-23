import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";
  const status = req.nextUrl.searchParams.get("status") || "collection";

  const wines = await prisma.wine.findMany({
    where: {
      category,
      status,
      labelImageUrl: null,
      imageData: null,
    },
    select: { id: true, name: true, winery: true, vintage: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ wines, count: wines.length });
}
