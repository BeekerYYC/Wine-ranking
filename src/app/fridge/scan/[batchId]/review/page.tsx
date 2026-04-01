"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ScanItem {
  id: number; status: string; imageData?: string | null;
  name?: string | null; winery?: string | null; vintage?: number | null;
  varietal?: string | null; region?: string | null; country?: string | null;
  color?: string | null; confidence?: number | null;
}

const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange"];

export default function ReviewPage() {
  const { batchId } = useParams();
  const router = useRouter();
  const [items, setItems] = useState<ScanItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(0);
  const [rejected, setRejected] = useState(0);

  useEffect(() => {
    fetch(`/api/scan/batch/${batchId}`)
      .then((r) => r.json())
      .then((data) => {
        const analyzed = data.items.filter((i: ScanItem) => i.status === "analyzed");
        setItems(analyzed);
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  const current = items[currentIndex];
  const isLast = currentIndex >= items.length - 1;

  const resetEdits = (item: ScanItem) => {
    setEdits({
      name: item.name || "", winery: item.winery || "",
      vintage: item.vintage?.toString() || "", varietal: item.varietal || "",
      region: item.region || "", country: item.country || "",
      color: item.color || "",
    });
  };

  useEffect(() => {
    if (current) resetEdits(current);
  }, [currentIndex, items]);

  const handleAction = async (action: "confirm" | "reject") => {
    await fetch(`/api/scan/batch/${batchId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          scanItemId: current.id,
          action,
          edits: action === "confirm" ? {
            name: edits.name, winery: edits.winery,
            vintage: edits.vintage ? parseInt(edits.vintage) : undefined,
            varietal: edits.varietal, region: edits.region,
            country: edits.country, color: edits.color,
          } : undefined,
        }],
      }),
    });

    if (action === "confirm") setConfirmed((c) => c + 1);
    else setRejected((c) => c + 1);

    if (isLast) {
      // All done
      setItems([]);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const inputClass = "w-full px-3 py-1.5 rounded-lg bg-surface border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all";
  const labelClass = "block text-[10px] text-text-muted uppercase tracking-wider font-medium mb-1";

  if (loading) return (
    <div className="max-w-lg mx-auto py-8 animate-pulse">
      <div className="h-6 bg-surface-raised rounded w-40 mb-4" />
      <div className="h-80 bg-surface-raised rounded-xl" />
    </div>
  );

  // Summary screen
  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-success-muted flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Review Complete</h1>
        <p className="text-[13px] text-text-tertiary mb-1">
          Added <span className="text-gold font-semibold">{confirmed}</span> bottle{confirmed !== 1 ? "s" : ""} to your fridge
        </p>
        {rejected > 0 && <p className="text-[12px] text-text-muted mb-6">{rejected} skipped</p>}
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors">
            View Fridge
          </button>
          <button onClick={() => router.push("/fridge/scan")} className="bg-surface-raised hover:bg-surface-overlay border border-border-subtle text-text-secondary px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all">
            Scan More
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const confPct = current.confidence ? Math.round(current.confidence * 100) : null;
  const confColor = confPct && confPct >= 80 ? "text-success" : confPct && confPct >= 50 ? "text-gold" : "text-danger";

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/fridge")} className="text-text-muted hover:text-text-secondary text-[12px] flex items-center gap-1.5 transition-colors">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Exit
        </button>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          {currentIndex + 1} of {items.length} bottles
        </span>
      </div>

      {/* Progress bar */}
      <div className="bg-surface-raised rounded-full h-1 mb-5 overflow-hidden">
        <div className="bg-gold h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="bg-surface-raised rounded-xl border border-border p-4 mb-4">
        {/* Image + confidence */}
        {current.imageData && (
          <div className="relative mb-4">
            <img src={current.imageData} alt="" className="w-full max-h-40 object-contain rounded-lg" />
            {confPct !== null && (
              <span className={`absolute top-2 right-2 text-[10px] font-semibold ${confColor} bg-bg/80 backdrop-blur-sm px-2 py-0.5 rounded-full tabular-nums`}>
                {confPct}% confident
              </span>
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Wine name</label>
            <input type="text" value={edits.name || ""} onChange={(e) => setEdits({ ...edits, name: e.target.value })} className={inputClass} placeholder="Wine name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Winery</label><input type="text" value={edits.winery || ""} onChange={(e) => setEdits({ ...edits, winery: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Vintage</label><input type="text" value={edits.vintage || ""} onChange={(e) => setEdits({ ...edits, vintage: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Varietal</label><input type="text" value={edits.varietal || ""} onChange={(e) => setEdits({ ...edits, varietal: e.target.value })} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Color</label>
              <select value={edits.color || ""} onChange={(e) => setEdits({ ...edits, color: e.target.value })} className={inputClass}>
                <option value="">Select...</option>
                {colors.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>Region</label><input type="text" value={edits.region || ""} onChange={(e) => setEdits({ ...edits, region: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Country</label><input type="text" value={edits.country || ""} onChange={(e) => setEdits({ ...edits, country: e.target.value })} className={inputClass} /></div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => handleAction("reject")}
          className="flex-1 bg-surface-raised hover:bg-surface-overlay border border-border-subtle text-text-muted hover:text-text-secondary py-3 rounded-lg text-[13px] font-medium transition-all">
          Skip
        </button>
        <button onClick={() => handleAction("confirm")}
          className="flex-[2] bg-gold/90 hover:bg-gold text-bg py-3 rounded-lg text-[13px] font-semibold transition-colors">
          Add to Fridge
        </button>
      </div>
    </div>
  );
}
