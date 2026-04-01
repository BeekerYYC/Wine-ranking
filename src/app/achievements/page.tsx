"use client";

import { useEffect, useState } from "react";

interface Achievement {
  key: string; name: string; description: string; icon: string;
  unlocked: boolean; unlockedAt: string | null;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/achievements").then((r) => r.json()).then((data) => {
      setAchievements(data.achievements);
      setNewlyUnlocked(data.newAchievements.map((a: { key: string }) => a.key));
    });
  }, []);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const pct = achievements.length > 0 ? Math.round((unlocked.length / achievements.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Badges</h1>
          <p className="text-[13px] text-text-tertiary mt-0.5">{unlocked.length}/{achievements.length} unlocked</p>
        </div>
        <span className="text-[14px] text-gold font-bold tabular-nums">{pct}%</span>
      </div>

      {/* Progress */}
      <div className="bg-surface-raised rounded-full h-1.5 mb-6 overflow-hidden border border-border-subtle">
        <div className="bg-gold h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {/* New unlocks */}
      {newlyUnlocked.length > 0 && (
        <div className="bg-gold-muted border border-gold/15 rounded-xl p-4 mb-6">
          <p className="text-[10px] text-gold uppercase tracking-widest font-medium mb-2.5">New badges unlocked</p>
          {achievements.filter((a) => newlyUnlocked.includes(a.key)).map((a) => (
            <div key={a.key} className="flex items-center gap-3 mt-2">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{a.name}</p>
                <p className="text-[11px] text-text-tertiary">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Unlocked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unlocked.map((a) => (
              <div key={a.key} className="bg-surface-raised rounded-xl border border-border-subtle p-4 text-center hover:border-border transition-all">
                <div className="text-3xl mb-2">{a.icon}</div>
                <h3 className="text-[12px] font-semibold text-text-primary">{a.name}</h3>
                <p className="text-[10px] text-text-muted mt-1">{a.description}</p>
                {a.unlockedAt && <p className="text-[10px] text-text-muted mt-2 tabular-nums">{new Date(a.unlockedAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium mb-3">Locked</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {locked.map((a) => (
              <div key={a.key} className="bg-surface rounded-xl border border-border-subtle p-4 text-center opacity-30">
                <div className="text-2xl mb-2">&#128274;</div>
                <h3 className="text-[12px] font-medium text-text-muted">{a.name}</h3>
                <p className="text-[10px] text-text-muted mt-1">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
