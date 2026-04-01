import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const color = req.nextUrl.searchParams.get("color") || "";
  const sort = req.nextUrl.searchParams.get("sort") || "createdAt";
  const order = req.nextUrl.searchParams.get("order") || "desc";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { winery: { contains: search } },
      { varietal: { contains: search } },
      { region: { contains: search } },
    ];
  }

  if (color) {
    where.color = color;
  }

  const wines = await prisma.wine.findMany({
    where,
    orderBy: { [sort]: order },
    select: {
      id: true,
      name: true,
      winery: true,
      vintage: true,
      varietal: true,
      region: true,
      country: true,
      color: true,
      price: true,
      rating: true,
      notes: true,
      description: true,
      imageData: true,
      createdAt: true,
    },
  });

  return NextResponse.json(wines);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const wine = await prisma.wine.create({
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

  return NextResponse.json(wine, { status: 201 });
}
