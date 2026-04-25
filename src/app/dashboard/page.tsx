"use client";

import { useEffect, useState } from "react";
import { useCategory } from "@/lib/CategoryContext";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line,
} from "recharts";

interface Activity {
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
  timestamp: string;
}

interface Stats {
  total: number;
  totalBottles: number;
  inCollection: number;
  consumed: number;
  consumedBottles: number;
  wishlist: number;
  avgRating: number;
  avgPrice: number;
  totalSpent: number;
  avgDaysBetween: number;
  uniqueVarietals: number;
  uniqueRegions: number;
  uniqueCountries: number;
  varietalBreakdown: { name: string; count: number }[];
  colorBreakdown: { name: string; count: number }[];
  countryBreakdown: { name: string; count: number }[];
  monthlyAdditions: { month: string; count: number }[];
  topWines: { id: number; name: string; winery: string; rating: number; vintage: number }[];
  recentActivity: Activity[];
}

const REGION_COLORS = ["#b73a5e", "#e0617e", "#d4849a", "#8a3f5a", "#6b2d40", "#3d1d28"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Map a wine's color/varietal to taste profile dimensions (rough heuristic)
const VARIETAL_TASTE: Record<string, Partial<Record<"Fruity" | "Bold" | "Dry" | "Earthy" | "Light" | "Floral", number>>> = {
  "Cabernet Sauvignon": { Bold: 5, Earthy: 4, Dry: 3 },
  "Merlot": { Fruity: 4, Bold: 3, Earthy: 2 },
  "Pinot Noir": { Light: 4, Earthy: 3, Floral: 2, Fruity: 3 },
  "Syrah": { Bold: 5, Earthy: 4 },
  "Shiraz": { Bold: 5, Earthy: 3, Fruity: 3 },
  "Malbec": { Bold: 4, Fruity: 3, Earthy: 3 },
  "Chardonnay": { Light: 3, Floral: 2, Dry: 3 },
  "Sauvignon Blanc": { Light: 4, Floral: 3, Dry: 4 },
  "Riesling": { Floral: 5, Fruity: 4, Light: 3 },
  "Sangiovese": { Earthy: 4, Dry: 3, Bold: 3 },
  "Champagne": { Light: 5, Floral: 3, Dry: 4 },
  "Tempranillo": { Bold: 3, Earthy: 4, Fruity: 2 },
};
const COLOR_TASTE: Record<string, Partial<Record<"Fruity" | "Bold" | "Dry" | "Earthy" | "Light" | "Floral", number>>> = {
  red: { Bold: 3, Earthy: 2 },
  white: { Light: 3, Floral: 2 },
  "rosé": { Fruity: 3, Light: 2 },
  rose: { Fruity: 3, Light: 2 },
  sparkling: { Light: 4, Dry: 2 },
  dessert: { Fruity: 5, Floral: 2 },
  orange: { Earthy: 3, Dry: 2 },
};

function buildTasteProfile(varietalBreakdown: { name: string; count: number }[], colorBreakdown: { name: string; count: number }[]) {
  const dims = ["Fruity", "Bold", "Dry", "Earthy", "Light", "Floral"] as const;
  const totals: Record<string, number> = {};
  dims.forEach((d) => { totals[d] = 0; });

  varietalBreakdown.forEach((v) => {
    const taste = VARIETAL_TASTE[v.name];
    if (taste) {
      Object.entries(taste).forEach(([dim, score]) => {
        totals[dim] = (totals[dim] || 0) + (score || 0) * v.count;
      });
    }
  });
  colorBreakdown.forEach((c) => {
    const taste = COLOR_TASTE[c.name];
    if (taste) {
      Object.entries(taste).forEach(([dim, score]) => {
        totals[dim] = (totals[dim] || 0) + (score || 0) * c.count;
      });
    }
  });

  const max = Math.max(...Object.values(totals), 1);
  return dims.map((d) => ({
    dimension: d,
    value: Math.round((totals[d] / max) * 100),
  }));
}

function buildAiInsight(stats: Stats, taste: { dimension: string; value: number }[]): string {
  const top = stats.countryBreakdown.slice(0, 2).map((c) => c.name);
  const dominantTaste = [...taste].sort((a, b) => b.value - a.value).slice(0, 2).map((t) => t.dimension.toLowerCase());
  if (top.length === 0) return "Add more wines to see your taste profile.";
  const explore = ["Austria", "Portugal", "Greece", "Lebanon", "South Africa"].filter((c) => !top.includes(c))[0];
  return `You're enjoying ${dominantTaste.join(" and ")} wines from ${top.join(" and ")}. Try exploring some lighter reds from ${explore}.`;
}

function formatRelativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? "s" : ""} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? "s" : ""} ago`;
}

export default function Dashboard() {
  const { config } = useCategory();
  const [stats, setStats] = useState<Stats | null>(null);
  const [period, setPeriod] = useState<"month" | "all">("month");

  useEffect(() => {
    setStats(null);
    fetch("/api/wines/fix-consumed", { method: "POST" }).then(() => {
      fetch(`/api/stats`).then((r) => r.json()).then(setStats);
    });
  }, []);

  if (!stats) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-surface-raised rounded w-2/3" />
      <div className="h-40 bg-surface-raised rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-56 bg-surface-raised rounded-2xl" />
        <div className="h-56 bg-surface-raised rounded-2xl" />
      </div>
    </div>
  );

  if (stats.total === 0) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4 text-3xl">{config.icon}</div>
      <h2 className="font-serif text-[22px] font-semibold mb-1">No data yet</h2>
      <p className="text-[13px] text-text-tertiary mb-5">Add {config.itemNamePlural} to see your insights</p>
      <a href="/fridge/scan" className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-light text-bg px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all shadow-lg shadow-gold/20">
        Scan {config.itemNamePlural}
      </a>
    </div>
  );

  const taste = buildTasteProfile(stats.varietalBreakdown, stats.colorBreakdown);
  const insight = buildAiInsight(stats, taste);
  const monthlyData = stats.monthlyAdditions?.slice(-6) || [];
  const topCountries = stats.countryBreakdown.slice(0, 5);
  const totalCountryCount = topCountries.reduce((s, c) => s + c.count, 0);
  const otherCount = stats.total - totalCountryCount;
  const pieData = otherCount > 0 ? [...topCountries, { name: "Others", count: otherCount }] : topCountries;

  // Build a sparkline of avgDaysBetween from consumption logs - approximate from monthly
  const paceSparkline = monthlyData.length > 0 ? monthlyData.map((m, i) => ({ x: i, y: m.count })) : [];

  return (
    <div className="space-y-5 pb-2">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-semibold leading-tight">
            {getGreeting()} <span className="text-pink">🍷</span>
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1">Here&apos;s your wine journey at a glance.</p>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {/* Overview card */}
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[18px] font-semibold">Overview</h2>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "month" | "all")}
            className="bg-surface-overlay border border-border-subtle text-[12px] text-text-secondary rounded-lg px-2.5 py-1 focus:outline-none focus:border-gold/30 cursor-pointer"
          >
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <OverviewMetric icon={<IconBottle />} value={stats.inCollection} label="Wines in Cellar" delta={`+${monthlyData[monthlyData.length - 1]?.count || 0} this week`} />
          <OverviewMetric icon={<IconWineGlass />} value={stats.consumedBottles ?? stats.consumed} label="Bottles Consumed" delta={`+${monthlyData[monthlyData.length - 1]?.count || 0} this month`} />
          <OverviewMetric icon={<IconGrape />} value={stats.uniqueRegions} label="Regions" delta={stats.uniqueCountries > 0 ? `${stats.uniqueCountries} countries` : ""} />
          <OverviewMetric icon={<IconTag />} value={`$${stats.totalSpent.toLocaleString()}`} label="Est. Collection Value" delta={`Avg $${Math.round(stats.avgPrice)}`} />
        </div>
      </div>

      {/* Consumption over time + Top regions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-[15px] font-semibold">Consumption Over Time</h3>
            <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-surface-overlay">6M</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#75676a", fontSize: 11 }}
                  tickFormatter={(v) => {
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const m = parseInt(v.slice(5), 10) - 1;
                    return months[m] || v;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={i === monthlyData.length - 1 ? "#d4b87a" : "#b73a5e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12px] text-text-muted text-center py-12">No data yet</p>
          )}
        </div>

        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
          <h3 className="font-serif text-[15px] font-semibold mb-3">Top Regions</h3>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={62} paddingAngle={2} strokeWidth={0}>
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
        </div>
      </div>

      {/* Taste profile + AI Insight */}
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
        <h3 className="font-serif text-[15px] font-semibold mb-3">Taste Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={taste}>
              <PolarGrid stroke="#2a1d22" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#a8a09a", fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke="#b73a5e" fill="#b73a5e" fillOpacity={0.4} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="bg-surface-overlay border border-gold/15 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-cream">✨</span>
              <span className="text-[13px] font-semibold text-cream">AI Insight</span>
            </div>
            <p className="text-[12.5px] text-text-secondary leading-relaxed mb-3">{insight}</p>
            <a href="/fridge/drink" className="inline-flex items-center gap-1.5 bg-cream/15 hover:bg-cream/25 text-cream border border-cream/20 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all">
              Explore Recommendations
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Average time between bottles */}
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
        <h3 className="font-serif text-[15px] font-semibold mb-3">Average Time Between Bottles</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-muted border border-pink/15 flex items-center justify-center text-pink">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" />
              </svg>
            </div>
            <div>
              <p className="font-serif text-[28px] font-semibold leading-none tabular-nums">
                {stats.avgDaysBetween > 0 ? Math.round(stats.avgDaysBetween) : "—"}
                <span className="text-[14px] text-text-tertiary ml-1.5 font-normal">Days</span>
              </p>
              <p className="text-[11px] text-success mt-1">Tracking your pace</p>
            </div>
          </div>
          <div className="flex-1 h-12">
            {paceSparkline.length > 1 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paceSparkline}>
                  <Line type="monotone" dataKey="y" stroke="#e0617e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-[15px] font-semibold">Recent Activity</h3>
            <a href="/fridge" className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1">
              See all
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="space-y-2">
            {stats.recentActivity.slice(0, 5).map((act) => (
              <a
                key={act.id}
                href={`/wine/${act.wineId}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-surface-overlay transition-colors"
              >
                <div className="w-10 h-12 flex-shrink-0 flex items-center justify-center bg-surface-overlay rounded-lg">
                  {act.imageData || act.labelImageUrl ? (
                    <img src={act.imageData || act.labelImageUrl || ""} alt="" className="h-full object-contain" />
                  ) : (
                    <span className="text-lg opacity-40">🍷</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[13.5px] font-semibold text-text-primary truncate">
                    {act.winery ? `${act.winery} ${act.name}` : act.name} {act.vintage && <span className="font-normal text-text-tertiary">{act.vintage}</span>}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {act.type === "consumed" ? "Consumed" : "Added to cellar"} {formatRelativeTime(act.timestamp)}
                    {act.region && ` · ${act.region}`}{act.country && `, ${act.country}`}
                    {act.color && ` · ${act.color.charAt(0).toUpperCase() + act.color.slice(1)}`}
                  </p>
                </div>
                {(act.onlineRating || act.rating) && (
                  <div className="flex-shrink-0 bg-pink-muted border border-pink/20 rounded-md px-2 py-1">
                    <span className="text-[12px] font-bold text-pink tabular-nums">
                      {act.onlineRating ? Math.round(act.onlineRating) : (act.rating || 0) * 20}
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewMetric({ icon, value, label, delta }: { icon: React.ReactNode; value: string | number; label: string; delta?: string }) {
  return (
    <div>
      <div className="text-pink mb-1.5">{icon}</div>
      <p className="font-serif text-[26px] font-semibold leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-text-tertiary mt-1">{label}</p>
      {delta && <p className="text-[10px] text-success mt-1">{delta}</p>}
    </div>
  );
}

const IconBottle = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6v3a3 3 0 002 3v11a3 3 0 01-3 3h-4a3 3 0 01-3-3V8a3 3 0 002-3V2z" />
  </svg>
);
const IconWineGlass = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10l-1 8a4 4 0 01-8 0L7 3zM12 15v6M8 21h8" />
  </svg>
);
const IconGrape = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M9 8a3 3 0 116 0 3 3 0 01-6 0zM6 13a3 3 0 116 0 3 3 0 01-6 0zM12 13a3 3 0 116 0 3 3 0 01-6 0zM9 18a3 3 0 116 0 3 3 0 01-6 0z" />
  </svg>
);
const IconTag = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M3 7v4l9 9 8-8-9-9H3z" />
  </svg>
);
