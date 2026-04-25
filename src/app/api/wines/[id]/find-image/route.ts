import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshLabelImage } from "@/lib/enrich";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { id } = await params;
  const url = await refreshLabelImage(parseInt(id));

  if (!url) {
    return NextResponse.json({ error: "Could not find a label image for this wine" }, { status: 404 });
  }

  const updated = await prisma.wine.findUnique({
    where: { id: parseInt(id) },
    include: { store: true, list: true, consumptions: { orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json(updated);
}
