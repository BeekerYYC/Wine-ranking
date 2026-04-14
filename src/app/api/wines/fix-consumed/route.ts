import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// One-time cleanup: mark wines with quantity 0 still in "collection" as consumed
export async function POST() {
  const result = await prisma.wine.updateMany({
    where: {
      quantity: 0,
      status: "collection",
    },
    data: {
      status: "consumed",
      consumedAt: new Date(),
    },
  });

  return NextResponse.json({
    fixed: result.count,
    message: `Marked ${result.count} empty wines as consumed`,
  });
}
