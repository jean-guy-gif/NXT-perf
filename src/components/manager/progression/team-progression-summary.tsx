"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import {
  determineRhythmStatus,
  getProRationFactor,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";

const RHYTHM_STYLE: Record<
  RhythmStatus,
  { wrap: string; pill: string; gap: string; sentence: string }
> = {
  ahead: {
    wrap: "border-emerald-500/30 bg-emerald-500/5",
    pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    gap: "text-emerald-600 dark:text-emerald-500",
    sentence: "en avance",
  },
  on_track: {
    wrap: "border-primary/30 bg-primary/5",
    pill: "bg-muted text-foreground",
    gap: "text-foreground",
    sentence: "dans le rythme",
  },
  behind: {
    wrap: "border-red-500/30 bg-red-500/5",
    pill: "bg-red-500/10 text-red-600 dark:text-red-500",
    gap: "text-red-600 dark:text-red-500",
    sentence: "en retard",
  },
};

/**
 * TeamProgressionSummary — CA équipe avec proration "à date"
 * (PR3.8.6 — Manager Collectif).
 *
 * Source :
 *   - useTeamResults.aggregated : CA réalisé équipe (somme conseillers)
 *   - CATEGORY_OBJECTIVES[c.category].ca : objectif mensuel individuel
 *     → sommé par conseiller pour l'objectif équipe mensuel
 *   - getProRationFactor(today) : proration intra-mois
 *
 * Pas de variation récente affichée : la donnée n'est pas calculée ailleurs
 * et le spec interdit d'inventer.
 */
export function TeamProgressionSummary() {
  const { conseillers, aggregated } = useTeamResults();

  const data = useMemo(() => {
    if (conseillers.length === 0) return null;
    if (!aggregated) return null;

    const monthlyTotal = conseillers.reduce((sum, c) => {
      const cat =
        CATEGORY_OBJECTIVES[c.category as keyof typeof CATEGORY_OBJECTIVES] ??
        CATEGORY_OBJECTIVES.confirme;
      return sum + cat.ca;
    }, 0);

    const today = new Date();
    const factor = getProRationFactor(today);
    const toDateTotal = Math.round(monthlyTotal * factor);
    const realised = aggregated.ventes.chiffreAffaires ?? 0;

    const rhythm = determineRhythmStatus(realised, toDateTotal);
    const gap = toDateTotal > 0 ? (realised - toDateTotal) / toDateTotal : 0;
    const gapPct = Math.round(gap * 100);

    return {
      realised,
      monthly: monthlyTotal,
      toDate: toDateTotal,
      rhythm,
      gapPct,
    };
  }, [conseillers, aggregated]);

  if (!data) return null;

  const style = RHYTHM_STYLE[data.rhythm];

  return (
    <div className={cn("rounded-xl border p-6", style.wrap)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">Synthèse équipe</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre équipe est{" "}
            <span className="font-semibold text-foreground">
              {style.sentence}
            </span>{" "}
            sur son objectif du mois.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            style.pill,
          )}
        >
          {RHYTHM_LABEL[data.rhythm]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Metric label="CA réalisé" value={formatCurrency(data.realised)} />
        <Metric label="Objectif mensuel" value={formatCurrency(data.monthly)} />
        <Metric label="Objectif à date" value={formatCurrency(data.toDate)} />
        <Metric
          label="Écart vs à date"
          value={`${data.gapPct >= 0 ? "+" : ""}${data.gapPct}%`}
          valueClass={style.gap}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums text-foreground",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}
