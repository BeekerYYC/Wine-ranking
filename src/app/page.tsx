"use client";

import { useEffect, useState } from "react";
import { useCategory } from "@/lib/CategoryContext";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

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
  imageData?: string | null;
  labelImageUrl?: string | null;
  tastingNotes?: string | null;
  criticReviews?: string | null;
  createdAt: string;
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
  monthlyAdditions: { month: string; count: number }[];
}

const REGION_COLORS = ["#b73a5e", "#e0617e", "#d4849a", "#c2185b", "#8a3f5a", "#6b2d40"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { config } = useCategory();
  const [wines, setWines] = useState<Wine[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`/api/wines?sort=createdAt&order=desc`)
      .then((r) => r.json())
      .then((data: Wine[]) => setWines(data.slice(0, 8)));
    fetch(`/api/stats`)
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const recentEnriched = wines.filter((w) => w.tastingNotes || w.criticReviews).slice(0, 6);
  const newThisWeek = wines.filter((w) => {
    const d = new Date(w.createdAt).getTime();
    return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Build top regions/countries data
  const topCountries = stats?.countryBreakdown?.slice(0, 5) || [];
  const totalCountryCount = topCountries.reduce((s, c) => s + c.count, 0);
  const otherCount = (stats?.total || 0) - totalCountryCount;
  const pieData = otherCount > 0
    ? [...topCountries, { name: "Others", count: otherCount }]
    : topCountries;

  // Last 6 months consumption
  const monthlyData = stats?.monthlyAdditions?.slice(-6) || [];

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
        <button className="relative w-10 h-10 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {newThisWeek > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink" />
          )}
        </button>
      </div>

      {/* Two feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fridge card */}
        <a
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
            <p className="font-serif text-[40px] font-semibold leading-none">{stats?.totalBottles ?? "—"}</p>
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
        </a>

        {/* Scan & Add card */}
        <a
          href="/fridge/scan"
          className="relative overflow-hidden rounded-2xl border border-gold/20 p-5 group transition-all hover:border-gold/40"
          style={{
            background: "linear-gradient(135deg, rgba(212,184,122,0.1) 0%, rgba(183,58,94,0.08) 60%, rgba(20,12,16,0.6) 100%)",
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-cream">✨</span>
              <span className="font-serif text-[18px] font-semibold">Scan & Add</span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed mb-4 max-w-[200px]">
              Snap a photo of your wine collection and let AI identify & enrich your wines.
            </p>
            <div className="inline-flex items-center gap-1.5 bg-cream/15 hover:bg-cream/25 text-cream border border-cream/20 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.82-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scan Cellar
            </div>
          </div>
        </a>
      </div>

      {/* AI Recently Added */}
      {recentEnriched.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[20px] font-semibold">AI Recently Added</h2>
            <a href="/fridge" className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1">
              See all
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {recentEnriched.map((wine) => (
              <a
                key={wine.id}
                href={`/wine/${wine.id}`}
                className="flex-shrink-0 w-[180px] rounded-2xl overflow-hidden bg-surface-raised border border-border-subtle hover:border-gold/30 transition-all group"
              >
                <div className="h-[160px] bg-gradient-to-br from-surface-overlay to-surface relative overflow-hidden flex items-center justify-center">
                  {wine.imageData || wine.labelImageUrl ? (
                    <img
                      src={wine.imageData || wine.labelImageUrl || ""}
                      alt={wine.name}
                      className="h-full object-contain"
                    />
                  ) : (
                    <span className="text-5xl opacity-40">🍷</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-serif text-[14px] font-semibold text-text-primary leading-tight line-clamp-2">
                    {wine.winery && `${wine.winery} `}{wine.name}
                  </h3>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    {[wine.region, wine.country].filter(Boolean).join(", ")} {wine.vintage && `• ${wine.vintage}`}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-cream">
                    <span>✨</span>
                    <span className="uppercase tracking-widest font-semibold">AI Enriched</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {stats && stats.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[20px] font-semibold">Your Wine Insights</h2>
            <a href="/dashboard" className="text-[12px] text-text-tertiary hover:text-gold transition-colors flex items-center gap-1">
              See all
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
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
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-3">Top Regions</p>
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
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="month" tick={{ fill: "#75676a", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
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

      {/* Discover with AI */}
      <a
        href="/fridge/drink"
        className="relative overflow-hidden rounded-2xl border border-gold/20 p-5 block transition-all hover:border-gold/40"
        style={{
          background: "linear-gradient(135deg, rgba(212,184,122,0.12) 0%, rgba(183,58,94,0.1) 50%, rgba(20,12,16,0.6) 100%)",
        }}
      >
        <div className="relative z-10 max-w-[60%]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-cream">✨</span>
            <h3 className="font-serif text-[18px] font-semibold">Discover with AI</h3>
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
            Get personalized wine recommendations based on your taste and collection.
          </p>
          <div className="inline-flex items-center gap-1.5 bg-cream/15 hover:bg-cream/25 text-cream border border-cream/20 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all">
            Get Recommendations
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        {/* Decorative wine glass illustration */}
        <div className="absolute right-4 bottom-0 top-0 w-32 flex items-center justify-end opacity-30 pointer-events-none">
          <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
            <path d="M20 10 Q20 35 40 40 Q60 35 60 10 Z" fill="#b73a5e" opacity="0.6" />
            <path d="M40 40 L40 80" stroke="#d4b87a" strokeWidth="2" />
            <path d="M25 88 L55 88" stroke="#d4b87a" strokeWidth="2" />
          </svg>
        </div>
      </a>
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
