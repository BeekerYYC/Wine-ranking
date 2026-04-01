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

const CHART_COLORS = ["#c084fc", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#f97316", "#a78bfa", "#fb7185"];
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", white: "#fef08a", "rosé": "#f9a8d4", sparkling: "#7dd3fc", dessert: "#fbbf24", orange: "#fb923c",
};
const tooltipStyle = { backgroundColor: "#1f1f23", border: "1px solid #2e2e33", borderRadius: "8px", color: "#fafaf9", fontSize: "12px" };

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/stats").then((r) => r.json()).then(setStats); }, []);

  if (!stats) return <div className="text-center py-16 text-text-tertiary text-sm">Loading...</div>;
  if (stats.total === 0) return (
    <div className="text-center py-20">
      <p className="text-4xl mb-4 opacity-30">&#128202;</p>
      <h2 className="text-lg font-semibold mb-2">No data yet</h2>
      <p className="text-sm text-text-tertiary mb-6">Add wines to see your dashboard</p>
      <a href="/add" className="inline-block bg-accent/90 hover:bg-accent text-surface px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Add Wine</a>
    </div>
  );

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-surface-raised rounded-xl border border-border p-4">
      <p className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Wine of the Day */}
      {stats.wineOfDay && (
        <a href={`/wine/${stats.wineOfDay.id}`} className="block bg-surface-raised rounded-xl border border-border p-4 hover:border-accent/20 transition-all">
          <p className="text-[10px] text-accent uppercase tracking-widest font-medium mb-2">Wine of the day</p>
          <div className="flex items-center gap-3">
            {stats.wineOfDay.imageData ? (
              <img src={stats.wineOfDay.imageData} alt="" className="w-10 h-14 object-cover rounded-lg" />
            ) : (
              <div className="w-10 h-14 bg-surface-overlay rounded-lg flex items-center justify-center text-lg opacity-40">&#127863;</div>
            )}
            <div>
              <h3 className="font-medium text-[15px]">{stats.wineOfDay.name} {stats.wineOfDay.vintage && <span className="text-text-tertiary">({stats.wineOfDay.vintage})</span>}</h3>
              {stats.wineOfDay.winery && <p className="text-[13px] text-text-secondary">{stats.wineOfDay.winery}</p>}
              {stats.wineOfDay.rating > 0 && <p className="text-[12px] text-warm mt-0.5">{"★".repeat(stats.wineOfDay.rating)}</p>}
            </div>
          </div>
        </a>
      )}

      {/* On This Day */}
      {stats.onThisDay.length > 0 && (
        <div className="bg-surface-raised rounded-xl border border-border p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-2">On this day</p>
          {stats.onThisDay.map((w) => (
            <a key={w.id} href={`/wine/${w.id}`} className="block text-[13px] text-text-secondary hover:text-text-primary transition-colors">
              {new Date(w.createdAt).getFullYear()}: {w.name} {w.rating ? <span className="text-warm">{"★".repeat(w.rating)}</span> : ""}
            </a>
          ))}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total wines" value={stats.total} />
        <Stat label="In cellar" value={`${stats.inCollection} btl`} />
        <Stat label="Avg rating" value={`${stats.avgRating}`} sub="out of 5" />
        <Stat label="Avg price" value={`$${stats.avgPrice}`} />
        <Stat label="Total spent" value={`$${stats.totalSpent.toLocaleString()}`} />
        <Stat label="Consumed" value={stats.consumed} />
        <Stat label="Wishlist" value={stats.wishlist} />
        <Stat label="Pace" value={stats.avgDaysBetween > 0 ? `${stats.avgDaysBetween}d` : "—"} sub="between bottles" />
      </div>

      {/* Discovery */}
      <div className="bg-surface-raised rounded-xl border border-border p-4">
        <p className="text-[10px] text-accent uppercase tracking-widest font-medium mb-3">Discovery score</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-semibold text-accent tabular-nums">{stats.uniqueVarietals}</p><p className="text-[11px] text-text-tertiary">Varietals</p></div>
          <div><p className="text-2xl font-semibold text-accent tabular-nums">{stats.uniqueRegions}</p><p className="text-[11px] text-text-tertiary">Regions</p></div>
          <div><p className="text-2xl font-semibold text-accent tabular-nums">{stats.uniqueCountries}</p><p className="text-[11px] text-text-tertiary">Countries</p></div>
        </div>
      </div>

      {/* Top Wines & Best Value side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.topWines.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Top rated</p>
            {stats.topWines.slice(0, 5).map((w, i) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-2 py-1.5 text-[13px] hover:bg-surface-overlay -mx-2 px-2 rounded-lg transition-colors">
                <span className="text-text-tertiary w-4 tabular-nums">{i + 1}</span>
                <span className="flex-1 text-text-secondary truncate">{w.name}</span>
                <span className="text-warm text-[12px]">{"★".repeat(w.rating || 0)}</span>
              </a>
            ))}
          </div>
        )}
        {stats.bestValue.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Best value</p>
            {stats.bestValue.map((w) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-2 py-1.5 text-[13px] hover:bg-surface-overlay -mx-2 px-2 rounded-lg transition-colors">
                <span className="flex-1 text-text-secondary truncate">{w.name}</span>
                <span className="text-warm text-[12px]">{"★".repeat(w.rating || 0)}</span>
                <span className="text-text-tertiary tabular-nums">${w.price}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.colorBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">By color</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={stats.colorBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={0} label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                {stats.colorBreakdown.map((e) => <Cell key={e.name} fill={COLOR_MAP[e.name] || "#6b7280"} />)}
              </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.varietalBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Top varietals</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.varietalBreakdown.slice(0, 5)} layout="vertical">
                <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fill: "#a8a29e", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#c084fc" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.ratingDist.some((r) => r.count > 0) && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Ratings</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.ratingDist}><XAxis dataKey="rating" tick={{ fill: "#a8a29e", fontSize: 11 }} tickFormatter={(v) => `${v}★`} /><YAxis hide />
                <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {stats.countryBreakdown.length > 0 && (
          <div className="bg-surface-raised rounded-xl border border-border p-4">
            <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">By country</p>
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
        <div className="bg-surface-raised rounded-xl border border-border p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Price vs rating</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#2e2e33" />
              <XAxis dataKey="price" name="Price" unit="$" tick={{ fill: "#a8a29e", fontSize: 11 }} />
              <YAxis dataKey="rating" name="Rating" domain={[0, 5]} tick={{ fill: "#a8a29e", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} /><Scatter data={stats.priceRating} fill="#c084fc" /></ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly trend */}
      {stats.monthlyAdditions.length > 1 && (
        <div className="bg-surface-raised rounded-xl border border-border p-4">
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-3">Monthly additions</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.monthlyAdditions}><CartesianGrid strokeDasharray="3 3" stroke="#2e2e33" />
              <XAxis dataKey="month" tick={{ fill: "#a8a29e", fontSize: 10 }} /><YAxis hide />
              <Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="count" stroke="#c084fc" strokeWidth={2} dot={{ fill: "#c084fc", r: 3 }} /></LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
