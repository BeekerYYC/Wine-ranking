"use client";

/**
 * The everyday drinking flow, shared across the app:
 *
 * - openBottle(): one tap takes a bottle out of the cellar — no rating form,
 *   because nobody can rate a bottle they've only just opened — and shows an
 *   "Enjoy" toast with Undo for a mis-tap.
 * - The review queue: opened bottles that haven't been rated. On a later visit
 *   (bottles opened at least a few hours ago) the app asks how each one was, one
 *   at a time, until it's rated or dismissed. "Not now" waits until the next
 *   visit. The bell (ReviewBell) shows how many are waiting and opens the queue.
 *
 * Pages that show bottle counts listen for the "wine-changed" window event,
 * fired with the updated wine after an open or an undo.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import WineImage from "./WineImage";
import StarRating from "./StarRating";

export interface PendingReview {
  logId: number;
  openedAt: string;
  wine: {
    id: number;
    name: string;
    winery: string | null;
    vintage: number | null;
    color: string | null;
    labelImageUrl: string | null;
    hasImage: boolean;
  };
}

type OpenedWine = { id: number; name: string; quantity: number; logId: number } & Record<string, unknown>;

interface DrinkFlowValue {
  /** Open one bottle. Resolves to the updated wine, or throws with a readable message. */
  openBottle: (wine: { id: number; name: string }) => Promise<OpenedWine>;
  pendingCount: number;
  showReviews: () => void;
}

const DrinkFlowContext = createContext<DrinkFlowValue>({
  openBottle: async () => { throw new Error("DrinkFlowProvider missing"); },
  pendingCount: 0,
  showReviews: () => {},
});

export const useDrinkFlow = () => useContext(DrinkFlowContext);

/** Only ask about bottles opened at least this long ago — you've had time to drink it. */
const DUE_AFTER_MS = 3 * 60 * 60 * 1000;
const SNOOZE_KEY = "review-queue-snoozed";
/** Pages where a pop-up won't interrupt a task in progress (scanning, audits, forms). */
const CALM_PAGES = [/^\/$/, /^\/fridge$/, /^\/fridge\/drink$/, /^\/dashboard$/, /^\/wine\/\d+$/];

function snoozed(): boolean {
  try { return sessionStorage.getItem(SNOOZE_KEY) === "1"; } catch { return false; }
}
function snooze() {
  try { sessionStorage.setItem(SNOOZE_KEY, "1"); } catch { /* storage unavailable: just close */ }
}

export function announceWineChanged(wine: unknown) {
  window.dispatchEvent(new CustomEvent("wine-changed", { detail: wine }));
}

