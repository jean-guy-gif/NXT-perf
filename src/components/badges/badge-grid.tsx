"use client";

import { BADGES, BADGE_CATEGORIES } from "@/lib/badges";
import type { BadgeKey } from "@/lib/badges";
import type { DbBadge } from "@/lib/badge-service";
import { useBadgeStore } from "@/stores/badge-store";
import { cn } from "@/lib/utils";

interface BadgeGridProps {
  earnedBadges: DbBadge[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  const earnedKeys = new Set(earnedBadges.map((b) => b.badge_key));
  const allBadges = Object.values(BADGES);
  const totalEarned = earnedBadges.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Mes badges</h2>
        <span className="text-xs text-muted-foreground">{totalEarned}/{allBadges.length}</span>
      </div>

      {BADGE_CATEGORIES.map((cat) => {
        const catBadges = allBadges.filter((b) => b.category === cat.key);
        if (catBadges.length === 0) return null;

        return (
          <div key={cat.key}>
            <p className="text-xs font-medium text-muted-foreground mb-2">{cat.label}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {catBadges.map((badge) => {
                const earned = earnedKeys.has(badge.key);
                const earnedAt = earnedBadges.find((b) => b.badge_key === badge.key)?.earned_at;

                return (
                  <div
                    key={badge.key}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
                      earned
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card opacity-40"
                    )}
                  >
                    <span className="text-2xl">{badge.emoji}</span>
                    <p className={cn("text-[11px] font-medium leading-tight", earned ? "text-foreground" : "text-muted-foreground")}>
                      {badge.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight">{badge.description}</p>
                    {earned && earnedAt && (
                      <p className="text-[8px] text-primary mt-0.5">{formatDate(earnedAt)}</p>
                    )}
                    {earned && (
                      <button
                        type="button"
                        onClick={() => useBadgeStore.getState().queueCelebrations([badge.key as BadgeKey])}
                        className="text-[8px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
                      >
                        Revoir
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
