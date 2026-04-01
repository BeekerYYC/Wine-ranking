import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { wines: true } } },
  });
  return NextResponse.json(stores);
}
