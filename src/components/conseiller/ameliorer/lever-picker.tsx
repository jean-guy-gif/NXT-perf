"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useUser } from "@/hooks/use-user";
import { useRatios } from "@/hooks/use-ratios";
import { useResults } from "@/hooks/use-results";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useAppStore } from "@/stores/app-store";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import {
  deriveProfileLevel,
  getAvgCommissionEur,
} from "@/lib/get-avg-commission";
import { findCriticitePoints } from "@/lib/diagnostic-criticite";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  /** Levier pré-sélectionné depuis ?levier=… */
  preselected?: ExpertiseRatioId | null;
  /** Callback quand un plan est créé avec succès */
  onPlanCreated?: () => void;
}

export function LeverPicker({ preselected, onPlanCreated }: Props) {
  const { user, category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  const allResults = useAppStore((s) => s.results);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();

  const [pending, setPending] = useState<ExpertiseRatioId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const criticite = useMemo(() => {
    if (!user || !results || computedRatios.length === 0)
      return { top: null, others: [] };
    const measured = buildMeasuredRatios(computedRatios, results);
    const profile = deriveProfileLevel(category);
    const myHistory = allResults.filter((r) => r.userId === user.id);
    const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
    return findCriticitePoints(measured, profile, avg);
  }, [user, results, computedRatios, category, allResults, agencyObjective]);

  const allLevers = useMemo(() => {
    const list = criticite.top
      ? [criticite.top, ...criticite.others]
      : criticite.others;
    return list;
  }, [criticite]);

  const handleLaunch = async (ratioId: ExpertiseRatioId) => {
    if (!user || !results) return;
    setPending(ratioId);
    setError(null);
    try {
      const measured = buildMeasuredRatios(computedRatios, results);
      const profile = deriveProfileLevel(category);
      const myHistory = allResults.filter((r) => r.userId === user.id);
      const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
      await createPlan30j({
        mode: "targeted",
        ratioId,
        measuredRatios: measured,
        profile,
        avgCommissionEur: avg,
      });
      onPlanCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.startsWith("PLAN_ACTIVE_ALREADY")
          ? "Un plan est déjà actif. Terminez-le ou attendez son expiration."
          : "Erreur lors de la création du plan."
      );
    } finally {
      setPending(null);
    }
  };

  if (allLevers.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <p className="text-sm font-semibold text-emerald-500">
          Aucun ratio en sous-performance détecté
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tous vos ratios sont conformes aux objectifs de votre profil.
          Continuez votre saisie hebdomadaire pour suivre votre évolution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">
        Choisissez votre levier
      </h3>
      <p className="text-sm text-muted-foreground">
        Chaque levier estime le gain que vous pourriez générer en 30 jours en
        ramenant le ratio à la cible de votre profil.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {allLevers.map((p) => {
          const expertise = RATIO_EXPERTISE[p.expertiseId];
          const isPercent = p.expertiseId === "pct_exclusivite";
          const fmt = (v: number) =>
            isPercent ? `${Math.round(v)} %` : v.toFixed(1);
          const gapPct = Math.round((p.normalizedGap || 0) * 100);
          const isPreselected = preselected === p.expertiseId;
          const isPending = pending === p.expertiseId;

          return (
            <li
              key={p.expertiseId}
              className={cn(
                "rounded-xl border bg-card p-4 transition-all",
                isPreselected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {expertise.label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Actuel : </span>
                  <span className="font-bold text-foreground">
                    {fmt(p.currentValue)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cible : </span>
                  <span className="font-bold text-foreground">
                    {fmt(p.targetValue)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Écart : </span>
                  <span className="font-bold text-red-500">-{gapPct}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gain ~ </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">
                    +{formatCurrency(Math.round(p.estimatedCaLossEur))}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleLaunch(p.expertiseId)}
                disabled={isPending}
                className={cn(
                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  isPending
                    ? "cursor-wait bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    Lancer le plan 30j
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
