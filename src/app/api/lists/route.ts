import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const lists = await prisma.wineList.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { wines: true } } },
  });
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const list = await prisma.wineList.create({ data: { name } });
  return NextResponse.json(list, { status: 201 });
}
