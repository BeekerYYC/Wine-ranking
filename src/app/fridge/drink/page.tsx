"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConsumeModal from "@/components/ConsumeModal";
import { useCategory } from "@/lib/CategoryContext";

interface Suggestion {
  wineId: number; name: string; reason: string;
}
interface SuggestResult {
  suggestion: Suggestion;
  alternatives: Suggestion[];
}

export default function DrinkPage() {
  const router = useRouter();
  const { category, config } = useCategory();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consumeWine, setConsumeWine] = useState<Suggestion | null>(null);

  const getSuggestion = async (context: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fridge/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, category }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get suggestion");
    } finally {
      setLoading(false);
    }
  };

  const handleConsume = async (data: { rating?: number; notes?: string }) => {
    if (!consumeWine) return;
    await fetch(`/api/wines/${consumeWine.wineId}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setConsumeWine(null);
    router.push("/fridge");
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.push("/fridge")} className="text-text-muted hover:text-text-secondary text-[12px] mb-5 inline-flex items-center gap-1.5 transition-colors">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to {config.fridgeLabel.toLowerCase()}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{config.drinkPrompt}</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">Tell me about your evening and I&apos;ll pick the perfect {config.itemName}</p>
      </div>

      {/* Quick prompts */}
      {!result && !loading && (
        <div className="grid grid-cols-2 gap-2 mb-5">
          {config.quickPrompts.map((p) => (
            <button
              key={p.label}
              onClick={() => { setInput(p.value); getSuggestion(p.value); }}
              className="bg-surface-raised hover:bg-surface-overlay border border-border-subtle rounded-xl p-3 text-left transition-all group"
            >
              <span className="text-[12px] font-medium text-text-secondary group-hover:text-gold transition-colors">{p.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom input */}
      {!result && !loading && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && getSuggestion(input)}
            placeholder={category === "wine" ? "I'm making lamb chops tonight..." : category === "coffee" ? "I need something strong to wake up..." : "Having tacos tonight..."}
            className="flex-1 px-3.5 py-2.5 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all"
          />
          <button
            onClick={() => input.trim() && getSuggestion(input)}
            disabled={!input.trim()}
            className="bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all"
          >
            Suggest
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full mb-3" />
          <p className="text-[14px] text-text-primary font-medium">Checking your {config.fridgeLabel.toLowerCase()}...</p>
          <p className="text-[12px] text-text-muted mt-1">Finding the perfect {config.itemName} for you</p>
        </div>
      )}

      {error && (
        <div className="bg-danger-muted border border-danger/15 rounded-xl p-3 mt-4">
          <p className="text-[13px] text-danger">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 mt-2">
          <div className="bg-surface-raised rounded-xl border border-gold/20 p-5">
            <p className="text-[10px] text-gold uppercase tracking-widest font-medium mb-3">Our pick</p>
            <h2 className="text-lg font-bold text-text-primary mb-1">{result.suggestion.name}</h2>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">{result.suggestion.reason}</p>
            <button
              onClick={() => setConsumeWine(result.suggestion)}
              className="bg-gold/90 hover:bg-gold text-bg px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors w-full"
            >
              {config.consumeVerb}
            </button>
          </div>

          {result.alternatives && result.alternatives.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-2 mt-4">Also good</p>
              {result.alternatives.map((alt, i) => (
                <div key={i} className="bg-surface-raised rounded-xl border border-border-subtle p-4 mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-text-primary">{alt.name}</h3>
                    <p className="text-[12px] text-text-tertiary mt-0.5">{alt.reason}</p>
                  </div>
                  <button
                    onClick={() => setConsumeWine(alt)}
                    className="text-[11px] text-gold hover:text-gold-light font-medium flex-shrink-0 transition-colors"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setResult(null); setInput(""); }}
            className="text-[12px] text-text-muted hover:text-text-tertiary transition-colors mt-2"
          >
            Try different criteria
          </button>
        </div>
      )}

      {consumeWine && (
        <ConsumeModal
          wine={{ id: consumeWine.wineId, name: consumeWine.name }}
          onConfirm={handleConsume}
          onClose={() => setConsumeWine(null)}
        />
      )}
    </div>
  );
}
