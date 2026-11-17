import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Quote every cell and double any quote marks inside it (RFC 4180). Only the
 * notes and description used to be escaped, so a name like `The "Prisoner"`
 * split its row. Cells starting with = + - @ are prefixed with ' so a
 * spreadsheet shows them as text instead of running them as formulas.
 */
function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";

  const wines = await prisma.wine.findMany({
    where: { category },
    include: { store: true, list: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Name", "Producer", "Vintage", "Varietal", "Color", "Region", "Country",
    "Price", "Rating", "Quantity", "Status", "Store", "List", "Occasion",
    "Notes", "Description", "Date Added", "Date Consumed",
  ];

  const rows = wines.map((w) => [
    w.name,
    w.winery,
    w.vintage,
    w.varietal,
    w.color,
    w.region,
    w.country,
    w.price,
    w.rating,
    w.quantity,
    w.status,
    w.store?.name,
    w.list?.name,
    w.occasion,
    w.notes,
    w.description,
    isoDate(w.createdAt),
    isoDate(w.consumedAt),
  ]);

  // The leading byte-order mark tells Excel the file is UTF-8, so accented
  // names ("Cuvée", "Rosé") don't come out garbled.
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${category}-collection-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
