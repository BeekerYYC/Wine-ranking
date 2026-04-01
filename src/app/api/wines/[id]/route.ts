import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wine = await prisma.wine.findUnique({ where: { id: parseInt(id) } });
  if (!wine) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wine);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const wine = await prisma.wine.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      winery: body.winery || null,
      vintage: body.vintage ? parseInt(body.vintage) : null,
      varietal: body.varietal || null,
      region: body.region || null,
      country: body.country || null,
      color: body.color || null,
      price: body.price ? parseFloat(body.price) : null,
      rating: body.rating ? parseInt(body.rating) : null,
      notes: body.notes || null,
      description: body.description || null,
      imageData: body.imageData || null,
    },
  });

  return NextResponse.json(wine);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.wine.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
