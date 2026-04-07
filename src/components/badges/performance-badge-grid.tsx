"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { useAppStore } from "@/stores/app-store";
import {
  PERFORMANCE_BADGES,
  LEVEL_LABELS,
  LEVEL_EMOJI,
} from "@/lib/performance-badge-service";
import type { DbPerformanceBadge } from "@/lib/performance-badge-service";
import { cn } from "@/lib/utils";

export function PerformanceBadgeGrid() {
  const supabase = useSupabase();
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const [badges, setBadges] = useState<DbPerformanceBadge[]>([]);

  useEffect(() => {
    if (isDemo || !user?.id) return;
    supabase
      .from("performance_badges")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setBadges(data as DbPerformanceBadge[]);
      });
  }, [supabase, user?.id, isDemo]);

  const badgeMap = new Map(badges.map((b) => [b.badge_key, b]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Badges de performance
        </h2>
        <span className="text-xs text-muted-foreground">
          {badges.filter((b) => b.is_active).length}/{PERFORMANCE_BADGES.length} actifs
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PERFORMANCE_BADGES.map((def) => {
          const earned = badgeMap.get(def.key);
          const isActive = earned?.is_active;

          return (
            <div
              key={def.key}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                isActive
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card opacity-40"
              )}
            >
              <span className="text-2xl">{def.emoji}</span>
              <p className={cn("text-[11px] font-medium leading-tight", isActive ? "text-foreground" : "text-muted-foreground")}>
                {def.name}
              </p>
              {isActive && earned && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">{LEVEL_EMOJI[earned.level]}</span>
                  <span className="text-[10px] font-medium text-primary">
                    {LEVEL_LABELS[earned.level]}
                  </span>
                </div>
              )}
              {isActive && earned && (
                <p className="text-[8px] text-muted-foreground">
                  {earned.consecutive_months} mois cons\u00e9cutif{earned.consecutive_months > 1 ? "s" : ""}
                </p>
              )}
              {!isActive && earned && (
                <p className="text-[8px] text-muted-foreground italic">Perdu</p>
              )}
              {!earned && (
                <p className="text-[8px] text-muted-foreground">Non atteint</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
