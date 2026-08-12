"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Sign in failed (HTTP ${res.status})`);
      }
      // Read the redirect target here rather than with useSearchParams: that hook
      // forces this page to opt out of prerendering (or be wrapped in Suspense),
      // and the whole point is a full navigation so the new cookie is present on
      // the server render.
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next.startsWith("/") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <div className="text-5xl mb-4">🍷</div>
        <h1 className="font-serif text-[26px] font-semibold mb-1">Wine Ranker</h1>
        <p className="text-[13px] text-text-tertiary mb-6">Enter your password to continue.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          // 16px keeps iOS from zooming the page when the field takes focus.
          className="w-full px-4 py-3 text-[16px] rounded-xl bg-surface-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all text-center"
        />

        {error && <p className="text-[13px] text-danger mt-3">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="w-full mt-4 bg-gold/90 hover:bg-gold disabled:opacity-40 text-bg py-3 rounded-xl text-[14px] font-semibold transition-all"
        >
          {busy ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