export function DrinkFlowProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [queue, setQueue] = useState<PendingReview[] | null>(null); // open when non-null
  const [toast, setToast] = useState<{ kind: "opened"; logId: number; name: string } | { kind: "info"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch("/api/reviews/pending");
      const data = res.ok ? await res.json() : { reviews: [] };
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/login") loadReviews();
  }, [pathname, loadReviews]);

  // Ask on its own when something is due, unless "Not now" was chosen this visit.
  useEffect(() => {
    if (queue || !CALM_PAGES.some((re) => re.test(pathname)) || snoozed()) return;
    const due = reviews.filter((r) => Date.now() - new Date(r.openedAt).getTime() >= DUE_AFTER_MS);
    if (due.length > 0) setQueue(due);
  }, [reviews, pathname, queue]);

  const showToast = (t: NonNullable<typeof toast>, ms: number) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const openBottle = useCallback(async (wine: { id: number; name: string }) => {
    const res = await fetch(`/api/wines/${wine.id}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't open that bottle");
    announceWineChanged(data);
    showToast({ kind: "opened", logId: data.logId, name: wine.name }, 10_000);
    loadReviews();
    return data as OpenedWine;
  }, [loadReviews]);

  const undoOpen = async (logId: number, name: string) => {
    setToast(null);
    const res = await fetch(`/api/consumptions/${logId}`, { method: "DELETE" });
    if (res.ok) {
      announceWineChanged(await res.json());
      showToast({ kind: "info", text: `Put ${name} back in the cellar.` }, 4000);
      loadReviews();
    } else {
      showToast({ kind: "info", text: "Couldn't undo — the bottle may already have been changed." }, 5000);
    }
  };

  const value: DrinkFlowValue = {
    openBottle,
    pendingCount: reviews.length,
    showReviews: () => setQueue(reviews),
  };

  return (
    <DrinkFlowContext.Provider value={value}>
      {children}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-[55] w-[calc(100%-2rem)] max-w-md">
          <div className="bg-surface-raised border border-border rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3" role="status">
            {toast.kind === "opened" ? (
              <>
                <p className="flex-1 text-[13px] text-text-primary">
                  Opened <span className="font-semibold">{toast.name}</span>. Enjoy!
                  <span className="block text-[11px] text-text-tertiary">We&apos;ll ask how it was later.</span>
                </p>
                <button
                  onClick={() => undoOpen(toast.logId, toast.name)}
                  className="flex-shrink-0 text-[13px] font-semibold text-gold hover:text-gold-light px-2 py-1"
                >
                  Undo
                </button>
              </>
            ) : (
              <p className="flex-1 text-[13px] text-text-secondary">{toast.text}</p>
            )}
          </div>
        </div>
      )}

      {queue && queue.length > 0 && (
        <ReviewSheet
          queue={queue}
          onDone={(logId) => {
            setQueue((q) => (q ? q.filter((r) => r.logId !== logId) : q));
            setReviews((rs) => rs.filter((r) => r.logId !== logId));
          }}
          onLater={() => { snooze(); setQueue(null); }}
        />
      )}
    </DrinkFlowContext.Provider>
  );
}

function openedWhen(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ReviewSheet({ queue, onDone, onLater }: {
  queue: PendingReview[];
  onDone: (logId: number) => void;
  onLater: () => void;
}) {
  const item = queue[0];
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form for each bottle.
  useEffect(() => { setRating(0); setNotes(""); setError(null); }, [item.logId]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/consumptions/${item.logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 404) throw new Error();
      if (body.rating) announceWineChanged({ id: item.wine.id, rating: body.rating });
      onDone(item.logId);
    } catch {
      setError("Couldn't save that — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const w = item.wine;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Rate an opened bottle">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onLater} />
      <div className="relative bg-surface-raised border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:mx-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-[18px] font-semibold">How was it?</h2>
          {queue.length > 1 && <span className="text-[11px] text-text-muted tabular-nums">1 of {queue.length}</span>}
        </div>

        <div className="flex gap-4 mb-4">
          <div className="w-20 h-28 flex-shrink-0 rounded-lg bg-surface-overlay flex items-center justify-center overflow-hidden">
            <WineImage wineId={w.id} hasImage={w.hasImage} labelImageUrl={w.labelImageUrl} alt={w.name} color={w.color} className="h-full w-full object-cover" placeholderSize="md" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-[16px] font-semibold text-text-primary leading-tight">{w.name}</p>
            <p className="text-[12px] text-text-tertiary mt-1">{[w.winery, w.vintage].filter(Boolean).join(" · ")}</p>
            <p className="text-[12px] text-text-muted mt-1">Opened {openedWhen(item.openedAt)}</p>
          </div>
        </div>

        <div className="mb-3">
          <StarRating rating={rating} onChange={setRating} size="xl" />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Tasting notes (optional)"
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border-subtle text-[16px] sm:text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 resize-none mb-3"
        />
        {error && <p className="text-[12px] text-danger mb-2">{error}</p>}

        <button
          onClick={() => send({ rating, notes })}
          disabled={!rating || busy}
          className="w-full bg-gold/90 hover:bg-gold disabled:opacity-40 text-bg py-2.5 rounded-lg text-[14px] font-semibold transition-colors"
        >
          {busy ? "Saving…" : "Save rating"}
        </button>
        <div className="flex justify-between mt-3">
          <button onClick={onLater} disabled={busy} className="text-[12px] text-text-tertiary hover:text-text-secondary px-1 py-1">
            Not now
          </button>
          <button onClick={() => send({ dismiss: true })} disabled={busy} className="text-[12px] text-text-muted hover:text-text-secondary px-1 py-1">
            Don&apos;t ask about this one
          </button>
        </div>
      </div>
    </div>
  );
}

/** Bell button: how many opened bottles are waiting for a rating; opens the queue. */
export function ReviewBell() {
  const { pendingCount, showReviews } = useDrinkFlow();
  return (
    <button
      onClick={showReviews}
      disabled={pendingCount === 0}
      title={pendingCount ? `${pendingCount} opened bottle${pendingCount !== 1 ? "s" : ""} to rate` : "No bottles waiting for a rating"}
      aria-label={pendingCount ? `${pendingCount} bottle${pendingCount !== 1 ? "s" : ""} to rate` : "No bottles to rate"}
      className="relative w-10 h-10 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors disabled:cursor-default"
    >
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink text-bg text-[10px] font-bold flex items-center justify-center tabular-nums">
          {pendingCount}
        </span>
      )}
    </button>
  );
}
