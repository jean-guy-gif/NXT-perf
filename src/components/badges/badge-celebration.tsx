"use client";

import { useEffect, useState } from "react";
import { BADGES, BADGE_CATEGORIES } from "@/lib/badges";
import { useBadgeStore } from "@/stores/badge-store";

export function BadgeCelebration() {
  const currentCelebration = useBadgeStore((s) => s.currentCelebration);
  const nextCelebration = useBadgeStore((s) => s.nextCelebration);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!currentCelebration) { setVisible(false); return; }

    // Animate in
    requestAnimationFrame(() => setVisible(true));
    setProgress(100);

    // Animate progress bar
    const start = Date.now();
    const duration = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);

    // Auto-close after 4s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(nextCelebration, 300);
    }, duration);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [currentCelebration, nextCelebration]);

  if (!currentCelebration) return null;

  const badge = BADGES[currentCelebration];
  const category = BADGE_CATEGORIES.find((c) => c.key === badge.category);

  const handleClose = () => {
    setVisible(false);
    setTimeout(nextCelebration, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-300 ${
        visible ? "bg-black/60 backdrop-blur-sm" : "bg-transparent pointer-events-none"
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col items-center gap-4 rounded-3xl border border-amber-500/30 bg-card p-8 shadow-2xl shadow-amber-500/10 max-w-sm w-full mx-4 transition-all duration-400 ${
          visible ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        {/* Badge emoji with bounce animation */}
        <div className="animate-bounce text-[96px] leading-none">
          {badge.emoji}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-amber-500">
          Nouveau badge débloqué !
        </p>

        {/* Badge name */}
        <h2 className="text-2xl font-bold text-foreground text-center">
          {badge.name}
        </h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          {badge.description}
        </p>

        {/* Category */}
        <span className="rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-medium text-primary uppercase tracking-wide">
          {category?.label ?? badge.category}
        </span>

        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Super !
        </button>
      </div>
    </div>
  );
}
