"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import StarRating from "@/components/StarRating";
import { useCategory } from "@/lib/CategoryContext";

const occasions = ["date-night", "weeknight", "party", "gift", "celebration", "casual"];
const statusOptions = [
  { value: "collection", label: "In my collection" },
  { value: "wishlist", label: "Wishlist" },
  { value: "consumed", label: "Consumed" },
  { value: "restaurant", label: "Had at restaurant" },
];

export default function AddWine() {
  const router = useRouter();
  const { category, config } = useCategory();
  const [imageData, setImageData] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [lists, setLists] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    name: "", winery: "", vintage: "", varietal: "", region: "", country: "",
    color: "", price: "", rating: 0, notes: "", description: "", quantity: "1",
    status: "collection", storeName: "", occasion: [] as string[],
    foodPairings: "", onlineRating: "", confidence: "", listId: "",
    tastingNotes: "", drinkingWindow: "", criticReviews: "",
  });

  useEffect(() => {
    fetch("/api/stores").then((r) => r.json()).then(setStores);
    fetch("/api/lists").then((r) => r.json()).then(setLists);
  }, []);

  const set = (field: string, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCapture = async (data: string) => {
    setImageData(data);
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: data, category }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const info = await res.json();
      setForm((f) => ({
        ...f,
        name: info.name || f.name, winery: info.winery || f.winery,
        vintage: info.vintage?.toString() || f.vintage, varietal: info.varietal || f.varietal,
        region: info.region || f.region, country: info.country || f.country,
        color: info.color || f.color, description: info.description || f.description,
        foodPairings: info.foodPairings || f.foodPairings,
        onlineRating: info.onlineRating?.toString() || f.onlineRating,
        confidence: info.confidence?.toString() || f.confidence,
        tastingNotes: info.tastingNotes || f.tastingNotes,
        drinkingWindow: info.drinkingWindow || f.drinkingWindow,
        criticReviews: info.criticReviews || f.criticReviews,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleOccasion = (occ: string) => {
    setForm((f) => ({
      ...f,
      occasion: f.occasion.includes(occ) ? f.occasion.filter((o) => o !== occ) : [...f.occasion, occ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/wines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category, occasion: form.occasion.join(","), imageData }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const wine = await res.json();
      router.push(`/wine/${wine.id}`);
    } catch {
      setError(`Failed to save ${config.itemName}`);
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all";
  const labelClass = "block text-[12px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wider";

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Add {config.label}</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">Snap a label or enter details manually</p>
      </div>

      {!imageData ? (
        <CameraCapture onCapture={handleCapture} />
      ) : (
        <div className="relative mb-5 group">
          <img src={imageData} alt="Label" className="w-full max-h-52 object-contain rounded-xl border border-border-subtle" />
          <button
            type="button"
            onClick={() => { setImageData(null); setForm((f) => ({ ...f, description: "", foodPairings: "", onlineRating: "" })); }}
            className="absolute top-2 right-2 bg-bg/80 backdrop-blur-sm text-text-secondary w-7 h-7 rounded-full flex items-center justify-center hover:text-text-primary text-sm transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {analyzing && (
        <div className="bg-gold-muted border border-gold/15 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-gold border-t-transparent rounded-full flex-shrink-0" />
          <div>
            <p className="text-[13px] text-text-primary font-medium">Analyzing label...</p>
            <p className="text-[11px] text-text-tertiary">Extracting {config.itemName} details with AI</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-5">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-5">
        {/* Name */}
        <div>
          <label className={labelClass}>{config.label} name <span className="text-gold">*</span></label>
          <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={`e.g. ${category === "wine" ? "Opus One 2019" : category === "coffee" ? "Ethiopian Yirgacheffe" : "Hazy IPA"}`} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{config.producerLabel}</label><input type="text" value={form.winery} onChange={(e) => set("winery", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>{config.vintageLabel}</label><input type={category === "wine" ? "number" : "text"} value={form.vintage} onChange={(e) => set("vintage", e.target.value)} placeholder={category === "wine" ? "2020" : ""} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>{config.varietalLabel}</label><input type="text" value={form.varietal} onChange={(e) => set("varietal", e.target.value)} placeholder={category === "wine" ? "Cabernet Sauvignon" : category === "coffee" ? "Colombia" : "IPA"} className={inputClass} /></div>
          <div>
            <label className={labelClass}>{config.colorLabel}</label>
            <select value={form.color} onChange={(e) => set("color", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {config.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Region</label><input type="text" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder={category === "wine" ? "Napa Valley" : category === "coffee" ? "Sidamo" : "Portland, OR"} className={inputClass} /></div>
          <div><label className={labelClass}>Country</label><input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelClass}>Price</label><input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="29.99" className={inputClass} /></div>
          <div><label className={labelClass}>Qty</label><input type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass}>
              {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Store</label>
          <input type="text" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} list="store-list" placeholder="Where purchased..." className={inputClass} />
          <datalist id="store-list">{stores.map((s) => <option key={s.id} value={s.name} />)}</datalist>
        </div>

        {lists.length > 0 && (
          <div>
            <label className={labelClass}>List</label>
            <select value={form.listId} onChange={(e) => set("listId", e.target.value)} className={inputClass}>
              <option value="">No list</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Occasion</label>
          <div className="flex flex-wrap gap-1.5">
            {occasions.map((occ) => (
              <button key={occ} type="button" onClick={() => toggleOccasion(occ)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize ${
                  form.occasion.includes(occ)
                    ? "bg-gold-muted text-gold ring-1 ring-gold/20"
                    : "text-text-muted bg-surface-raised border border-border-subtle hover:text-text-tertiary"
                }`}>
                {occ}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`${labelClass} mb-2`}>Rating</label>
          <StarRating rating={form.rating} onChange={(r) => set("rating", r)} />
        </div>

        <div>
          <label className={labelClass}>Tasting notes</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Your impressions..." className={`${inputClass} resize-none`} />
        </div>

        {/* AI results */}
        {(form.onlineRating || form.foodPairings || form.description || form.confidence) && (
          <div className="bg-surface-raised rounded-xl border border-border-subtle p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gold-muted flex items-center justify-center">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gold">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">AI Analysis</span>
              {form.confidence && (() => {
                const c = parseFloat(form.confidence);
                return (
                  <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                    c >= 0.8 ? "text-success bg-success-muted" : c >= 0.5 ? "text-gold bg-gold-muted" : "text-danger bg-danger-muted"
                  }`}>{Math.round(c * 100)}% confident</span>
                );
              })()}
            </div>
            {form.onlineRating && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-muted">Est. Score</span>
                <span className="text-lg font-bold text-gold tabular-nums">{form.onlineRating}<span className="text-[11px] text-text-tertiary font-normal">/100</span></span>
              </div>
            )}
            {form.criticReviews && (
              <div>
                <p className="text-[11px] text-text-muted mb-1">Critic Reviews</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">{form.criticReviews}</p>
              </div>
            )}
            {form.tastingNotes && (
              <div>
                <p className="text-[11px] text-text-muted mb-1">Tasting Profile</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">{form.tastingNotes}</p>
              </div>
            )}
            {form.drinkingWindow && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Drink Window</span>
                <span className="text-[12px] text-text-secondary font-medium">{form.drinkingWindow}</span>
              </div>
            )}
            {form.foodPairings && (
              <div>
                <p className="text-[11px] text-text-muted mb-1">{config.pairingLabel}</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">{form.foodPairings}</p>
              </div>
            )}
            {form.description && (
              <div>
                <p className="text-[11px] text-text-muted mb-1">About</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">{form.description}</p>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!form.name.trim() || saving}
          className="w-full bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg py-2.5 rounded-lg text-[13px] font-semibold transition-all mt-2">
          {saving ? "Saving..." : `Save ${config.itemName}`}
        </button>
      </form>
    </div>
  );
}
