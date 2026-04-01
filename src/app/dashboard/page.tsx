"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ScatterChart, Scatter, CartesianGrid, ResponsiveContainer, LineChart, Line,
} from "recharts";

interface Stats {
  total: number;
  totalBottles: number;
  inCollection: number;
  consumed: number;
  wishlist: number;
  avgRating: number;
  avgPrice: number;
  totalSpent: number;
  avgDaysBetween: number;
  varietalBreakdown: { name: string; count: number }[];
  colorBreakdown: { name: string; count: number }[];
  countryBreakdown: { name: string; count: number }[];
  regionBreakdown: { name: string; count: number }[];
  priceRating: { name: string; price: number; rating: number }[];
  monthlyAdditions: { month: string; count: number }[];
  ratingDist: { rating: number; count: number }[];
  topWines: { id: number; name: string; rating: number; winery: string; vintage: number }[];
  bestValue: { id: number; name: string; rating: number; price: number; winery: string }[];
  uniqueVarietals: number;
  uniqueRegions: number;
  uniqueCountries: number;
  wineOfDay: { id: number; name: string; winery: string; rating: number; imageData: string; color: string; vintage: number } | null;
  onThisDay: { id: number; name: string; winery: string; createdAt: string; rating: number }[];
}

const PIE_COLORS = ["#ab1d4a", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#10b981", "#6366f1"];
const COLOR_MAP: Record<string, string> = {
  red: "#991b1b", white: "#fef3c7", "rosé": "#fbcfe8", sparkling: "#bae6fd", dessert: "#fcd34d", orange: "#fb923c",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-center py-12 text-wine-600">Loading dashboard...</div>;

  if (stats.total === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-wine-200 mb-2">No data yet</h2>
        <p className="text-wine-500 mb-6">Add some wines to see your stats!</p>
        <a href="/add" className="inline-block bg-wine-700 hover:bg-wine-600 text-white px-6 py-3 rounded-xl font-medium transition-colors">Add Your First Wine</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-wine-100">Dashboard</h1>

      {/* Wine of the Day */}
      {stats.wineOfDay && (
        <a href={`/wine/${stats.wineOfDay.id}`} className="block bg-gradient-to-r from-wine-900 to-grape-900/50 border border-wine-700/40 rounded-xl p-4 hover:border-wine-600/60 transition-colors">
          <p className="text-xs text-wine-400 uppercase tracking-wide mb-2">Wine of the Day</p>
          <div className="flex items-center gap-4">
            {stats.wineOfDay.imageData ? (
              <img src={stats.wineOfDay.imageData} alt="" className="w-12 h-16 object-cover rounded-lg" />
            ) : (
              <div className="w-12 h-16 bg-wine-800/50 rounded-lg flex items-center justify-center text-xl">🍷</div>
            )}
            <div>
              <h3 className="font-semibold text-wine-100">{stats.wineOfDay.name} {stats.wineOfDay.vintage && `(${stats.wineOfDay.vintage})`}</h3>
              {stats.wineOfDay.winery && <p className="text-sm text-wine-300">{stats.wineOfDay.winery}</p>}
              {stats.wineOfDay.rating && <p className="text-sm text-amber-400">{"★".repeat(stats.wineOfDay.rating)}</p>}
            </div>
          </div>
        </a>
      )}

      {/* On This Day */}
      {stats.onThisDay.length > 0 && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
          <p className="text-xs text-wine-400 uppercase tracking-wide mb-2">On This Day</p>
          {stats.onThisDay.map((w) => (
            <a key={w.id} href={`/wine/${w.id}`} className="block text-sm text-wine-200 hover:text-wine-100">
              {new Date(w.createdAt).getFullYear()}: {w.name} {w.rating ? `${"★".repeat(w.rating)}` : ""}
            </a>
          ))}
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Wines", value: stats.total, icon: "🍷" },
          { label: "Bottles in Cellar", value: stats.inCollection, icon: "📦" },
          { label: "Avg Rating", value: `${stats.avgRating}/5`, icon: "⭐" },
          { label: "Avg Price", value: `$${stats.avgPrice}`, icon: "💰" },
          { label: "Total Spent", value: `$${stats.totalSpent.toLocaleString()}`, icon: "💸" },
          { label: "Consumed", value: stats.consumed, icon: "✅" },
          { label: "Wishlist", value: stats.wishlist, icon: "📝" },
          { label: "New Wine Every", value: stats.avgDaysBetween > 0 ? `${stats.avgDaysBetween}d` : "—", icon: "⏱️" },
        ].map((m) => (
          <div key={m.label} className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{m.icon}</div>
            <div className="text-lg font-bold text-wine-100">{m.value}</div>
            <div className="text-xs text-wine-500">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Discovery Score */}
      <div className="bg-gradient-to-r from-grape-900/40 to-wine-900/40 border border-grape-800/40 rounded-xl p-4">
        <h2 className="font-semibold text-grape-200 mb-3">Discovery Score</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-grape-300">{stats.uniqueVarietals}</div>
            <div className="text-xs text-grape-500">Varietals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-grape-300">{stats.uniqueRegions}</div>
            <div className="text-xs text-grape-500">Regions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-grape-300">{stats.uniqueCountries}</div>
            <div className="text-xs text-grape-500">Countries</div>
          </div>
        </div>
      </div>

      {/* Top Wines */}
      {stats.topWines.length > 0 && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
          <h2 className="font-semibold text-wine-200 mb-3">Your Top Wines</h2>
          <div className="space-y-2">
            {stats.topWines.map((w, i) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-3 text-sm hover:bg-wine-800/30 rounded-lg p-2 -mx-2 transition-colors">
                <span className="w-6 text-wine-500 font-medium">#{i + 1}</span>
                <span className="flex-1 text-wine-200 truncate">{w.name} {w.vintage ? `(${w.vintage})` : ""}</span>
                <span className="text-amber-400">{"★".repeat(w.rating || 0)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Best Value */}
      {stats.bestValue.length > 0 && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
          <h2 className="font-semibold text-wine-200 mb-3">Best Value Wines</h2>
          <div className="space-y-2">
            {stats.bestValue.map((w) => (
              <a key={w.id} href={`/wine/${w.id}`} className="flex items-center gap-3 text-sm hover:bg-wine-800/30 rounded-lg p-2 -mx-2 transition-colors">
                <span className="flex-1 text-wine-200 truncate">{w.name}</span>
                <span className="text-amber-400">{"★".repeat(w.rating || 0)}</span>
                <span className="text-wine-400">${w.price}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Color breakdown */}
        {stats.colorBreakdown.length > 0 && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h2 className="font-semibold text-wine-200 mb-3">By Color</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.colorBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {stats.colorBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={COLOR_MAP[entry.name] || "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Varietal breakdown */}
        {stats.varietalBreakdown.length > 0 && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h2 className="font-semibold text-wine-200 mb-3">Top Varietals</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.varietalBreakdown.slice(0, 6)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#f4a9bc", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} />
                <Bar dataKey="count" fill="#ab1d4a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rating distribution */}
        {stats.ratingDist.some((r) => r.count > 0) && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h2 className="font-semibold text-wine-200 mb-3">Rating Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.ratingDist}>
                <XAxis dataKey="rating" tick={{ fill: "#f4a9bc", fontSize: 12 }} tickFormatter={(v) => `${v}★`} />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Country breakdown */}
        {stats.countryBreakdown.length > 0 && (
          <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
            <h2 className="font-semibold text-wine-200 mb-3">By Country</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.countryBreakdown.slice(0, 8)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {stats.countryBreakdown.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Price vs Rating scatter */}
      {stats.priceRating.length > 0 && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
          <h2 className="font-semibold text-wine-200 mb-3">Price vs Rating</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#722040" />
              <XAxis dataKey="price" name="Price" unit="$" tick={{ fill: "#f4a9bc", fontSize: 12 }} />
              <YAxis dataKey="rating" name="Rating" domain={[0, 5]} tick={{ fill: "#f4a9bc", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={stats.priceRating} fill="#ec7696" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly additions trend */}
      {stats.monthlyAdditions.length > 1 && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-4">
          <h2 className="font-semibold text-wine-200 mb-3">Monthly Additions</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.monthlyAdditions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#722040" />
              <XAxis dataKey="month" tick={{ fill: "#f4a9bc", fontSize: 11 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: "#4a0c22", border: "1px solid #722040", borderRadius: "8px", color: "#fdf2f4" }} />
              <Line type="monotone" dataKey="count" stroke="#ab1d4a" strokeWidth={2} dot={{ fill: "#ec7696" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
