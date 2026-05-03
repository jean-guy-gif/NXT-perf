"use client";

import { AlertTriangle, ArrowRight, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { CriticitePoint } from "@/lib/diagnostic-criticite";
import {
  determineRhythmStatus,
  RHYTHM_LABEL,
} from "@/lib/performance/pro-rated-objective";

interface Props {
  verdictPoint: CriticitePoint;
  /** Navigue vers /conseiller/diagnostic?view=ratios|volumes&highlight= */
  onSavoirPourquoi: () => void;
  /** Crée un plan 30j ciblé (si ratio) puis navigue vers /conseiller/ameliorer */
  onAmeliorer: () => void;
  /** Lien discret en bas — ouvre le drawer mode list */
  onSeeOthersClick: () => void;
  /** Pending state pendant la création du plan */
  improving?: boolean;
}

export function DiagnosticVerdictCard({
  verdictPoint,
  onSavoirPourquoi,
  onAmeliorer,
  onSeeOthersClick,
  improving = false,
}: Props) {
  const monthLabel = new Date().toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // ── Champs unifiés selon ratio | volume ─────────────────────────────
  const isRatio = verdictPoint.type === "ratio";
  const expertiseLabel = isRatio
    ? RATIO_EXPERTISE[verdictPoint.id as ExpertiseRatioId]?.label ??
      verdictPoint.label
    : verdictPoint.label;
  const expertiseNote =
    isRatio
      ? RATIO_EXPERTISE[verdictPoint.id as ExpertiseRatioId]?.caImpactNote
      : undefined;

  const verdictKindLabel = isRatio ? "Ratio" : "Volume";

  return (
    <section
      aria-label="Point critique du mois"
      className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Point le plus critique du mois — {monthLabel}
      </div>

      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {verdictKindLabel}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">
        {expertiseLabel}
      </h2>

      {isRatio ? (
        <RatioMetrics point={verdictPoint} />
      ) : (
        <VolumeMetrics point={verdictPoint} />
      )}

      {verdictPoint.gainEur > 0 && (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-background p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-base">{"\u{1F4B0}"}</span>
            Gain potentiel sur 30 jours
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
            +{formatCurrency(Math.round(verdictPoint.gainEur))}
          </p>
          {expertiseNote && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {expertiseNote}
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
              M&apos;améliorer
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

// ─── Sous-blocs métriques ────────────────────────────────────────────────

function RatioMetrics({ point }: { point: Extract<CriticitePoint, { type: "ratio" }> }) {
  const isPercent = point.id === "pct_exclusivite";
  const formatVal = (v: number) =>
    isPercent ? `${Math.round(v)} %` : v.toFixed(1);

  // Écart normalisé (pas de notion temporelle — pas de proration ratio)
  const gapPct = Math.round((point._ratio.normalizedGap || 0) * 100);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">Ton ratio</p>
        <p className="text-xl font-bold tabular-nums text-foreground">
          {formatVal(point.currentValue)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Cible</p>
        <p className="text-xl font-bold tabular-nums text-foreground">
          {formatVal(point.targetValue)}
        </p>
      </div>
      <div className="col-span-2 md:col-span-1">
        <p className="text-xs text-muted-foreground">Écart vs cible</p>
        <p className="text-xl font-bold tabular-nums text-red-500">
          -{gapPct}%
        </p>
      </div>
    </div>
  );
}

function VolumeMetrics({ point }: { point: Extract<CriticitePoint, { type: "volume" }> }) {
  // PR3.8.6 hotfix verdict card — affichage Mensuel + À date + écart signé.
  const realised = Math.round(point.current);
  const monthly = Math.round(point.monthlyTarget);
  const toDate = Math.round(point.target);

  // Écart signé : réalisé - objectif à date / objectif à date
  const gap = toDate > 0 ? (realised - toDate) / toDate : 0;
  const gapPctSigned = Math.round(gap * 100);
  const gapDisplay = gap >= 0 ? `+${gapPctSigned}%` : `${gapPctSigned}%`;

  // Statut rythme — calcul sur l'objectif à date, pas le mensuel.
  const rhythm = determineRhythmStatus(realised, toDate);
  const rhythmLabel = RHYTHM_LABEL[rhythm];

  const RHYTHM_BADGE_CLASS: Record<typeof rhythm, string> = {
    behind: "bg-red-500/10 text-red-600 dark:text-red-500",
    on_track: "bg-muted text-muted-foreground",
    ahead: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  };
  const GAP_TEXT_CLASS: Record<typeof rhythm, string> = {
    behind: "text-red-500",
    on_track: "text-foreground",
    ahead: "text-emerald-500",
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Réalisé</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {realised}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Objectif mensuel</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {monthly}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Objectif à date</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {toDate}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground">
            Écart vs objectif à date
          </p>
          <p
            className={cn(
              "text-xl font-bold tabular-nums",
              GAP_TEXT_CLASS[rhythm],
            )}
          >
            {gapDisplay}
          </p>
        </div>
      </div>

      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
          RHYTHM_BADGE_CLASS[rhythm],
        )}
      >
        {rhythmLabel}
      </span>
    </div>
  );
}
