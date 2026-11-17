"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't sign in");
      }
      const next = new URLSearchParams(window.location.search).get("next");
      // Full page load so the new cookie applies to everything.
      window.location.href = safeNextPath(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in");
      setSubmitting(false);
    }
  };

  return (
    // Covers the sidebar and bottom nav, which aren't usable until signed in.
    <div className="fixed inset-0 z-[60] bg-bg flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface-raised border border-border-subtle rounded-2xl p-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-pink flex items-center justify-center text-xl shadow-lg shadow-gold/20 mx-auto mb-4">
          🍷
        </div>
        <h1 className="font-serif text-[24px] font-semibold text-center mb-1">Wine Ranker</h1>
        <p className="text-[13px] text-text-tertiary text-center mb-5">Enter your password to open your cellar.</p>

        <label htmlFor="password" className="block text-[12px] font-medium text-text-tertiary mb-1.5 uppercase tracking-wider">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border-subtle text-[14px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all"
        />

        {error && <p className="text-[13px] text-danger mt-3">{error}</p>}

        <button
          type="submit"
          disabled={!password || submitting}
          className="w-full mt-4 bg-gold/90 hover:bg-gold disabled:opacity-40 text-bg py-2.5 rounded-lg text-[14px] font-semibold transition-colors"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
