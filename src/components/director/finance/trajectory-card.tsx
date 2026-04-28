"use client";

import { useMemo } from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { aggregateResults } from "@/lib/aggregate-results";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  calculateTrajectoire,
  type TrajectoryResult,
} from "@/lib/finance-trajectory";
import type { PeriodResults } from "@/types/results";

/**
 * Hook d'accès consolidé à la trajectoire 3 mois pour la page Directeur :
 * - récupère les conseillers de l'institutionId du Directeur
 * - regroupe leurs results par cohorte mensuelle (offset relatif à NOW)
 * - construit l'historique 6 mois agrégé (par mois) et les inputs trajectoire
 * - lit chargesFixesMensuelles depuis financialData
 * - retourne le TrajectoryResult complet
 *
 * Le hook est exporté pour permettre à la page de driver l'AlertBanner
 * conditionnel sans recalcul redondant.
 */
export function useDirectorTrajectory(): TrajectoryResult {
  const directorInstitutionId = useAppStore((s) => s.user?.institutionId);
  const users = useAppStore((s) => s.users);
  const allResults = useAllResults();
  const chargesFixesMensuelles = useAppStore(
    (s) => s.financialData.chargesFixesMensuelles ?? 0,
  );

  return useMemo<TrajectoryResult>(() => {
    const conseillers = users.filter(
      (u) =>
        u.role === "conseiller" &&
        (!directorInstitutionId || u.institutionId === directorInstitutionId),
    );
    const conseillerIds = new Set(conseillers.map((c) => c.id));

    const ref = new Date();
    const refY = ref.getFullYear();
    const refM = ref.getMonth();

    // Regroupement results par cohorte (monthsOffset = mois écoulés depuis "now").
    const byOffset = new Map<number, PeriodResults[]>();
    for (const r of allResults) {
      if (!conseillerIds.has(r.userId)) continue;
      const d = new Date(r.periodStart);
      const offset = (refY - d.getFullYear()) * 12 + (refM - d.getMonth());
      if (offset < 0) continue; // future, ignoré
      if (!byOffset.has(offset)) byOffset.set(offset, []);
      byOffset.get(offset)!.push(r);
    }

    // monthsHistory : 6 derniers mois agrégés (un PeriodResults agrégé par mois disponible).
    const monthsHistory: PeriodResults[] = [];
    for (let i = 0; i < 6; i++) {
      const monthResults = byOffset.get(i);
      if (!monthResults) continue;
      const agg = aggregateResults(monthResults);
      if (agg) monthsHistory.push(agg);
    }

    // compromisEnCours : compromis signés agrégés sur offsets 0, 1, 2 (fenêtre 3 mois).
    let compromisEnCours = 0;
    for (let i = 0; i < 3; i++) {
      const monthResults = byOffset.get(i);
      if (!monthResults) continue;
      compromisEnCours += monthResults.reduce(
        (s, r) => s + (r.acheteurs?.compromisSignes ?? 0),
        0,
      );
    }

    // mandatsByCohort : offset → nombre de mandats signés.
    const mandatsByCohort: Record<number, number> = {};
    for (const [offset, monthResults] of byOffset.entries()) {
      mandatsByCohort[offset] = monthResults.reduce(
        (s, r) => s + (r.vendeurs?.mandatsSignes ?? 0),
        0,
      );
    }

    // pctExclusivite : sur tous les mandats[] récents (offsets 0..4).
    let totalMandats = 0;
    let exclusifs = 0;
    for (let i = 0; i <= 4; i++) {
      const monthResults = byOffset.get(i);
      if (!monthResults) continue;
      for (const r of monthResults) {
        for (const m of r.vendeurs?.mandats ?? []) {
          totalMandats++;
          if (m.type === "exclusif") exclusifs++;
        }
      }
    }
    const pctExclusivite = totalMandats > 0 ? exclusifs / totalMandats : 0;

    return calculateTrajectoire({
      compromisEnCours,
      mandatsByCohort,
      pctExclusivite,
      monthsHistory,
      chargesFixesMensuelles,
    });
  }, [allResults, users, directorInstitutionId, chargesFixesMensuelles]);
}

interface TrajectoryCardProps {
  /** Optionnel : permet à la page de partager la même computation avec AlertBanner. */
  trajectoire?: TrajectoryResult;
}

