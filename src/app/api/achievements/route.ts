import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface WineData {
  rating: number | null; color: string | null; country: string | null;
  varietal: string | null; region: string | null; price: number | null;
  status: string; quantity: number; consumedAt: Date | null;
}

interface AchievementDef {
  key: string; name: string; description: string; icon: string;
  check: (wines: WineData[], scanBatches: number) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Collection milestones
  { key: "first_wine", name: "First Pour", description: "Add your first wine", icon: "🥂", check: (w) => w.length >= 1 },
  { key: "ten_wines", name: "Getting Started", description: "Add 10 wines to your collection", icon: "📦", check: (w) => w.length >= 10 },
  { key: "twenty_five", name: "Collector", description: "Add 25 wines", icon: "🏆", check: (w) => w.length >= 25 },
  { key: "fifty_wines", name: "Connoisseur", description: "Add 50 wines", icon: "👑", check: (w) => w.length >= 50 },
  { key: "century_club", name: "Century Club", description: "Add 100 wines", icon: "💯", check: (w) => w.length >= 100 },
  // Rating & discovery
  { key: "five_star", name: "Perfect Score", description: "Rate a wine 5 stars", icon: "⭐", check: (w) => w.some((x) => x.rating === 5) },
  { key: "all_colors", name: "Full Spectrum", description: "Try all 6 wine colors", icon: "🌈", check: (w) => new Set(w.map((x) => x.color).filter(Boolean)).size >= 6 },
  { key: "five_countries", name: "World Traveler", description: "Try wines from 5 different countries", icon: "🌍", check: (w) => new Set(w.map((x) => x.country).filter(Boolean)).size >= 5 },
  { key: "ten_countries", name: "Globe Trotter", description: "Try wines from 10 countries", icon: "✈️", check: (w) => new Set(w.map((x) => x.country).filter(Boolean)).size >= 10 },
  { key: "five_varietals", name: "Grape Explorer", description: "Try 5 different varietals", icon: "🍇", check: (w) => new Set(w.map((x) => x.varietal).filter(Boolean)).size >= 5 },
  { key: "ten_varietals", name: "Varietal Master", description: "Try 10 different varietals", icon: "🎓", check: (w) => new Set(w.map((x) => x.varietal).filter(Boolean)).size >= 10 },
  { key: "big_spender", name: "Big Spender", description: "Add a wine over $100", icon: "💰", check: (w) => w.some((x) => x.price && x.price > 100) },
  { key: "bargain_hunter", name: "Bargain Hunter", description: "Rate a wine under $15 with 4+ stars", icon: "🏷️", check: (w) => w.some((x) => x.price && x.price < 15 && x.rating && x.rating >= 4) },
  { key: "ten_regions", name: "Region Hopper", description: "Try wines from 10 different regions", icon: "🗺️", check: (w) => new Set(w.map((x) => x.region).filter(Boolean)).size >= 10 },
  // Fridge & consumption
  { key: "first_scan", name: "First Scan", description: "Complete your first bulk scan", icon: "📸", check: (_w, batches) => batches >= 1 },
  { key: "bulk_scanner", name: "Bulk Scanner", description: "Complete 5 bulk scans", icon: "🔄", check: (_w, batches) => batches >= 5 },
  { key: "first_sip", name: "First Sip", description: "Consume your first wine", icon: "🍷", check: (w) => w.some((x) => x.consumedAt !== null) },
  { key: "ten_consumed", name: "Empty Shelf", description: "Consume 10 wines", icon: "🍾", check: (w) => w.filter((x) => x.consumedAt !== null).length >= 10 },
  { key: "stocked_fridge", name: "Stocked Up", description: "Have 20+ bottles in your fridge", icon: "🧊", check: (w) => w.filter((x) => x.status === "collection").reduce((sum, x) => sum + x.quantity, 0) >= 20 },
  { key: "half_century_bottles", name: "Serious Cellar", description: "Have 50+ bottles in your fridge", icon: "🏰", check: (w) => w.filter((x) => x.status === "collection").reduce((sum, x) => sum + x.quantity, 0) >= 50 },
];

export async function GET() {
  const wines = await prisma.wine.findMany({
    select: { rating: true, color: true, country: true, varietal: true, region: true, price: true, status: true, quantity: true, consumedAt: true },
  });
  const scanBatchCount = await prisma.scanBatch.count({ where: { status: "completed" } });
  const existing = await prisma.achievement.findMany();
  const existingKeys = new Set(existing.map((a) => a.key));

  const newAchievements = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!existingKeys.has(def.key) && def.check(wines, scanBatchCount)) {
      const achievement = await prisma.achievement.create({
        data: { key: def.key, name: def.name, description: def.description, icon: def.icon },
      });
      newAchievements.push(achievement);
    }
  }

  const all = await prisma.achievement.findMany({ orderBy: { unlockedAt: "desc" } });

  const allDefs = ACHIEVEMENT_DEFS.map((def) => {
    const unlocked = all.find((a) => a.key === def.key);
    return {
      key: def.key, name: def.name, description: def.description, icon: def.icon,
      unlocked: !!unlocked, unlockedAt: unlocked?.unlockedAt || null,
    };
  });

  return NextResponse.json({ achievements: allDefs, newAchievements });
}
