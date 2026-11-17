"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import WineImage from "@/components/WineImage";
import { useDrinkFlow } from "@/components/DrinkFlow";
import { useCategory } from "@/lib/CategoryContext";
import { normalizeColor } from "@/lib/colors";

interface PickedWine {
  id: number;
  name: string;
  winery: string | null;
  vintage: number | null;
  varietal: string | null;
  color: string | null;
  region: string | null;
  country: string | null;
  quantity: number;
  labelImageUrl: string | null;
  hasImage: boolean;
}
interface Pick { wineId: number; name: string; reason: string; wine: PickedWine }
interface SuggestResult { suggestion: Pick; alternatives: Pick[] }

/**
 * The everyday flow: say what you're eating, get a bottle from your own fridge,
 * see it (photo, producer, vintage) so you can find it, and open it in one tap.
 * Rating comes later, from the review queue.
 */
export default function DrinkPage() {
  const { category, config } = useCategory();
  const { openBottle } = useDrinkFlow();
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [opened, setOpened] = useState<number[]>([]);
  const startedFromLink = useRef(false);

  const getSuggestion = async (context: string) => {
    const text = context.trim();
    if (!text) return;
    setAsked(text);
    setLoading(true);
    setError(null);
    setResult(null);
    setOpened([]);
    try {
      const res = await fetch("/api/fridge/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: text, category }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Couldn't get a suggestion");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get a suggestion");
    } finally {
      setLoading(false);
    }
  };

  // Arriving from the Home page's "What are you having?" box: ?q=... starts
  // the search straight away. Read from location rather than useSearchParams,
  // which would force this page out of static rendering.
  useEffect(() => {
    if (startedFromLink.current) return;
    startedFromLink.current = true;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setInput(q);
      getSuggestion(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep counts honest when a bottle is opened or an open is undone.
  useEffect(() => {
    const onChanged = (e: Event) => {
      const w = (e as CustomEvent).detail as { id?: number; quantity?: number; logId?: number };
      if (!w?.id || typeof w.quantity !== "number") return;
      const patch = (p: Pick) => (p.wineId === w.id ? { ...p, wine: { ...p.wine, quantity: w.quantity! } } : p);
      setResult((r) => (r ? { suggestion: patch(r.suggestion), alternatives: r.alternatives.map(patch) } : r));
      // An undo (no logId) puts the bottle back: it's no longer "opened".
      if (!w.logId) setOpened((ids) => ids.filter((id) => id !== w.id));
    };
    window.addEventListener("wine-changed", onChanged);
    return () => window.removeEventListener("wine-changed", onChanged);
  }, []);

  const open = async (p: Pick) => {
    setOpening(p.wineId);
    setError(null);
    try {
      await openBottle({ id: p.wineId, name: p.name });
      setOpened((ids) => [...ids, p.wineId]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that bottle");
    } finally {
      setOpening(null);
    }
  };

  const placeholder = category === "wine" ? "Lamb chops with rosemary…" : category === "coffee" ? "Something strong to wake up…" : "Tacos tonight…";

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-[28px] sm:text-[32px] font-semibold leading-tight">{config.drinkPrompt}</h1>
        <p className="text-[13px] text-text-tertiary mt-1">Tell me what you&apos;re eating — I&apos;ll pick a {config.itemName} from your {config.fridgeLabel.toLowerCase()}.</p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); getSuggestion(input); }}
        className="flex gap-2 mb-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="search"
          // 16px stops iOS zooming the page when the field is focused.
          className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-surface-raised border border-border-subtle text-[16px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg px-5 rounded-xl text-[14px] font-semibold transition-all"
        >
          {loading ? "…" : "Suggest"}
        </button>
      </form>

      {!result && !loading && (
        <div className="flex flex-wrap gap-2 mb-6">
          {config.quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => { setInput(p.value); getSuggestion(p.value); }}
              className="bg-surface-raised hover:bg-surface-overlay border border-border-subtle rounded-full px-3.5 py-2 text-[13px] text-text-secondary hover:text-gold transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="bg-surface-raised rounded-2xl border border-border-subtle p-8 text-center mt-4">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full mb-3" />
          <p className="text-[14px] text-text-primary font-medium">Checking your {config.fridgeLabel.toLowerCase()}…</p>
          <p className="text-[12px] text-text-muted mt-1">&ldquo;{asked}&rdquo;</p>
        </div>
      )}

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mt-4">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4 mt-2">
          <PickCard pick={result.suggestion} hero opening={opening} opened={opened} onOpen={open} />

          {result.alternatives.length > 0 && (
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-medium mb-2 mt-6">Also good</p>
              <div className="space-y-2">
                {result.alternatives.map((alt) => (
                  <PickCard key={alt.wineId} pick={alt} opening={opening} opened={opened} onOpen={open} />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setResult(null); setOpened([]); }}
            className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors mt-2"
          >
            ← Try something else
          </button>
        </div>
      )}
    </div>
  );
}

function PickCard({ pick, hero = false, opening, opened, onOpen }: {
  pick: Pick;
  hero?: boolean;
  opening: number | null;
  opened: number[];
  onOpen: (p: Pick) => void;
}) {
  const w = pick.wine;
  const isOpened = opened.includes(w.id);
  const busy = opening === w.id;
  const none = w.quantity <= 0 && !isOpened;
  const detail = [w.winery, w.vintage, w.varietal].filter(Boolean).join(" · ");
  const place = [w.region, w.country].filter(Boolean).join(", ");
  const color = normalizeColor(w.color);

  const openButton = (
    <button
      onClick={() => onOpen(pick)}
      disabled={busy || isOpened || none}
      className={
        hero
          ? "w-full bg-gold/90 hover:bg-gold disabled:opacity-60 text-bg py-3.5 rounded-xl text-[15px] font-semibold transition-colors"
          : "flex-shrink-0 bg-gold-muted hover:bg-gold/20 border border-gold/20 text-gold disabled:opacity-60 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors"
      }
    >
      {isOpened ? "Opened — enjoy!" : busy ? "Opening…" : none ? "None left" : hero ? "Open this bottle" : "Open"}
    </button>
  );

  if (!hero) {
    return (
      <div className="bg-surface-raised rounded-xl border border-border-subtle p-3 flex items-center gap-3">
        <Link href={`/wine/${w.id}`} className="w-16 h-24 flex-shrink-0 rounded-lg bg-surface-overlay flex items-center justify-center overflow-hidden">
          <WineImage wineId={w.id} hasImage={w.hasImage} labelImageUrl={w.labelImageUrl} alt={w.name} color={w.color} className="h-full w-full object-cover" placeholderSize="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/wine/${w.id}`} className="block text-[14px] font-semibold text-text-primary leading-tight hover:text-gold">{w.name}</Link>
          {detail && <p className="text-[12px] text-text-tertiary truncate mt-0.5">{detail}</p>}
          <p className="text-[12px] text-text-secondary mt-1 line-clamp-2">{pick.reason}</p>
          <p className="text-[11px] text-text-muted mt-1 tabular-nums">{w.quantity} in your fridge</p>
        </div>
        {openButton}
      </div>
    );
  }

  return (
    <div className="bg-surface-raised rounded-2xl border border-gold/25 overflow-hidden">
      <p className="text-[10px] text-gold uppercase tracking-widest font-semibold px-5 pt-4">Your pick</p>
      {/* Big enough to spot the bottle in the fridge: your own photo of it (cropped
          from a drawer shot), else the label image, else a bottle in its colour. */}
      <Link href={`/wine/${w.id}`} className="block mx-5 mt-3 h-64 sm:h-72 rounded-xl bg-surface-overlay overflow-hidden flex items-center justify-center">
        <WineImage wineId={w.id} hasImage={w.hasImage} labelImageUrl={w.labelImageUrl} alt={w.name} color={w.color} className="h-full w-full object-contain" placeholderSize="lg" />
      </Link>
      <div className="p-5">
        <Link href={`/wine/${w.id}`} className="block font-serif text-[22px] font-semibold text-text-primary leading-tight hover:text-gold">{w.name}</Link>
        {detail && <p className="text-[13px] text-text-secondary mt-1">{detail}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[12px] font-semibold tabular-nums text-gold bg-gold-muted px-2 py-0.5 rounded-md">
            {w.quantity} in your fridge
          </span>
          {color && <span className="text-[12px] text-text-tertiary capitalize">{color}</span>}
          {place && <span className="text-[12px] text-text-tertiary">· {place}</span>}
        </div>
        <p className="text-[14px] text-text-secondary leading-relaxed mt-4 mb-5">{pick.reason}</p>
        {openButton}
      </div>
    </div>
  );
}
