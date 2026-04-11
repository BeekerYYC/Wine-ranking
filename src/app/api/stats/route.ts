import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || "wine";

  const wines = await prisma.wine.findMany({ where: { category } });

  // Get all consumption logs for wines in this category
  const wineIds = wines.map((w) => w.id);
  const consumptionLogs = wineIds.length > 0
    ? await prisma.consumptionLog.findMany({
        where: { wineId: { in: wineIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const total = wines.length;
  const rated = wines.filter((w) => w.rating);
  const avgRating = rated.length
    ? rated.reduce((sum, w) => sum + (w.rating || 0), 0) / rated.length
    : 0;

  const withPrice = wines.filter((w) => w.price);
  const avgPrice = withPrice.length
    ? withPrice.reduce((sum, w) => sum + (w.price || 0), 0) / withPrice.length
    : 0;
  const totalSpent = withPrice.reduce((sum, w) => sum + (w.price || 0) * w.quantity, 0);

  // Bottles consumed = number of consumption log entries (each = 1 bottle opened)
  const bottlesConsumed = consumptionLogs.length;
  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0) + bottlesConsumed;
  const inCollection = wines.filter((w) => w.status === "collection").reduce((sum, w) => sum + w.quantity, 0);
  const consumed = bottlesConsumed;
  const consumedWines = wines.filter((w) => w.status === "consumed").length;
  const wishlist = wines.filter((w) => w.status === "wishlist").length;

  const varietalMap: Record<string, number> = {};
  wines.forEach((w) => {
    if (w.varietal) varietalMap[w.varietal] = (varietalMap[w.varietal] || 0) + 1;
  });
  const varietalBreakdown = Object.entries(varietalMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const colorMap: Record<string, number> = {};
  wines.forEach((w) => {
    if (w.color) colorMap[w.color] = (colorMap[w.color] || 0) + 1;
  });
  const colorBreakdown = Object.entries(colorMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const countryMap: Record<string, number> = {};
  wines.forEach((w) => {
    if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + 1;
  });
  const countryBreakdown = Object.entries(countryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const priceRating = wines
    .filter((w) => w.price && w.rating)
    .map((w) => ({ name: w.name, price: w.price, rating: w.rating }));

  // Average days between consuming bottles (based on consumption log dates)
  const consumedDates = consumptionLogs.length > 0
    ? consumptionLogs.map((l) => new Date(l.createdAt).getTime()).sort((a, b) => a - b)
    : wines.filter((w) => w.consumedAt).map((w) => new Date(w.consumedAt!).getTime()).sort((a, b) => a - b);
  let avgDaysBetween = 0;
  if (consumedDates.length >= 2) {
    const gaps = [];
    for (let i = 1; i < consumedDates.length; i++) {
      gaps.push((consumedDates[i] - consumedDates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    avgDaysBetween = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  }

  const monthlyMap: Record<string, number> = {};
  wines.forEach((w) => {
    const d = new Date(w.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyAdditions = Object.entries(monthlyMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: wines.filter((w) => w.rating === r).length,
  }));

  const topWines = [...wines]
    .filter((w) => w.rating)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10)
    .map((w) => ({ id: w.id, name: w.name, rating: w.rating, winery: w.winery, vintage: w.vintage }));

  const bestValue = [...wines]
    .filter((w) => w.rating && w.price && w.price > 0)
    .map((w) => ({ ...w, value: (w.rating || 0) / (w.price || 1) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((w) => ({ id: w.id, name: w.name, rating: w.rating, price: w.price, winery: w.winery }));

  const uniqueVarietals = new Set(wines.map((w) => w.varietal).filter(Boolean)).size;
  const uniqueRegions = new Set(wines.map((w) => w.region).filter(Boolean)).size;
  const uniqueCountries = new Set(wines.map((w) => w.country).filter(Boolean)).size;

  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % Math.max(wines.length, 1);
  const wineOfDay = wines.length > 0 ? wines[dayIndex] : null;

  const onThisDay = wines.filter((w) => {
    const d = new Date(w.createdAt);
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() !== today.getFullYear();
  });

  return NextResponse.json({
    total, totalBottles, inCollection, consumed, consumedWines, wishlist,
    avgRating: Math.round(avgRating * 10) / 10,
    avgPrice: Math.round(avgPrice * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
    avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
    varietalBreakdown, colorBreakdown, countryBreakdown,
    priceRating, monthlyAdditions, ratingDist, topWines, bestValue,
    uniqueVarietals, uniqueRegions, uniqueCountries,
    wineOfDay: wineOfDay ? { id: wineOfDay.id, name: wineOfDay.name, winery: wineOfDay.winery, rating: wineOfDay.rating, imageData: wineOfDay.imageData, color: wineOfDay.color, vintage: wineOfDay.vintage } : null,
    onThisDay: onThisDay.map((w) => ({ id: w.id, name: w.name, winery: w.winery, createdAt: w.createdAt, rating: w.rating })),
  });
}
