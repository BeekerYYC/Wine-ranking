"use client";

import { useEffect, useState } from "react";

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((data) => {
        setAchievements(data.achievements);
        setNewlyUnlocked(data.newAchievements.map((a: { key: string }) => a.key));
      });
  }, []);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div>
      <h1 className="text-2xl font-bold text-wine-100 mb-2">Achievements</h1>
      <p className="text-wine-400 text-sm mb-6">
        {unlocked.length} of {achievements.length} badges unlocked
      </p>

      {/* Progress bar */}
      <div className="bg-wine-900/60 rounded-full h-3 mb-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-wine-600 to-grape-500 h-full rounded-full transition-all duration-1000"
          style={{ width: achievements.length > 0 ? `${(unlocked.length / achievements.length) * 100}%` : "0%" }}
        />
      </div>

      {/* Newly unlocked */}
      {newlyUnlocked.length > 0 && (
        <div className="bg-gradient-to-r from-amber-900/40 to-wine-900/40 border border-amber-700/40 rounded-xl p-4 mb-6">
          <h2 className="text-amber-300 font-semibold mb-2">🎉 New Badges Unlocked!</h2>
          <div className="space-y-2">
            {achievements.filter((a) => newlyUnlocked.includes(a.key)).map((a) => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <p className="font-medium text-amber-200">{a.name}</p>
                  <p className="text-sm text-amber-400">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="mb-6">
          <h2 className="text-wine-300 font-semibold mb-3 text-sm uppercase tracking-wide">Unlocked</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {unlocked.map((a) => (
              <div key={a.key} className="bg-wine-900/40 border border-wine-700/40 rounded-xl p-4 text-center hover:bg-wine-900/60 transition-colors">
                <div className="text-4xl mb-2">{a.icon}</div>
                <h3 className="font-semibold text-wine-100 text-sm">{a.name}</h3>
                <p className="text-xs text-wine-400 mt-1">{a.description}</p>
                {a.unlockedAt && (
                  <p className="text-xs text-wine-600 mt-2">{new Date(a.unlockedAt).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-wine-500 font-semibold mb-3 text-sm uppercase tracking-wide">Locked</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {locked.map((a) => (
              <div key={a.key} className="bg-wine-950/60 border border-wine-900/40 rounded-xl p-4 text-center opacity-50">
                <div className="text-4xl mb-2 grayscale">🔒</div>
                <h3 className="font-semibold text-wine-600 text-sm">{a.name}</h3>
                <p className="text-xs text-wine-700 mt-1">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
