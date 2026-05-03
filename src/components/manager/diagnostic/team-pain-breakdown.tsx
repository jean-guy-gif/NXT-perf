"use client";

import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamLever } from "@/lib/manager/team-diagnostic";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { ComputedRatio } from "@/types/ratios";

type TeamAverage = {
  percentageOfTarget: number;
  status: ComputedRatio["status"];
  value: number;
};

interface TeamPainBreakdownProps {
  /** Top leviers triés (typiquement `allLevers` du diagnostic). */
  levers: TeamLever[];
  /** Map expertiseId → moyenne équipe (% objectif + status). */
  teamAverages: Map<ExpertiseRatioId, TeamAverage>;
  /** Nombre max de leviers à afficher (default 3). */
  limit?: number;
}

const STATUS_STYLES: Record<
  ComputedRatio["status"],
  { bar: string; text: string; bg: string; border: string; label: string }
> = {
  ok: {
    bar: "bg-green-500",
    text: "text-green-600 dark:text-green-500",
    bg: "bg-green-500/5",
    border: "border-green-500/30",
    label: "OK",
  },
  warning: {
    bar: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-500",
    bg: "bg-orange-500/5",
    border: "border-orange-500/30",
    label: "À surveiller",
  },
  danger: {
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-500",
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    label: "En alerte",
  },
};

/**
 * Bloc "Où ça coince concrètement" (PR3.8.3 — Manager Collectif).
 *
 * Affiche le top N (default 3) des leviers les plus problématiques pour
 * l'équipe avec :
 *   - nom du levier
 *   - % moyen équipe vs objectif (issu de useTeamRatios.averages)
 *   - couleur rouge / orange / vert (statut équipe)
 *
 * La barre de progression visualise le % d'objectif atteint (clamp 0-100).
 */
export function TeamPainBreakdown({
  levers,
  teamAverages,
  limit = 3,
}: TeamPainBreakdownProps) {
  const visible = levers.slice(0, limit);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Où ça coince concrètement
        </h3>
      </div>

      <ul className="space-y-2">
        {visible.map((lever) => {
          const avg = teamAverages.get(lever.expertiseId);
          const status = avg?.status ?? "danger";
          const styles = STATUS_STYLES[status];
          const pct = avg?.percentageOfTarget ?? 0;
          const clamped = Math.max(0, Math.min(100, pct));
          return (
            <li
              key={lever.expertiseId}
              className={cn(
                "rounded-lg border px-4 py-3",
                styles.border,
                styles.bg,
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {lever.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lever.frequencyCount}/{lever.totalAdvisors} conseiller
                    {lever.frequencyCount > 1 ? "s" : ""} concerné
                    {lever.frequencyCount > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-base font-bold tabular-nums", styles.text)}>
                    {Math.round(pct)} %
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    de l&apos;objectif
                  </p>
                </div>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(clamped)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn("h-full rounded-full transition-all", styles.bar)}
                  style={{ width: `${clamped}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
