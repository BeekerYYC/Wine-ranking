import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enrichWine } from "@/lib/enrich";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { id } = await params;
  const result = await enrichWine(parseInt(id));

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const updated = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(updated);
}
