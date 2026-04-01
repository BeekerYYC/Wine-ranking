"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import StarRating from "@/components/StarRating";

export default function AddWine() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    winery: "",
    vintage: "",
    varietal: "",
    region: "",
    country: "",
    color: "",
    price: "",
    rating: 0,
    notes: "",
    description: "",
  });

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCapture = async (data: string) => {
    setImageData(data);
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const info = await res.json();
      setForm((f) => ({
        ...f,
        name: info.name || f.name,
        winery: info.winery || f.winery,
        vintage: info.vintage?.toString() || f.vintage,
        varietal: info.varietal || f.varietal,
        region: info.region || f.region,
        country: info.country || f.country,
        color: info.color || f.color,
        description: info.description || f.description,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/wines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageData }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const wine = await res.json();
      router.push(`/wine/${wine.id}`);
    } catch {
      setError("Failed to save wine");
      setSaving(false);
    }
  };

  const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Wine</h1>

      {/* Camera */}
      {!imageData ? (
        <CameraCapture onCapture={handleCapture} />
      ) : (
        <div className="relative mb-4">
          <img
            src={imageData}
            alt="Wine label"
            className="w-full max-h-64 object-contain rounded-xl border border-stone-200"
          />
          <button
            type="button"
            onClick={() => {
              setImageData(null);
              setForm((f) => ({ ...f, description: "" }));
            }}
            className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/70"
          >
            ×
          </button>
        </div>
      )}

      {analyzing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mb-2" />
          <p className="text-amber-800 font-medium">Analyzing wine label...</p>
          <p className="text-sm text-amber-600">
            Using AI to extract wine details
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Wine Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Opus One 2019"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Winery
            </label>
            <input
              type="text"
              value={form.winery}
              onChange={(e) => set("winery", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Vintage
            </label>
            <input
              type="number"
              value={form.vintage}
              onChange={(e) => set("vintage", e.target.value)}
              placeholder="2020"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Varietal
            </label>
            <input
              type="text"
              value={form.varietal}
              onChange={(e) => set("varietal", e.target.value)}
              placeholder="Cabernet Sauvignon"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Color
            </label>
            <select
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select...</option>
              {colors.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Region
            </label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              placeholder="Napa Valley"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="USA"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Price
          </label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="29.99"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Rating
          </label>
          <StarRating
            rating={form.rating}
            onChange={(r) => set("rating", r)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Tasting Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Your personal tasting notes..."
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {form.description && (
          <div className="bg-stone-100 rounded-xl p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-1">
              AI Description
            </h3>
            <p className="text-sm text-stone-600">{form.description}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!form.name.trim() || saving}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white py-3 rounded-xl font-medium transition-colors"
        >
          {saving ? "Saving..." : "Save Wine"}
        </button>
      </form>
    </div>
  );
}
