import { NextRequest, NextResponse } from "next/server";
import { enrichWine } from "@/lib/enrich";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wineId = parseInt(id);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const result = await enrichWine(wineId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const wine = await prisma.wine.findUnique({ where: { id: wineId } });
  return NextResponse.json({ success: true, wine });
}
