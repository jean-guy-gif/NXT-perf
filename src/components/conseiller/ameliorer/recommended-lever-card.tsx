"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { getDiagnosis, getCommonCauses } from "@/lib/coaching/coach-brain";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useAppStore } from "@/stores/app-store";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import {
  deriveProfileLevel,
  getAvgCommissionEur,
} from "@/lib/get-avg-commission";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  /** Ratio recommandé (issu du diagnostic prioritaire ou ?levier=…) */
  expertiseId: ExpertiseRatioId;
  /** Valeur actuelle mesurée du ratio (null si pas de données) */
  currentValue: number | null;
  /** Cible selon le profil */
  targetValue: number;
  /** Gain € estimé sur 30 jours (issu de findCriticitePoints, peut être 0) */
  estimatedGainEur: number;
  /** Callback succès création de plan */
  onPlanCreated?: () => void;
}

/**
 * RecommendedLeverCard — bloc PRINCIPAL "Levier recommandé cette semaine"
 * affiché en haut de /conseiller/ameliorer en mode no-plan (PR3.7.5).
 *
 * Hiérarchie visuelle forte :
 *   - Header "Levier recommandé cette semaine" + badge "Prioritaire"
 *   - Nom du levier (label expertise)
 *   - 1 phrase de cause (commonCauses[0] ou diagnosis)
 *   - 3 stats : Actuel · Cible · Écart % (et gain € si > 0)
 *   - CTA principal "Lancer mon plan 30j"
 */
export function RecommendedLeverCard({
  expertiseId,
  currentValue,
  targetValue,
  estimatedGainEur,
  onPlanCreated,
}: Props) {
  const { category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expertise = RATIO_EXPERTISE[expertiseId];
  const cause =
    getCommonCauses(expertiseId, 1)[0] ??
    truncate(getDiagnosis(expertiseId), 180);

  const isPercent = expertiseId === "pct_exclusivite";
  const fmt = (v: number | null) =>
    v == null ? "—" : isPercent ? `${Math.round(v)} %` : v.toFixed(1);

  const gapPct = (() => {
    if (currentValue == null || targetValue <= 0) return 0;
    if (expertise.direction === "less_is_better") {
      return Math.round(
        Math.max(0, ((currentValue - targetValue) / targetValue) * 100)
      );
    }
    return Math.round(
      Math.max(0, ((targetValue - currentValue) / targetValue) * 100)
    );
  })();

  const handleLaunch = async () => {
    if (!results || pending) return;
    setPending(true);
    setError(null);
    try {
      const measured = buildMeasuredRatios(computedRatios, results);
      const profile = deriveProfileLevel(category);
      const myHistory = allResults.filter(
        (r) => r.userId === useAppStore.getState().user?.id
      );
      const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
      await createPlan30j({
        mode: "targeted",
        ratioId: expertiseId,
        measuredRatios: measured,
        profile,
        avgCommissionEur: avg,
      });
      onPlanCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.startsWith("PLAN_ACTIVE_ALREADY")
          ? "Un plan est déjà actif. Termine-le ou archive-le pour en lancer un nouveau."
          : "Erreur lors de la création du plan."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="Levier recommandé cette semaine"
      className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 shadow-sm md:p-6"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          <Target className="h-3.5 w-3.5" />
          Levier recommandé cette semaine
        </span>
        <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
          Prioritaire
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
        {expertise.label}
      </h2>

      {cause && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {cause}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Résultat actuel" value={fmt(currentValue)} />
        <Stat label="Objectif" value={fmt(targetValue)} />
        <Stat label="Écart" value={`-${gapPct}%`} tone="danger" />
        <Stat
          label="Gain potentiel 30j"
          value={
            estimatedGainEur > 0
              ? `+${formatCurrency(Math.round(estimatedGainEur))}`
              : "À confirmer"
          }
          tone={estimatedGainEur > 0 ? "success" : "muted"}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleLaunch}
        disabled={pending || !results}
        className={cn(
          "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-bold transition-colors sm:w-auto",
          pending || !results
            ? "cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération du plan…
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4" />
            Lancer mon plan 30j
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "success" | "muted";
}) {
  const cls =
    tone === "danger"
      ? "text-red-500"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-500"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", cls)}>{value}</p>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
