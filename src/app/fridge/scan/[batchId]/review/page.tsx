"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

interface ScanItem {
  id: number; status: string; imageData?: string | null;
  name?: string | null; winery?: string | null; vintage?: number | null;
  varietal?: string | null; region?: string | null; country?: string | null;
  color?: string | null; confidence?: number | null; quantity?: number;
}

export default function ReviewPage() {
  const { batchId } = useParams();
  const router = useRouter();
  const { config } = useCategory();
  const [items, setItems] = useState<ScanItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [merged, setMerged] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWines, setSavedWines] = useState<{ wineId: number; name: string }[]>([]);

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
      color: item.color || "", quantity: (item.quantity || 1).toString(),
    });
  };

  useEffect(() => {
    if (current) resetEdits(current);
  }, [currentIndex, items]);

  const handleAction = async (action: "confirm" | "reject") => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/scan/batch/${batchId}/confirm`, {
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
              quantity: edits.quantity ? parseInt(edits.quantity) : 1,
            } : undefined,
          }],
        }),
      });

      // Never assume the save worked — this screen used to report "Added 1 item"
      // even when the request failed outright, so bottles vanished with no error.
      if (!res.ok) {
        throw new Error(`The server rejected the save (HTTP ${res.status}). Nothing was added.`);
      }

      const data = await res.json();
      const result = data?.results?.[0];

      if (!result) {
        throw new Error("The server did not save this item. Please try again.");
      }
      if (result.action === "skipped") {
        throw new Error(result.reason || "The server skipped this item.");
      }
      if (result.action === "error") {
        throw new Error(result.error || "The server could not save this item.");
      }

      // Only newly created bottles need enrichment — a merge went into a bottle
      // that was already in the cellar.
      let saved = savedWines;
      if (action === "confirm") {
        if (result.action === "merged") {
          setMerged((m) => [...m, `${result.name} (now ${result.quantity} in stock)`]);
        } else {
          setConfirmed((c) => c + 1);
          saved = [...savedWines, { wineId: result.wineId, name: result.name }];
          setSavedWines(saved);
        }
      } else {
        setRejected((c) => c + 1);
      }

      if (isLast) {
        setItems([]);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save this item");
    } finally {
      setSaving(false);
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
          Added <span className="text-gold font-semibold">{confirmed}</span> new item{confirmed !== 1 ? "s" : ""} to your {config.fridgeLabel.toLowerCase()}
        </p>
        {/* Merges are not new cards — say so, otherwise it reads as a lost bottle. */}
        {merged.length > 0 && (
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-3 mt-3 mb-2 text-left">
            <p className="text-[12px] text-text-secondary mb-1">
              {merged.length} matched {merged.length !== 1 ? "items" : "an item"} you already had — the bottle count was increased instead of adding a new card:
            </p>
            <ul className="text-[11px] text-text-tertiary space-y-0.5">
              {merged.map((m, i) => <li key={i}>• {m}</li>)}
            </ul>
          </div>
        )}
        {rejected > 0 && <p className="text-[12px] text-text-muted mb-6">{rejected} skipped</p>}

        {/* Enrichment is queued server-side by the confirm route, so it keeps
            running after this page is closed. */}
        {savedWines.length > 0 && (
          <p className="text-[12px] text-text-tertiary mt-4">
            Tasting notes, critic scores and label images are being fetched for{" "}
            {savedWines.length === 1 ? "this bottle" : `these ${savedWines.length} bottles`} in the
            background — they will appear on the bottle shortly.
          </p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors">
            View {config.fridgeLabel}
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

  // A label the AI could not really read produces either a low confidence score
  // or a placeholder name. Adding those unchallenged is how "Unknown White/Rosé"
  // and "Blanc (partial label visible)" ended up in the cellar as real bottles.
  const nameLooksUnidentified = /unknown|partial|not visible|unclear|illegible|unreadable/i.test(edits.name || current.name || "");
  const lowConfidence = current.confidence != null && current.confidence < 0.5;
  const doubtful = nameLooksUnidentified || lowConfidence;
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
          {currentIndex + 1} of {items.length} items
        </span>
      </div>

      <div className="bg-surface-raised rounded-full h-1 mb-5 overflow-hidden">
        <div className="bg-gold h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="bg-surface-raised rounded-xl border border-border p-4 mb-4">
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

        <div className="space-y-3">
          <div>
            <label className={labelClass}>{config.label} name</label>
            <input type="text" value={edits.name || ""} onChange={(e) => setEdits({ ...edits, name: e.target.value })} className={inputClass} placeholder={`${config.label} name`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>{config.producerLabel}</label><input type="text" value={edits.winery || ""} onChange={(e) => setEdits({ ...edits, winery: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>{config.vintageLabel}</label><input type="text" value={edits.vintage || ""} onChange={(e) => setEdits({ ...edits, vintage: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelClass}>{config.varietalLabel}</label><input type="text" value={edits.varietal || ""} onChange={(e) => setEdits({ ...edits, varietal: e.target.value })} className={inputClass} /></div>
            <div>
              <label className={labelClass}>{config.colorLabel}</label>
              <select value={edits.color || ""} onChange={(e) => setEdits({ ...edits, color: e.target.value })} className={inputClass}>
                <option value="">Select...</option>
                {config.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelClass}>Region</label><input type="text" value={edits.region || ""} onChange={(e) => setEdits({ ...edits, region: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Country</label><input type="text" value={edits.country || ""} onChange={(e) => setEdits({ ...edits, country: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Qty</label><input type="number" min="1" value={edits.quantity || "1"} onChange={(e) => setEdits({ ...edits, quantity: e.target.value })} className={inputClass} /></div>
          </div>
        </div>
      </div>

      {doubtful && (
        <div className="bg-gold-muted border border-gold/20 rounded-xl p-3 mb-3">
          <p className="text-[13px] text-text-primary font-medium">
            {nameLooksUnidentified ? "The label could not be read properly" : `Low confidence (${confPct}%)`}
          </p>
          <p className="text-[12px] text-text-tertiary mt-1">
            {nameLooksUnidentified
              ? "This is a placeholder, not a name — fix it above, or skip it and photograph the bottle on its own."
              : "Check the details above before adding, or skip it and photograph the bottle on its own."}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mb-3">
          <p className="text-[13px] text-danger">{error}</p>
          <p className="text-[11px] text-text-tertiary mt-1">
            This item has not been added. Tap &ldquo;Add to {config.fridgeLabel}&rdquo; to retry.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => handleAction("reject")} disabled={saving}
          className={`${doubtful ? "flex-[2] bg-gold/90 hover:bg-gold text-bg font-semibold" : "flex-1 bg-surface-raised hover:bg-surface-overlay border border-border-subtle text-text-muted hover:text-text-secondary font-medium"} disabled:opacity-40 py-3 rounded-lg text-[13px] transition-all`}>
          Skip
        </button>
        <button onClick={() => handleAction("confirm")} disabled={saving}
          className={`${doubtful ? "flex-1 bg-surface-raised hover:bg-surface-overlay border border-border-subtle text-text-secondary font-medium" : "flex-[2] bg-gold/90 hover:bg-gold text-bg font-semibold"} disabled:opacity-40 py-3 rounded-lg text-[13px] transition-colors`}>
          {saving ? "Saving..." : doubtful ? "Add anyway" : `Add to ${config.fridgeLabel}`}
        </button>
      </div>
    </div>
  );
}
