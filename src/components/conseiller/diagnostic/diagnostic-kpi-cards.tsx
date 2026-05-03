"use client";

import { Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import {
  determineRhythmStatus,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";
import type { PeriodResults } from "@/types/results";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import type { DiagnosticView } from "./diagnostic-toggle";

type Status = "ok" | "warning" | "danger";

const STATUS_STYLE: Record<
  Status,
  { bg: string; text: string; ring: string; icon: typeof Check; label: string }
> = {
  ok: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "border-emerald-500/30",
    icon: Check,
    label: "Surperf",
  },
  warning: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    ring: "border-orange-500/30",
    icon: AlertTriangle,
    label: "À surveiller",
  },
  danger: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    ring: "border-red-500/30",
    icon: X,
    label: "Sous-perf",
  },
};

// PR3.8.6 — mapping rythme → style. "Dans le rythme" = ok, "En avance" = ok
// avec accent positif, "En retard" = warning. La criticité plus stricte (red)
// est portée par `findCriticitePoints` qui pondère par gain € — pas par cette
// carte de KPI.
const RHYTHM_STATUS_MAP: Record<RhythmStatus, Status> = {
  ahead: "ok",
  on_track: "ok",
  behind: "warning",
};

interface Props {
  view: DiagnosticView;
  results: PeriodResults | null;
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  category: UserCategory;
  /** Échelle d'objectif mensuel brute (1 = mois, 12 = année…). Sert à
   *  afficher l'objectif mensuel cumulé sur la période. */
  periodMonths: number;
  /** Échelle d'objectif EFFECTIVE après proration intra-mois.
   *  Sert au calcul de l'objectif "à date" et du statut rythme.
   *  Si non fourni, retombe sur `periodMonths` (compat ancien comportement). */
  effectiveMonths?: number;
  /**
   * Identifiant de l'élément à mettre en surbrillance.
   * Format : "ratio:<RatioId>" ou "volume:<volumeKey>".
   */
  highlightedItem?: string | null;
}

/**
 * DiagnosticKpiCards — cartes colorées rouge/orange/vert sur 4 volumes
 * prioritaires + 4 ratios prioritaires. Affichage filtré par toggle V/R/Les deux.
 *
 * PR3.8.6 :
 *   - Volumes : 2 cibles affichées — Objectif mensuel (référence) +
 *     Objectif à date (proraté), statut "Dans le rythme / En avance / En
 *     retard" calculé sur l'objectif à date.
 *   - Ratios : aucun changement, pas de proration temporelle.
 */
export function DiagnosticKpiCards({
  view,
  results,
  computedRatios,
  ratioConfigs,
  category,
  periodMonths,
  effectiveMonths,
  highlightedItem = null,
}: Props) {
  if (!results) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aucune donnée pour cette période.
      </div>
    );
  }

  const obj = CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  const m = Math.max(1, periodMonths);
  const mEffective = effectiveMonths ?? m;

  const volumes = [
    {
      key: "estimations",
      label: "Estimations",
      actual: results.vendeurs.estimationsRealisees,
      monthly: obj.estimations,
    },
    {
      key: "mandats",
      label: "Mandats signés",
      actual: results.vendeurs.mandatsSignes,
      monthly: obj.mandats,
    },
    {
      key: "visites",
      label: "Visites",
      actual: results.acheteurs.nombreVisites,
      monthly: obj.visites,
    },
    {
      key: "compromis",
      label: "Compromis",
      actual: results.acheteurs.compromisSignes,
      monthly: obj.compromis,
    },
  ];

  const RATIO_PRIORITY: RatioId[] = [
    "rdv_mandats",
    "pct_mandats_exclusifs",
    "visites_offre",
    "offres_compromis",
  ];
  const ratios = RATIO_PRIORITY.map((id) => {
    const c = computedRatios.find((r) => r.ratioId === id);
    const cfg = ratioConfigs[id];
    if (!c || !cfg) return null;
    return { id, computed: c, config: cfg };
  }).filter(Boolean) as Array<{
    id: RatioId;
    computed: ComputedRatio;
    config: RatioConfig;
  }>;

  const showVolumes = view === "volumes" || view === "both";
  const showRatios = view === "ratios" || view === "both";
  const isProrated = mEffective < m - 0.0001;

  return (
    <div className="space-y-6">
      {showVolumes && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Volumes
            </h3>
            <span className="text-xs text-muted-foreground">
              {isProrated ? "— réalisé / objectif à date" : "— réalisé / objectif"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {volumes.map((v) => {
              const targetMonthly = Math.round(v.monthly * m);
              const targetToDate = Math.ceil(v.monthly * mEffective);
              const rhythm = determineRhythmStatus(v.actual, targetToDate);
              const s = RHYTHM_STATUS_MAP[rhythm];
              const style = STATUS_STYLE[s];
              const Icon = style.icon;
              const pct =
                targetToDate > 0
                  ? Math.round((v.actual / targetToDate) * 100)
                  : 0;
              const isHighlighted = highlightedItem === `volume:${v.key}`;
              return (
                <div
                  key={v.key}
                  data-highlight-id={`volume:${v.key}`}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-all duration-300",
                    style.ring,
                    isHighlighted &&
                      "scale-[1.02] ring-2 ring-primary shadow-lg animate-pulse"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {v.actual}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / {targetToDate}
                    </span>
                  </p>
                  {isProrated && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Mensuel : {targetMonthly}
                    </p>
                  )}
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      style.bg,
                      style.text
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {pct}% — {isProrated ? RHYTHM_LABEL[rhythm] : style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRatios && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Ratios
            </h3>
            <span className="text-xs text-muted-foreground">
              — actuel vs cible
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ratios.map(({ id, computed, config }) => {
              const style = STATUS_STYLE[computed.status];
              const Icon = style.icon;
              const isHighlighted = highlightedItem === `ratio:${id}`;
              return (
                <div
                  key={id}
                  data-highlight-id={`ratio:${id}`}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-all duration-300",
                    style.ring,
                    isHighlighted &&
                      "scale-[1.02] ring-2 ring-primary shadow-lg animate-pulse"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{config.name}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {config.isPercentage
                      ? `${Math.round(computed.value)}%`
                      : computed.value.toFixed(1)}
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      style.bg,
                      style.text
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    Cible {computed.thresholdForCategory}
                    {config.isPercentage ? "%" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
