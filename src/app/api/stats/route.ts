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

  // Consumed = wines ever opened (status consumed OR consumedAt set)
  // This is the reliable count — consumption logs are incomplete for pre-feature data
  const winesConsumed = wines.filter((w) => w.consumedAt || w.status === "consumed").length;
  // Bottles consumed = max of (log entries, consumed wine count) since logs may be incomplete
  const bottlesFromLogs = consumptionLogs.length;
  const bottlesConsumed = Math.max(bottlesFromLogs, winesConsumed);

  // totalSpent = price * (remaining qty + bottles consumed from this wine)
  const totalSpent = wines.reduce((sum, w) => {
    if (!w.price) return sum;
    const logsForWine = consumptionLogs.filter((l) => l.wineId === w.id).length;
    const consumedQty = logsForWine > 0 ? logsForWine : ((w.consumedAt || w.status === "consumed") ? 1 : 0);
    return sum + (w.price || 0) * (w.quantity + consumedQty);
  }, 0);

  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0) + bottlesConsumed;
  const inCollection = wines.filter((w) => w.status === "collection").reduce((sum, w) => sum + w.quantity, 0);
  const consumed = winesConsumed;
  const consumedBottles = bottlesConsumed;
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

  // Build recent activity feed from consumption logs + recent additions
  const wineMap: Record<number, typeof wines[0]> = {};
  wines.forEach((w) => { wineMap[w.id] = w; });

  type Activity = {
    id: string;
    type: "consumed" | "added";
    wineId: number;
    name: string;
    winery: string | null;
    vintage: number | null;
    color: string | null;
    rating: number | null;
    onlineRating: number | null;
    imageData: string | null;
    labelImageUrl: string | null;
    region: string | null;
    country: string | null;
    timestamp: Date;
  };

  const consumedActivity: Activity[] = consumptionLogs.flatMap((log) => {
    const w = wineMap[log.wineId];
    if (!w) return [];
    return [{
      id: `c-${log.id}`,
      type: "consumed" as const,
      wineId: w.id,
      name: w.name,
      winery: w.winery,
      vintage: w.vintage,
      color: w.color,
      rating: log.rating ?? w.rating,
      onlineRating: w.onlineRating,
      imageData: w.imageData,
      labelImageUrl: w.labelImageUrl,
      region: w.region,
      country: w.country,
      timestamp: log.createdAt,
    }];
  });

  const addedActivity: Activity[] = wines.map((w) => ({
    id: `a-${w.id}`,
    type: "added" as const,
    wineId: w.id,
    name: w.name,
    winery: w.winery,
    vintage: w.vintage,
    color: w.color,
    rating: w.rating,
    onlineRating: w.onlineRating,
    imageData: w.imageData,
    labelImageUrl: w.labelImageUrl,
    region: w.region,
    country: w.country,
    timestamp: w.createdAt,
  }));

  const recentActivity = [...consumedActivity, ...addedActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return NextResponse.json({
    total, totalBottles, inCollection, consumed, consumedBottles, wishlist,
    avgRating: Math.round(avgRating * 10) / 10,
    avgPrice: Math.round(avgPrice * 100) / 100,
    totalSpent: Math.round(totalSpent * 100) / 100,
    avgDaysBetween: Math.round(avgDaysBetween * 10) / 10,
    varietalBreakdown, colorBreakdown, countryBreakdown,
    priceRating, monthlyAdditions, ratingDist, topWines, bestValue,
    uniqueVarietals, uniqueRegions, uniqueCountries,
    wineOfDay: wineOfDay ? { id: wineOfDay.id, name: wineOfDay.name, winery: wineOfDay.winery, rating: wineOfDay.rating, imageData: wineOfDay.imageData, labelImageUrl: wineOfDay.labelImageUrl, color: wineOfDay.color, vintage: wineOfDay.vintage } : null,
    onThisDay: onThisDay.map((w) => ({ id: w.id, name: w.name, winery: w.winery, createdAt: w.createdAt, rating: w.rating })),
    recentActivity,
  });
}
