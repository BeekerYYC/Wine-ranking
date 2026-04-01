"use client";

import { useState } from "react";

export default function InsightsPage() {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "", type: "insights" }) });
      setInsights((await res.json()).response);
    } catch { setInsights("Failed to generate insights."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-1">Taste Insights</h1>
      <p className="text-[13px] text-text-tertiary mb-6">AI analysis of your preferences and patterns</p>

      {!insights && !loading && (
        <button onClick={getInsights}
          className="w-full bg-surface-raised rounded-xl border border-border p-8 text-center hover:border-accent/20 transition-all group">
          <p className="text-3xl mb-3 opacity-40 group-hover:opacity-70 transition-opacity">&#129504;</p>
          <p className="text-[15px] font-medium text-text-primary">Analyze my palate</p>
          <p className="text-[13px] text-text-tertiary mt-1">Get insights about your taste, patterns, and what to try next</p>
        </button>
      )}

      {loading && (
        <div className="bg-surface-raised rounded-xl border border-border p-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full mb-3" />
          <p className="text-[14px] text-text-primary font-medium">Analyzing your collection...</p>
        </div>
      )}

      {insights && (
        <div className="bg-surface-raised rounded-xl border border-border p-5">
          <div className="text-[13px] text-text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: insights
                .replace(/\*\*(.*?)\*\*/g, "<strong class='text-text-primary'>$1</strong>")
                .replace(/\n\n/g, "</p><p class='mt-3'>")
                .replace(/\n- /g, "<br/>• ")
                .replace(/\n/g, "<br/>"),
            }} />
          <button onClick={getInsights} className="mt-4 text-[12px] text-text-tertiary hover:text-accent transition-colors">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
