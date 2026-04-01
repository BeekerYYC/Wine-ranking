"use client";

import { useState } from "react";

export default function InsightsPage() {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sommelier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", type: "insights" }),
      });
      const data = await res.json();
      setInsights(data.response);
    } catch {
      setInsights("Failed to generate insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-wine-100 mb-2">Taste Evolution</h1>
      <p className="text-wine-400 text-sm mb-6">
        AI-powered analysis of your wine preferences and drinking patterns
      </p>

      {!insights && !loading && (
        <button
          onClick={getInsights}
          className="w-full bg-gradient-to-r from-wine-800 to-grape-900 border border-wine-700/40 rounded-xl p-6 text-center hover:from-wine-700 hover:to-grape-800 transition-all"
        >
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-wine-100 font-semibold text-lg">Analyze My Palate</p>
          <p className="text-wine-400 text-sm mt-1">
            Get AI insights about your taste preferences, patterns, and recommendations
          </p>
        </button>
      )}

      {loading && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-wine-400 border-t-transparent rounded-full mb-3" />
          <p className="text-wine-200 font-medium">Analyzing your collection...</p>
          <p className="text-sm text-wine-500">This may take a moment</p>
        </div>
      )}

      {insights && (
        <div className="bg-wine-900/40 border border-wine-800/40 rounded-xl p-6">
          <div
            className="prose prose-invert prose-sm max-w-none text-wine-200 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: insights
                .replace(/\*\*(.*?)\*\*/g, "<strong class='text-wine-100'>$1</strong>")
                .replace(/\n\n/g, "</p><p class='mt-3'>")
                .replace(/\n- /g, "<br/>• ")
                .replace(/\n/g, "<br/>"),
            }}
          />
          <button
            onClick={getInsights}
            className="mt-4 text-sm text-wine-400 hover:text-wine-200 transition-colors"
          >
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  );
}