export function TrajectoryCard({ trajectoire: externalTrajectoire }: TrajectoryCardProps = {}) {
  const internalTrajectoire = useDirectorTrajectory();
  const trajectoire = externalTrajectoire ?? internalTrajectoire;
  const chargesFixesMensuelles = useAppStore(
    (s) => s.financialData.chargesFixesMensuelles ?? 0,
  );

  if (!trajectoire.canCalculate) {
    return (
      <DegradedTrajectoryCard
        monthsAvailable={trajectoire.monthsAvailable}
        hasChargesFixes={chargesFixesMensuelles > 0}
      />
    );
  }

  const {
    caSecurise,
    caProbable,
    totalProjete,
    pointMort3Mois,
    ratioVsPointMort,
    delaiPondere,
    pctExclusivite,
    status,
  } = trajectoire;
  const pctSecurise = totalProjete > 0 ? (caSecurise / totalProjete) * 100 : 0;
  const pctProbable = totalProjete > 0 ? (caProbable / totalProjete) * 100 : 0;
  const ratioFormatted = ratioVsPointMort.toFixed(1).replace(".", ",");

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Trajectoire à 3 mois</h3>
      </div>

      {/* Bar 1 — CA sécurisé (compromis → acte sous 3 mois) */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            CA sécurisé (compromis → acte sous 3 mois)
          </span>
          <span className="text-muted-foreground tabular-nums">
            {pctSecurise.toFixed(0)}% du total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pctSecurise}%` }}
            />
          </div>
          <span className="w-28 text-right text-sm font-bold tabular-nums text-foreground">
            {formatCurrency(caSecurise)}
          </span>
        </div>
      </div>

      {/* Bar 2 — CA probable (mandats → compromis → acte) */}
      <div className="mb-2">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            CA probable (mandats → compromis → acte)
          </span>
          <span className="text-muted-foreground tabular-nums">
            {pctProbable.toFixed(0)}% du total
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${pctProbable}%` }}
            />
          </div>
          <span className="w-28 text-right text-sm font-bold tabular-nums text-foreground">
            {formatCurrency(caProbable)}
          </span>
        </div>
      </div>

      <p className="mb-4 text-[10px] italic text-muted-foreground">
        {(pctExclusivite * 100).toFixed(0)}% exclusifs · délai pondéré{" "}
        {Math.round(delaiPondere)}j
      </p>

      {/* Séparateur + Total + Point mort */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total projeté</span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {formatCurrency(totalProjete)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Point mort 3 mois</span>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatCurrency(pointMort3Mois)}
          </span>
        </div>
      </div>

      {/* Footer ratio coloré */}
      <div
        className={cn(
          "mt-4 rounded-lg p-3 text-sm font-medium",
          status === "saine" && "bg-emerald-500/10 text-emerald-500",
          status === "vigilance" && "bg-orange-500/10 text-orange-500",
          status === "risque" && "bg-red-500/10 text-red-500",
        )}
      >
        {status === "saine" && (
          <>✅ Vous couvrez {ratioFormatted}× votre point mort sur le trimestre à venir</>
        )}
        {status === "vigilance" && (
          <>⚠️ Vous couvrez {ratioFormatted}× votre point mort — vigilance</>
        )}
        {status === "risque" && (
          <>🚨 Vous couvrez seulement {ratioFormatted}× votre point mort — pousser la prospection</>
        )}
      </div>
    </div>
  );
}

function DegradedTrajectoryCard({
  monthsAvailable,
  hasChargesFixes,
}: {
  monthsAvailable: number;
  hasChargesFixes: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">
          Trajectoire à 3 mois
        </h3>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">CA sécurisé</span>
            <span className="text-muted-foreground tabular-nums">— € · 0%</span>
          </div>
          <div className="h-3 rounded-full bg-muted/40" />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">CA probable</span>
            <span className="text-muted-foreground tabular-nums">— € · 0%</span>
          </div>
          <div className="h-3 rounded-full bg-muted/40" />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {!hasChargesFixes
            ? "Renseignez vos charges fixes mensuelles pour activer le calcul de trajectoire."
            : `Trajectoire calculable après 3 mois de données. Disponibles : ${monthsAvailable}.`}
        </p>
      </div>
    </div>
  );
}
