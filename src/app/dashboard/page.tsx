"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ScatterChart, Scatter, CartesianGrid, ResponsiveContainer, LineChart, Line,
} from "recharts";

interface Stats {
  total: number; totalBottles: number; inCollection: number; consumed: number;
  wishlist: number; avgRating: number; avgPrice: number; totalSpent: number;
  avgDaysBetween: number;
  varietalBreakdown: { name: string; count: number }[];
  colorBreakdown: { name: string; count: number }[];
  countryBreakdown: { name: string; count: number }[];
  priceRating: { name: string; price: number; rating: number }[];
  monthlyAdditions: { month: string; count: number }[];
  ratingDist: { rating: number; count: number }[];
  topWines: { id: number; name: string; rating: number; winery: string; vintage: number }[];
  bestValue: { id: number; name: string; rating: number; price: number; winery: string }[];
  uniqueVarietals: number; uniqueRegions: number; uniqueCountries: number;
  wineOfDay: { id: number; name: string; winery: string; rating: number; imageData: string; color: string; vintage: number } | null;
  onThisDay: { id: number; name: string; winery: string; createdAt: string; rating: number }[];
}

const CHART_COLORS = ["#c9a962", "#d4849a", "#7abed4", "#5a9e6f", "#d48a4e", "#c75050", "#e4c87e", "#a09a8f"];
const COLOR_MAP: Record<string, string> = {
  red: "#c75050", white: "#e8dca0", "rosé": "#d4849a", sparkling: "#7abed4", dessert: "#d4a44e", orange: "#d48a4e",
};
const tooltipStyle = {
  backgroundColor: "#1a1a1e",
  border: "1px solid #2a2a30",
  borderRadius: "8px",
  color: "#f5f0e8",
  fontSize: "12px",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/stats").then((r) => r.json()).then(setStats); }, []);

  if (!stats) return (
    <div className="space-y-4 py-8 animate-pulse">
      <div className="h-8 bg-surface-raised rounded w-40" />
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-surface-raised rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => <div key={i} className="h-48 bg-surface-raised rounded-xl" />)}
      </div>
    </div>
  );

  if (stats.total === 0) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-4">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h4v8H3zM10 8h4v13h-4zM17 3h4v18h-4z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-1">No data yet</h2>
      <p className="text-[13px] text-text-tertiary mb-5">Add wines to see your dashboard</p>
      <a href="/add" className="inline-flex items-center gap-2 bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors">Add Wine</a>
    </div>
  );

  const Stat = ({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) => (
    <div className="bg-surface-raised rounded-xl border border-border-subtle px-3.5 py-3">
      <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${highlight ? "text-gold" : "text-text-primary"}`}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">Your collection at a glance</p>
      </div>

      {/* Wine of the Day */}
      {stats.wineOfDay && (
        <a href={`/wine/${stats.wineOfDay.id}`} className="block bg-surface-raised rounded-xl border border-border-subtle p-4 hover:border-border transition-all group">
          <p className="text-[10px] text-gold uppercase tracking-widest font-medium mb-2.5">Wine of the day</p>
          <div className="flex items-center gap-3">
            {stats.wineOfDay.imageData ? (
              <img src={stats.wineOfDay.imageData} alt="" className="w-10 h-14 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-14 bg-surface-overlay rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-text-muted">
                  <path d="M8 2h8l-1 9H9L8 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 11v6" strokeLinecap="round" /><path d="M8 21h8" strokeLinecap="round" /><path d="M10 17h4" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-[14px] group-hover:text-gold transition-colors">{stats.wineOfDay.name} {stats.wineOfDay.vintage && <span className="text-text-tertiary font-normal">({stats.wineOfDay.vintage})</span>}</h3>
              {stats.wineOfDay.winery && <p className="text-[12px] text-text-secondary">{stats.wineOfDay.winery}</p>}
              {stats.wineOfDay.rating > 0 && <p className="text-[12px] text-gold mt-0.5">{"★".repeat(stats.wineOfDay.rating)}</p>}
            </div>
          </div>
        </a>
      )}

      {/* On This Day */}
      {stats.onThisDay.length > 0 && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-2.5">On this day</p>
          {stats.onThisDay.map((w) => (
            <a key={w.id} href={`/wine/${w.id}`} className="block text-[12px] text-text-secondary hover:text-gold transition-colors py-0.5">
              {new Date(w.createdAt).getFullYear()}: {w.name} {w.rating ? <span className="text-gold">{"★".repeat(w.rating)}</span> : ""}
            </a>
          ))}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total wines" value={stats.total} />
        <Stat label="In cellar" value={`${stats.inCollection} btl`} />
        <Stat label="Avg rating" value={stats.avgRating || "—"} sub="out of 5" highlight />
        <Stat label="Avg price" value={`$${stats.avgPrice}`} />
        <Stat label="Total spent" value={`$${stats.totalSpent.toLocaleString()}`} />
        <Stat label="Consumed" value={stats.consumed} />
        <Stat label="Wishlist" value={stats.wishlist} />
        <Stat label="Pace" value={stats.avgDaysBetween > 0 ? `${stats.avgDaysBetween}d` : "—"} sub="between bottles" />
      </div>

      {/* Discovery */}
      <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
        <p className="text-[10px] text-gold uppercase tracking-widest font-medium mb-3">Discovery score</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-gold tabular-nums">{stats.uniqueVarietals}</p><p className="text-[10px] text-text-muted uppercase tracking-wider">Varietals</p></div>
          <div><p className="text-2xl font-bold text-gold tabular-nums">{stats.uniqueRegions}</p><p className="text-[10px] text-text-muted uppercase tracking-wider">Regions</p></div>
          <div><p className="text-2xl font-bold text-gold tabular-nums">{stats.uniqueCountries}</p><p className="text-[10px] text-text-muted uppercase tracking-wider">Countries</p></div>
        </div>
      </div>

      {/* Top Wines & Best Value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {stats.topWines.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Top rated</p>
            {stats.topWines.slice(0, 5).map((w, i) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-2 py-1.5 text-[12px] hover:bg-surface-overlay -mx-2 px-2 rounded-lg transition-colors">
                <span className="text-text-muted w-4 tabular-nums text-[11px]">{i + 1}</span>
                <span className="flex-1 text-text-secondary truncate">{w.name}</span>
                <span className="text-gold text-[11px]">{"★".repeat(w.rating || 0)}</span>
              </a>
            ))}
          </div>
        )}
        {stats.bestValue.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Best value</p>
            {stats.bestValue.map((w) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-2 py-1.5 text-[12px] hover:bg-surface-overlay -mx-2 px-2 rounded-lg transition-colors">
                <span className="flex-1 text-text-secondary truncate">{w.name}</span>
                <span className="text-gold text-[11px]">{"★".repeat(w.rating || 0)}</span>
                <span className="text-text-muted tabular-nums text-[11px]">${w.price}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {stats.colorBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">By color</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={stats.colorBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0} label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                {stats.colorBreakdown.map((e) => <Cell key={e.name} fill={COLOR_MAP[e.name] || "#6b665e"} />)}
              </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.varietalBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Top varietals</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.varietalBreakdown.slice(0, 5)} layout="vertical">
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fill: "#6b665e", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#c9a962" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.ratingDist.some((r) => r.count > 0) && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Ratings</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.ratingDist}><XAxis dataKey="rating" tick={{ fill: "#6b665e", fontSize: 11 }} tickFormatter={(v) => `${v}★`} /><YAxis hide />
                <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#c9a962" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.countryBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">By country</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={stats.countryBreakdown.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0} label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                {stats.countryBreakdown.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Price vs Rating */}
      {stats.priceRating.length > 0 && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Price vs rating</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#222226" />
              <XAxis dataKey="price" name="Price" unit="$" tick={{ fill: "#6b665e", fontSize: 11 }} />
              <YAxis dataKey="rating" name="Rating" domain={[0, 5]} tick={{ fill: "#6b665e", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} /><Scatter data={stats.priceRating} fill="#c9a962" /></ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly trend */}
      {stats.monthlyAdditions.length > 1 && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-4">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Monthly additions</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.monthlyAdditions}><CartesianGrid strokeDasharray="3 3" stroke="#222226" />
              <XAxis dataKey="month" tick={{ fill: "#6b665e", fontSize: 10 }} /><YAxis hide />
              <Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="count" stroke="#c9a962" strokeWidth={2} dot={{ fill: "#c9a962", r: 3 }} /></LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
