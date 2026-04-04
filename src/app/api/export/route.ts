import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";

  const wines = await prisma.wine.findMany({
    where: { category },
    include: { store: true, list: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Name", "Producer", "Vintage", "Type", "Region", "Country",
    "Category", "Price", "Rating", "Quantity", "Status", "Store",
    "List", "Occasion", "Notes", "Description", "Date Added", "Date Consumed",
  ];

  const rows = wines.map((w) => [
    w.name,
    w.winery || "",
    w.vintage?.toString() || "",
    w.varietal || "",
    w.region || "",
    w.country || "",
    w.color || "",
    w.price?.toString() || "",
    w.rating?.toString() || "",
    w.quantity.toString(),
    w.status,
    w.store?.name || "",
    w.list?.name || "",
    w.occasion || "",
    (w.notes || "").replace(/"/g, '""'),
    (w.description || "").replace(/"/g, '""'),
    new Date(w.createdAt).toLocaleDateString(),
    w.consumedAt ? new Date(w.consumedAt).toLocaleDateString() : "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${category}-collection-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
