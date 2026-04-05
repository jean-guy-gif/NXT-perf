"use client";

import { useState, useEffect } from "react";
import { BADGES } from "@/lib/badges";
import type { BadgeKey } from "@/lib/badges";

interface BadgeToastProps {
  badgeKey: BadgeKey;
  onDismiss: () => void;
}

export function BadgeToast({ badgeKey, onDismiss }: BadgeToastProps) {
  const [visible, setVisible] = useState(false);
  const badge = BADGES[badgeKey];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-4 right-4 z-[200] flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <span className="text-3xl">{badge.emoji}</span>
      <div>
        <p className="text-xs font-medium text-amber-500">Nouveau badge débloqué !</p>
        <p className="text-sm font-bold text-foreground">{badge.name}</p>
        <p className="text-[11px] text-muted-foreground">{badge.description}</p>
      </div>
    </div>
  );
}
