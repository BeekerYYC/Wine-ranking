"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCategory } from "@/lib/CategoryContext";

interface GroupWine {
  id: number;
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  quantity: number;
  rating: number | null;
  hasNotes: boolean;
  hasImage: boolean;
  createdAt: string;
}

interface Group {
  suggestedCanonicalId: number;
  wines: GroupWine[];
}

interface Response {
  totalWinesScanned: number;
  groupCount: number;
  totalDuplicates: number;
  groups: Group[];
}

type GroupState =
  | { phase: "review"; canonicalId: number; merging: false }
  | { phase: "merging"; canonicalId: number; merging: true }
  | { phase: "merged"; canonicalId: number; addedQty: number }
  | { phase: "dismissed" }
  | { phase: "error"; error: string };

export default function DedupePage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupStates, setGroupStates] = useState<Record<number, GroupState>>({});

  useEffect(() => {
    fetch(`/api/wines/duplicates?category=${category}`)
      .then((r) => r.json())
      .then((data: Response) => {
        setResponse(data);
        const init: Record<number, GroupState> = {};
        data.groups.forEach((g, i) => {
          init[i] = { phase: "review", canonicalId: g.suggestedCanonicalId, merging: false };
        });
        setGroupStates(init);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [category]);

  const setCanonical = (groupIdx: number, wineId: number) => {
    setGroupStates((s) => {
      const cur = s[groupIdx];
      if (cur.phase !== "review") return s;
      return { ...s, [groupIdx]: { ...cur, canonicalId: wineId } };
    });
  };

  const mergeGroup = async (groupIdx: number) => {
    if (!response) return;
    const group = response.groups[groupIdx];
    const cur = groupStates[groupIdx];
    if (cur.phase !== "review") return;
    const canonicalId = cur.canonicalId;
    const mergeIds = group.wines.map((w) => w.id).filter((id) => id !== canonicalId);
    if (mergeIds.length === 0) return;

    setGroupStates((s) => ({ ...s, [groupIdx]: { phase: "merging", canonicalId, merging: true } }));

    try {
      const res = await fetch("/api/wines/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalId, mergeIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Merge failed");
      setGroupStates((s) => ({
        ...s,
        [groupIdx]: { phase: "merged", canonicalId, addedQty: data.addedQty || 0 },
      }));
    } catch (e) {
      setGroupStates((s) => ({
        ...s,
        [groupIdx]: { phase: "error", error: e instanceof Error ? e.message : "Merge failed" },
      }));
    }
  };

  const dismissGroup = (groupIdx: number) => {
    setGroupStates((s) => ({ ...s, [groupIdx]: { phase: "dismissed" } }));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="animate-spin w-7 h-7 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[13px] text-text-tertiary">Scanning {config.fridgeLabel.toLowerCase()} for duplicates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <p className="text-[13px] text-danger">{error}</p>
      </div>
    );
  }

  if (!response) return null;

  const activeGroups = response.groups
    .map((g, i) => ({ ...g, idx: i }))
    .filter((g) => groupStates[g.idx]?.phase !== "dismissed");

  const mergedCount = Object.values(groupStates).filter((s) => s.phase === "merged").length;

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Clean up duplicates</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">
          Scanned <span className="text-text-primary font-semibold">{response.totalWinesScanned}</span> wines · found <span className="text-text-primary font-semibold">{response.groupCount}</span> potential duplicate group{response.groupCount !== 1 ? "s" : ""}
          {response.totalDuplicates > 0 && <> · <span className="text-gold font-semibold">{response.totalDuplicates}</span> rows can be removed</>}
          {mergedCount > 0 && <> · <span className="text-success font-semibold">{mergedCount}</span> merged</>}
        </p>
      </div>

      {response.groupCount === 0 ? (
        <div className="bg-success-muted/40 border border-success/15 rounded-xl p-6 text-center">
          <p className="text-[14px] text-success font-semibold">No duplicates found</p>
          <p className="text-[12px] text-text-tertiary mt-1">Your collection looks clean.</p>
          <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors mt-4">
            View {config.fridgeLabel}
          </button>
        </div>
      ) : activeGroups.length === 0 ? (
        <div className="bg-success-muted/40 border border-success/15 rounded-xl p-6 text-center">
          <p className="text-[14px] text-success font-semibold">All groups handled</p>
          <p className="text-[12px] text-text-tertiary mt-1">Merged {mergedCount}, dismissed the rest.</p>
          <button onClick={() => router.push("/fridge")} className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors mt-4">
            View {config.fridgeLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGroups.map((g) => {
            const state = groupStates[g.idx];
            const totalQty = g.wines.reduce((n, w) => n + w.quantity, 0);
            const totalRows = g.wines.length;

            if (state.phase === "merged") {
              return (
                <div key={g.idx} className="bg-success-muted/40 border border-success/15 rounded-xl px-4 py-3 flex items-center gap-3">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-success flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[12px] text-text-secondary">
                    Merged into <span className="text-text-primary font-medium">{g.wines.find((w) => w.id === state.canonicalId)?.name}</span> · qty {state.addedQty + (g.wines.find((w) => w.id === state.canonicalId)?.quantity ?? 0)}
                  </p>
                </div>
              );
            }

            if (state.phase === "error") {
              return (
                <div key={g.idx} className="bg-danger-muted/40 border border-danger/15 rounded-xl px-4 py-3">
                  <p className="text-[12px] text-danger">Merge failed: {state.error}</p>
                </div>
              );
            }

            const canonicalId = state.phase === "review" || state.phase === "merging" ? state.canonicalId : g.suggestedCanonicalId;
            const isWorking = state.phase === "merging";

            return (
              <div key={g.idx} className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-text-primary">{totalRows} rows · {totalQty} bottle{totalQty !== 1 ? "s" : ""}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Pick which one to keep — others merge into it.</p>
                  </div>
                </div>
                <div>
                  {g.wines.map((w) => (
                    <label
                      key={w.id}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-b-0 cursor-pointer hover:bg-surface-overlay ${
                        canonicalId === w.id ? "bg-gold-muted/30" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`canonical-${g.idx}`}
                        checked={canonicalId === w.id}
                        onChange={() => setCanonical(g.idx, w.id)}
                        disabled={isWorking}
                        className="accent-gold"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-text-primary truncate">{w.name}</span>
                          <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded text-gold bg-gold-muted">×{w.quantity}</span>
                          {w.rating && <span className="text-[10px] text-gold">★{w.rating}</span>}
                          {w.hasNotes && <span title="Has notes" className="text-[10px]">📝</span>}
                          {w.hasImage && <span title="Has image" className="text-[10px]">🖼️</span>}
                        </div>
                        <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                          {[w.winery, w.vintage ? String(w.vintage) : null, w.color].filter(Boolean).join(" · ")} · id {w.id}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-end gap-2">
                  <button
                    onClick={() => dismissGroup(g.idx)}
                    disabled={isWorking}
                    className="text-[12px] text-text-muted hover:text-text-secondary px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    Not duplicates
                  </button>
                  <button
                    onClick={() => mergeGroup(g.idx)}
                    disabled={isWorking}
                    className="bg-gold/90 hover:bg-gold disabled:opacity-50 text-bg px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    {isWorking ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-bg border-t-transparent rounded-full" />
                        Merging
                      </>
                    ) : (
                      `Merge ${totalRows - 1} into selected`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
