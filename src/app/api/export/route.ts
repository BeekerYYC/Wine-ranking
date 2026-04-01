import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const wines = await prisma.wine.findMany({
    include: { store: true, list: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Name", "Winery", "Vintage", "Varietal", "Region", "Country",
    "Color", "Price", "Rating", "Quantity", "Status", "Store",
    "List", "Occasion", "Notes", "Description", "Date Added",
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
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="wine-collection-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
