"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
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
import type { CriticitePoint } from "@/lib/diagnostic-criticite";

interface Props {
  /** Autres leviers ratio sous-perf, max 3 affichés (le reste est masqué) */
  others: CriticitePoint[];
  onPlanCreated?: () => void;
}

const HARD_CAP = 3;

/**
 * OtherLeversList — section SECONDAIRE "Autres leviers à travailler"
 * affichée sous le RecommendedLeverCard sur /conseiller/ameliorer mode no-plan.
 *
 * Repliée par défaut pour ne pas concurrencer visuellement le levier recommandé.
 * Cap dur à 3 leviers (les plus critiques), filtrés à `type === "ratio"` —
 * les volumes ne sont pas exposés ici car le plan targeted est ratio-keyed
 * (le levier recommandé principal applique déjà le mapping volume→ratio).
 */
export function OtherLeversList({ others, onPlanCreated }: Props) {
  const [open, setOpen] = useState(false);
  const { category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();
  const [pending, setPending] = useState<ExpertiseRatioId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratioOthers = others.filter((p) => p.type === "ratio").slice(0, HARD_CAP);

  if (ratioOthers.length === 0) return null;

  const handleLaunch = async (ratioId: ExpertiseRatioId) => {
    if (!results || pending) return;
    setPending(ratioId);
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
          ? "Un plan est déjà actif."
          : "Erreur lors de la création du plan."
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <section
      aria-label="Autres leviers à travailler"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">
            Autres leviers à travailler
          </span>
          <span className="block text-xs text-muted-foreground">
            {ratioOthers.length} levier{ratioOthers.length > 1 ? "s" : ""}{" "}
            secondaire{ratioOthers.length > 1 ? "s" : ""} en sous-performance
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-5 py-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          )}
          <ul className="space-y-2">
            {ratioOthers.map((p) => {
              const expertiseId = p.id as ExpertiseRatioId;
              const expertise = RATIO_EXPERTISE[expertiseId];
              const isPercent = expertiseId === "pct_exclusivite";
              const fmt = (v: number) =>
                isPercent ? `${Math.round(v)} %` : v.toFixed(1);
              const gapPct =
                p.type === "ratio"
                  ? Math.round((p._ratio.normalizedGap || 0) * 100)
                  : 0;
              const isPending = pending === expertiseId;
              return (
                <li
                  key={expertiseId}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {expertise.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmt(p.currentValue)} → {fmt(p.targetValue)} · Écart
                      -{gapPct}% · Gain ~
                      {Math.round(p.gainEur).toLocaleString("fr-FR")} €
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLaunch(expertiseId)}
                    disabled={isPending}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
                      isPending && "cursor-wait opacity-70"
                    )}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Génération…
                      </>
                    ) : (
                      <>
                        Lancer
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
