"use client";

import { useMemo } from "react";
import { Activity, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import { aggregateResults } from "@/lib/aggregate-results";
import {
  computeEffectivePeriodMonths,
  determineRhythmStatus,
  isCurrentMonthInProgress,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

/**
 * TeamProductionTracker — production équipe avec proration "à date"
 * (PR3.8.6 — Manager Collectif).
 *
 * Pour chaque indicateur de production :
 *   - somme des cibles mensuelles individuelles (par catégorie de chaque
 *     conseiller)
 *   - somme des cibles à date (proration intra-mois si la période courante
 *     contient le mois en cours, no-op sinon)
 *   - somme des réalisés équipe (depuis le PeriodResults agrégé)
 *   - statut rythme : "Dans le rythme / En avance / En retard"
 *
 * Pas de scoring nouveau — juste un agrégat mécanique. Pas de ratio :
 * ce composant ne traite que les volumes.
 */

const RHYTHM_STYLE: Record<
  RhythmStatus,
  { bg: string; text: string; ring: string; icon: typeof Check }
> = {
  ahead: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "border-emerald-500/30",
    icon: Check,
  },
  on_track: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "border-emerald-500/30",
    icon: Check,
  },
  behind: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    ring: "border-orange-500/30",
    icon: AlertTriangle,
  },
};

interface VolumeIndicator {
  key: string;
  label: string;
  /** Lecture de la valeur réalisée sur les `PeriodResults` agrégés. */
  read: (r: PeriodResults) => number;
  /** Cible mensuelle individuelle (par catégorie). */
  target: (cat: keyof typeof CATEGORY_OBJECTIVES) => number;
}

const INDICATORS: VolumeIndicator[] = [
  {
    key: "estimations",
    label: "Estimations",
    read: (r) => r.vendeurs.estimationsRealisees,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).estimations,
  },
  {
    key: "mandats",
    label: "Mandats",
    read: (r) => r.vendeurs.mandatsSignes,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).mandats,
  },
  {
    key: "visites",
    label: "Visites",
    read: (r) => r.acheteurs.nombreVisites,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).visites,
  },
  {
    key: "compromis",
    label: "Compromis",
    read: (r) => r.acheteurs.compromisSignes,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).compromis,
  },
  {
    key: "actes",
    label: "Actes",
    read: (r) => r.ventes.actesSignes,
    target: (cat) =>
      (CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme).actes,
  },
];

export function TeamProductionTracker() {
  const isDemo = useAppStore((s) => s.isDemo);
  const { conseillers, perConseillerResults } = useTeamResults();
  const allResults = useAllResults();

  const data = useMemo(() => {
    if (conseillers.length === 0) return null;

    // Agrégation des résultats équipe sur la période représentée par les
    // `perConseillerResults` (mois en cours en démo Fév 2026, ou mois courant
    // en prod). On ré-agrège ici à partir des resultsAll filtrés par les
    // ids conseillers — équivalent au `aggregated` exposé par useTeamResults
    // mais on l'inline pour rester explicite.
    const teamMatching = allResults.filter((r) =>
      conseillers.some((c) => c.id === r.userId),
    );
    const aggregated = teamMatching.length > 0 ? aggregateResults(teamMatching) : null;

    if (!aggregated) return null;

    const today = new Date();
    // Heuristique simple pour la proration : si AU MOINS un conseiller a un
    // PeriodResults dans le mois courant, on considère le mois en cours.
    let inProgress = false;
    for (const c of conseillers) {
      const r = perConseillerResults.get(c.id);
      if (isCurrentMonthInProgress(r ?? null, today)) {
        inProgress = true;
        break;
      }
    }
    const effectiveMonths = computeEffectivePeriodMonths(1, today, inProgress);

    const rows = INDICATORS.map((ind) => {
      // Somme des cibles mensuelles individuelles (chaque conseiller a sa
      // catégorie, donc sa cible).
      const monthly = sumOverAdvisors(conseillers, (c) =>
        ind.target(c.category as keyof typeof CATEGORY_OBJECTIVES),
      );
      const toDate = Math.ceil(monthly * effectiveMonths);
      const actual = ind.read(aggregated);
      const status = determineRhythmStatus(actual, toDate);
      return {
        key: ind.key,
        label: ind.label,
        actual,
        monthly: Math.round(monthly),
        toDate,
        status,
      };
    });

    return { rows, isProrated: inProgress };
  }, [conseillers, perConseillerResults, allResults]);

  if (!data) {
    if (isDemo || conseillers.length === 0) return null;
    return null;
  }

  const { rows, isProrated } = data;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Production équipe
          </h3>
          <p className="text-xs text-muted-foreground">
            {isProrated
              ? "Réalisé équipe vs objectif à date (proratisé sur le mois en cours)."
              : "Réalisé équipe vs objectif mensuel cumulé sur la période."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {rows.map((row) => {
          const style = RHYTHM_STYLE[row.status];
          const Icon = style.icon;
          const pct =
            row.toDate > 0 ? Math.round((row.actual / row.toDate) * 100) : 0;
          return (
            <div
              key={row.key}
              className={cn(
                "rounded-lg border bg-background p-3",
                style.ring,
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {row.actual}
                <span className="text-xs font-normal text-muted-foreground">
                  {" "}
                  / {row.toDate}
                </span>
              </p>
              {isProrated && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Mensuel : {row.monthly}
                </p>
              )}
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  style.bg,
                  style.text,
                )}
              >
                <Icon className="h-3 w-3" />
                {pct}% — {RHYTHM_LABEL[row.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sumOverAdvisors<T>(advisors: User[], reader: (u: User) => number): number {
  let sum = 0;
  for (const u of advisors) sum += reader(u);
  return sum;
}
