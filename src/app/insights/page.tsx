"use client";

import { useState } from "react";
import { useCategory } from "@/lib/CategoryContext";

export default function InsightsPage() {
  const { category, config } = useCategory();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "", type: "insights", category }) });
      setInsights((await res.json()).response);
    } catch { setInsights("Failed to generate insights."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Taste Insights</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">AI analysis of your {config.itemName} preferences and patterns</p>
      </div>

      {!insights && !loading && (
        <button onClick={getInsights}
          className="w-full bg-surface-raised rounded-xl border border-border-subtle p-8 text-center hover:border-border transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-gold-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-gold/20 transition-colors">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-gold">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-text-primary group-hover:text-gold transition-colors">Analyze my palate</p>
          <p className="text-[12px] text-text-muted mt-1">Get insights about your {config.itemName} taste, patterns, and what to try next</p>
        </button>
      )}

      {loading && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gold border-t-transparent rounded-full mb-3" />
          <p className="text-[13px] text-text-primary font-medium">Analyzing your collection...</p>
          <p className="text-[11px] text-text-muted mt-1">This may take a moment</p>
        </div>
      )}

      {insights && (
        <div className="bg-surface-raised rounded-xl border border-border-subtle p-5">
          <div className="text-[13px] text-text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: insights
                .replace(/\*\*(.*?)\*\*/g, "<strong class='text-text-primary'>$1</strong>")
                .replace(/\n\n/g, "</p><p class='mt-3'>")
                .replace(/\n- /g, "<br/>• ")
                .replace(/\n/g, "<br/>"),
            }} />
          <button onClick={getInsights} className="mt-4 text-[11px] text-text-muted hover:text-gold transition-colors font-medium">
            Refresh insights
          </button>
        </div>
      )}
    </div>
  );
}
