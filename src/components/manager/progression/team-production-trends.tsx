"use client";

import { useMemo } from "react";
import {
  Activity,
  Megaphone,
  Home,
  Users,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import {
  determineRhythmStatus,
  getProRationFactor,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

/**
 * TeamProductionTrends — 4 catégories de production équipe
 * (PR3.8.6 — Manager Collectif).
 *
 * Une catégorie = un signal :
 *   - Prospection → Contacts
 *   - Vendeurs    → Mandats signés
 *   - Acheteurs   → Visites
 *   - Ventes      → Actes signés
 *
 * Pour chaque : Réalisé équipe / Objectif mensuel / Objectif à date /
 * statut rythme. Proration intra-mois via `getProRationFactor(today)` —
 * volumes uniquement, pas de ratio ici.
 */

interface CategoryDef {
  key: string;
  label: string;
  indicatorLabel: string;
  icon: typeof Activity;
  /** Lecture du réalisé équipe sur l'agrégat. */
  read: (r: PeriodResults) => number;
  /** Cible mensuelle individuelle (par catégorie de conseiller). */
  monthlyTarget: (cat: keyof typeof CATEGORY_OBJECTIVES) => number;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "prospection",
    label: "Prospection",
    indicatorLabel: "Contacts",
    icon: Megaphone,
    read: (r) => r.prospection.contactsTotaux,
    // 15 contacts par estimation = heuristique alignée sur diagnostic-criticite
    monthlyTarget: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).estimations *
      15,
  },
  {
    key: "vendeurs",
    label: "Vendeurs",
    indicatorLabel: "Mandats signés",
    icon: Home,
    read: (r) => r.vendeurs.mandatsSignes,
    monthlyTarget: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).mandats,
  },
  {
    key: "acheteurs",
    label: "Acheteurs",
    indicatorLabel: "Visites",
    icon: Users,
    read: (r) => r.acheteurs.nombreVisites,
    monthlyTarget: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).visites,
  },
  {
    key: "ventes",
    label: "Ventes",
    indicatorLabel: "Actes signés",
    icon: CheckCircle2,
    read: (r) => r.ventes.actesSignes,
    monthlyTarget: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).actes,
  },
];

const RHYTHM_STYLE: Record<RhythmStatus, { ring: string; pill: string; gap: string }> = {
  ahead: {
    ring: "border-emerald-500/30",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    gap: "text-emerald-600 dark:text-emerald-500",
  },
  on_track: {
    ring: "border-border",
    pill: "bg-muted text-muted-foreground",
    gap: "text-foreground",
  },
  behind: {
    ring: "border-red-500/30",
    pill: "bg-red-500/10 text-red-600 dark:text-red-500",
    gap: "text-red-600 dark:text-red-500",
  },
};

export function TeamProductionTrends() {
  const { conseillers, aggregated } = useTeamResults();

  const rows = useMemo(() => {
    if (conseillers.length === 0 || !aggregated) return null;

    const today = new Date();
    const factor = getProRationFactor(today);

    return CATEGORIES.map((cat) => {
      const monthlyTotal = sumOverAdvisors(conseillers, (c) =>
        cat.monthlyTarget(c.category as keyof typeof CATEGORY_OBJECTIVES),
      );
      const toDate = Math.ceil(monthlyTotal * factor);
      const realised = cat.read(aggregated);
      const rhythm = determineRhythmStatus(realised, toDate);
      const gap = toDate > 0 ? Math.round(((realised - toDate) / toDate) * 100) : 0;
      return {
        ...cat,
        realised,
        monthly: monthlyTotal,
        toDate,
        rhythm,
        gap,
      };
    });
  }, [conseillers, aggregated]);

  if (!rows) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Production équipe
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon;
          const style = RHYTHM_STYLE[row.rhythm];
          return (
            <div
              key={row.key}
              className={cn("rounded-lg border bg-background p-4", style.ring)}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {row.label}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {row.indicatorLabel}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {row.realised}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {row.toDate}
                </span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Mensuel : {row.monthly}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    style.pill,
                  )}
                >
                  {RHYTHM_LABEL[row.rhythm]}
                </span>
                <span className={cn("text-[11px] font-semibold tabular-nums", style.gap)}>
                  {row.gap >= 0 ? "+" : ""}
                  {row.gap}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sumOverAdvisors(advisors: User[], reader: (u: User) => number): number {
  let sum = 0;
  for (const u of advisors) sum += reader(u);
  return sum;
}
