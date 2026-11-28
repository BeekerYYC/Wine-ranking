"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReviewBell } from "@/components/DrinkFlow";
import { useCategory } from "@/lib/CategoryContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import WineImage from "@/components/WineImage";

interface Wine {
  id: number;
  name: string;
  winery?: string | null;
  vintage?: number | null;
  varietal?: string | null;
  region?: string | null;
  country?: string | null;
  color?: string | null;
  rating?: number | null;
  onlineRating?: number | null;
  hasImage?: boolean;
  labelImageUrl?: string | null;
  tastingNotes?: string | null;
  criticReviews?: string | null;
  createdAt: string;
  quantity?: number;
}

interface Stats {
  total: number;
  totalBottles: number;
  inCollection: number;
  consumed: number;
  consumedBottles: number;
  avgDaysBetween: number;
  avgRating: number;
  totalSpent: number;
  uniqueRegions: number;
  uniqueCountries: number;
  countryBreakdown: { name: string; count: number }[];
  monthlyConsumption: { month: string; count: number }[];
}

const REGION_COLORS = ["#b73a5e", "#e0617e", "#d4849a", "#c2185b", "#8a3f5a", "#6b2d40"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (key: string) => MONTH_NAMES[parseInt(key.slice(5), 10) - 1] || key;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { category, config } = useCategory();
  const [wines, setWines] = useState<Wine[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [craving, setCraving] = useState("");
  const router = useRouter();
  const findWine = (text: string) => {
    if (text.trim()) router.push(`/fridge/drink?q=${encodeURIComponent(text.trim())}`);
  };

  useEffect(() => {
    fetch(`/api/wines?category=${category}&sort=createdAt&order=desc`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Wine[]) => setWines(Array.isArray(data) ? data : []))
      .catch(() => setWines([]));
    fetch(`/api/stats?category=${category}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setStats(s))
      .catch(() => {});
  }, [category]);

  // Every recently added bottle belongs here. This list used to be filtered to
  // wines with tastingNotes/criticReviews, which only the manual-add and receipt
  // paths populate — so a bottle added by scanning could never appear, and the
  // section vanished entirely for a scan-only collection. That made a saved
  // bottle look lost in the one place you would go to confirm it.
  const recentlyAdded = wines.slice(0, 6);
  // Count bottles, not wine entries: one scanned wine with quantity 3 is 3 new bottles.
  const newThisWeek = wines
    .filter((w) => Date.now() - new Date(w.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, w) => sum + (w.quantity ?? 1), 0);

  // Build top regions/countries data
  const topCountries = stats?.countryBreakdown?.slice(0, 5) || [];
  const totalCountryCount = topCountries.reduce((s, c) => s + c.count, 0);
  const otherCount = (stats?.total || 0) - totalCountryCount;
  const pieData = otherCount > 0
    ? [...topCountries, { name: "Others", count: otherCount }]
    : topCountries;

  // Bottles opened in each of the last 6 months (this used to plot bottles added)
  const monthlyData = stats?.monthlyConsumption?.slice(-6) || [];

  return (
    <div className="space-y-5 pb-2">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-semibold text-text-primary leading-tight">
            {getGreeting()} <span className="text-pink">🍷</span>
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">Here&apos;s what&apos;s happening in your wine world.</p>
        </div>
        {/* Opened bottles waiting for a rating; tap to rate them. */}
        <ReviewBell />
      </div>

      {/* The everyday job: what are you eating → which bottle. */}
      <form
        onSubmit={(e) => { e.preventDefault(); findWine(craving); }}
        className="rounded-2xl border border-gold/25 p-5"
        style={{ background: "linear-gradient(135deg, rgba(212,184,122,0.12) 0%, rgba(183,58,94,0.12) 55%, rgba(20,12,16,0.6) 100%)" }}
      >
        <label htmlFor="craving" className="block font-serif text-[22px] sm:text-[24px] font-semibold leading-tight">
          {config.drinkPrompt}
        </label>
        <p className="text-[12.5px] text-text-tertiary mt-1 mb-3">Tell me what you&apos;re eating — I&apos;ll pick a bottle from your {config.fridgeLabel.toLowerCase()}.</p>
        <div className="flex gap-2">
          <input
            id="craving"
            type="text"
            value={craving}
            onChange={(e) => setCraving(e.target.value)}
            placeholder={category === "wine" ? "Lamb chops with rosemary…" : category === "coffee" ? "Something strong to wake up…" : "Tacos tonight…"}
            enterKeyHint="search"
            // 16px stops iOS zooming the page when the field is focused.
            className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-bg/60 border border-border-subtle text-[16px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
          />
          <button
            type="submit"
            disabled={!craving.trim()}
            className="bg-gold/90 hover:bg-gold disabled:opacity-40 text-bg px-5 rounded-xl text-[14px] font-semibold transition-all"
          >
            Find
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 -mx-1 px-1 pb-0.5">
          {config.quickPrompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => findWine(p.value)}
              className="flex-shrink-0 bg-surface-raised/80 hover:bg-surface-overlay border border-border-subtle rounded-full px-3 py-1.5 text-[12.5px] text-text-secondary hover:text-gold transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fridge card */}
        <Link
          href="/fridge"
          className="relative overflow-hidden rounded-2xl border border-border-subtle p-5 group transition-all hover:border-gold/30"
          style={{
            background: "linear-gradient(135deg, rgba(183,58,94,0.18) 0%, rgba(138,63,90,0.08) 60%, rgba(20,12,16,0.6) 100%)",
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gold-muted flex items-center justify-center">
                <CellarIcon />
              </div>
              <span className="text-[13px] font-medium text-text-secondary">My {config.fridgeLabel}</span>
            </div>
            <p className="font-serif text-[40px] font-semibold leading-none">{stats?.inCollection ?? "—"}</p>
            <p className="text-[12px] text-text-tertiary mt-1">Bottles</p>
            <p className="text-[11px] text-text-muted mt-3">
              {newThisWeek > 0 ? `${newThisWeek} new this week` : "View collection"}
            </p>
          </div>
          {/* Decorative bottle silhouettes */}
          <div className="absolute right-3 top-3 bottom-3 w-20 opacity-30 group-hover:opacity-50 transition-opacity flex items-end gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-t-full bg-gradient-to-t from-gold to-transparent"
                style={{ height: `${60 + i * 10}%` }}
              />
            ))}
          </div>
        </Link>

        {/* Restocking happens every couple of months — a small card, not a hero. */}
        <Link
          href="/fridge/scan"
          className="rounded-2xl border border-border-subtle p-5 flex items-center gap-4 transition-all hover:border-gold/30 bg-surface-raised"
        >
          <div className="w-11 h-11 rounded-xl bg-gold-muted flex items-center justify-center text-gold flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.82-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-primary">Bought wine?</p>
            <p className="text-[12px] text-text-tertiary">Scan your drawers to add the bottles.</p>
          </div>
        </Link>
      </div>

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[20px] font-semibold">Recently Added</h2>
            <Link href="/fridge" className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1">
              See all
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {recentlyAdded.map((wine) => (
              <Link
                key={wine.id}
                href={`/wine/${wine.id}`}
                className="flex-shrink-0 w-[180px] rounded-2xl overflow-hidden bg-surface-raised border border-border-subtle hover:border-gold/30 transition-all group"
              >
                <div className="h-[160px] bg-gradient-to-br from-surface-overlay to-surface relative overflow-hidden flex items-center justify-center">
                  <WineImage
                    wineId={wine.id}
                    hasImage={wine.hasImage}
                    labelImageUrl={wine.labelImageUrl}
                    alt={wine.name}
                    color={wine.color}
                    className="h-full object-contain"
                    fallbackEmoji="🍷"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-serif text-[14px] font-semibold text-text-primary leading-tight line-clamp-2">
                    {wine.winery && `${wine.winery} `}{wine.name}
                  </h3>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    {[wine.region, wine.country].filter(Boolean).join(", ")} {wine.vintage && `• ${wine.vintage}`}
                  </p>
                  {(wine.tastingNotes || wine.criticReviews) && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-cream">
                      <span>✨</span>
                      <span className="uppercase tracking-widest font-semibold">AI Enriched</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {stats && stats.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[20px] font-semibold">Your Wine Insights</h2>
            <Link href="/dashboard" className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1">
              See all
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric icon={<IconBottle />} value={stats.consumedBottles ?? stats.consumed} label="Bottles Consumed" />
              <Metric icon={<IconGlobe />} value={stats.uniqueRegions} label="Regions Explored" />
              <Metric icon={<IconCalendar />} value={stats.avgDaysBetween > 0 ? `${Math.round(stats.avgDaysBetween)}` : "—"} label="Days Between" />
              <Metric icon={<IconGrape />} value={stats.avgRating || "—"} label="Avg Rating" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-3">Top Countries</p>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-3">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={56} paddingAngle={2} strokeWidth={0}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {pieData.map((c, i) => {
                      const pct = ((c.count / (stats.total || 1)) * 100).toFixed(0);
                      return (
                        <div key={c.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
                            <span className="text-text-secondary truncate">{c.name}</span>
                          </div>
                          <span className="text-text-tertiary tabular-nums">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-text-muted text-center py-6">No data yet</p>
              )}
            </div>

            <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-3">Consumption Over Time</p>
              {monthlyData.some((m) => m.count > 0) ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fill: "#75676a", fontSize: 10 }} tickFormatter={monthLabel} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((_, i) => (
                        <Cell key={i} fill={i === monthlyData.length - 1 ? "#d4b87a" : "#b73a5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[12px] text-text-muted text-center py-6">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-pink">{icon}</div>
      </div>
      <p className="font-serif text-[24px] font-semibold leading-none">{value}</p>
      <p className="text-[10.5px] text-text-tertiary mt-1">{label}</p>
    </div>
  );
}

const CellarIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-gold">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path strokeLinecap="round" d="M4 9h16M4 15h16M9 3v18M15 3v18" />
  </svg>
);

const IconBottle = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6v3a3 3 0 002 3v11a3 3 0 01-3 3h-4a3 3 0 01-3-3V8a3 3 0 002-3V2z" />
  </svg>
);
const IconGlobe = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
  </svg>
);
const IconCalendar = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
const IconGrape = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 0c-2 0-4 2-4 4s2 4 4 4 4-2 4-4-2-4-4-4zM6 12c-2 0-3 2-3 4s2 4 4 4 4-2 4-4M14 16c0 2 2 4 4 4s4-2 4-4-2-4-3-4" />
  </svg>
);
