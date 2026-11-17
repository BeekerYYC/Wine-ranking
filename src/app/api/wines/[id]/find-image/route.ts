import { NextRequest, NextResponse } from "next/server";
import { hasApiKey } from "@/lib/claude";
import { prisma } from "@/lib/db";
import { refreshLabelImage } from "@/lib/enrich";

// The label search uses Claude with web search, which outlasts the default budget.
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasApiKey()) {
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
