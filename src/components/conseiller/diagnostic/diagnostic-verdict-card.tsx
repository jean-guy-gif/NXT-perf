"use client";

import { AlertTriangle, ArrowRight, Loader2, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";

interface Props {
  verdict: PainPointResult;
  /** Active le toggle Volumes/Ratios + scroll auto + surbrillance (pas de drawer) */
  onSavoirPourquoi: () => void;
  /** Crée un plan 30j ciblé puis navigue vers /conseiller/ameliorer */
  onAmeliorer: () => void;
  /** Lien discret en bas — ouvre le drawer mode list */
  onSeeOthersClick: () => void;
  /** Pending state pendant la création du plan */
  improving?: boolean;
}

export function DiagnosticVerdictCard({
  verdict,
  onSavoirPourquoi,
  onAmeliorer,
  onSeeOthersClick,
  improving = false,
}: Props) {
  const expertise = RATIO_EXPERTISE[verdict.expertiseId];
  const monthLabel = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Écart % vs cible (signé : positif si sous-perf)
  const targetVal = verdict.targetValue || 1;
  const gapPct = Math.round((verdict.normalizedGap || 0) * 100);

  // Affichage des valeurs : %, ratio absolu selon ratio
  const isPercent = verdict.expertiseId === "pct_exclusivite";
  const formatVal = (v: number) =>
    isPercent ? `${Math.round(v)} %` : v.toFixed(1);

  return (
    <section
      aria-label="Point critique du mois"
      className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Point le plus critique du mois — {monthLabel}
      </div>

      <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
        {expertise.label}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Ton ratio</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {formatVal(verdict.currentValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Objectif</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {formatVal(targetVal)}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground">Écart vs objectif</p>
          <p className="text-xl font-bold tabular-nums text-red-500">
            -{gapPct}%
          </p>
        </div>
      </div>

      {verdict.estimatedCaLossEur > 0 && (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-background p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-base">{"\u{1F4B0}"}</span>
            Gain potentiel sur 30 jours
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
            +{formatCurrency(Math.round(verdict.estimatedCaLossEur))}
          </p>
          {expertise.caImpactNote && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {expertise.caImpactNote}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSavoirPourquoi}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Savoir pourquoi
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAmeliorer}
          disabled={improving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
        >
          {improving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération…
            </>
          ) : (
            <>
              <Wrench className="h-4 w-4" />
              M'améliorer
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onSeeOthersClick}
        className="mt-3 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Voir les autres points en danger →
      </button>
    </section>
  );
}
