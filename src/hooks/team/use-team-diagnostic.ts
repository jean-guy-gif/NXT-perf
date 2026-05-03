"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useTeamRatios } from "@/hooks/team/use-team-ratios";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur } from "@/lib/get-avg-commission";
import {
  computeEffectivePeriodMonths,
  isCurrentMonthInProgress,
} from "@/lib/performance/pro-rated-objective";
import {
  aggregateTeamDiagnostic,
  type AdvisorDiagnosticInput,
  type TeamDiagnosticResult,
} from "@/lib/manager/team-diagnostic";
import type { ComputedRatio, RatioId } from "@/types/ratios";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface UseTeamDiagnosticReturn extends TeamDiagnosticResult {
  loading: boolean;
  /**
   * Moyenne équipe par expertiseId — % de l'objectif (`percentageOfTarget`)
   * + statut OK/warning/danger calculé sur le seuil "confirme" (proxy
   * benchmark, cf. `useTeamRatios`).
   */
  teamAveragesByExpertise: Map<
    ExpertiseRatioId,
    { percentageOfTarget: number; status: ComputedRatio["status"]; value: number }
  >;
}

/**
 * Hook orchestrant le diagnostic équipe pour le mode Collectif Manager V3.
 *
 * Combine :
 *   - useTeamResults (conseillers + résultats agrégés par conseiller)
 *   - useTeamRatios  (ratios calculés par conseiller + moyennes équipe)
 *   - aggregateTeamDiagnostic (logique pure d'agrégation)
 *
 * Sortie : leviers prioritaires équipe + map des moyennes par levier
 * (utilisée par le bloc "Où ça coince concrètement" pour afficher le %
 * moyen équipe + couleur).
 */
export function useTeamDiagnostic(): UseTeamDiagnosticReturn {
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const allResults = useAllResults();
  const { conseillers, perConseillerResults, loading } = useTeamResults();
  const { perConseillerRatios, averages } = useTeamRatios();

  const advisorsInput = useMemo<AdvisorDiagnosticInput[]>(() => {
    // PR3.8.6 — On prorate la cible volume sur la portion du mois écoulée
    // pour chaque conseiller. Si les `results` couvrent un mois passé
    // complet, `effectiveMonths` retombe à 1 (no-op). En mode démo où les
    // données sont en Fév 2026 et today = May 2026, la proration ne
    // s'applique pas.
    const today = new Date();
    return conseillers.map((c) => {
      const results = perConseillerResults.get(c.id) ?? null;
      const computedRatios = perConseillerRatios.get(c.id) ?? [];
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const myHistory = allResults.filter((r) => r.userId === c.id);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        myHistory,
      );
      const inProgress = isCurrentMonthInProgress(results, today);
      const effectiveMonths = computeEffectivePeriodMonths(1, today, inProgress);
      return {
        user: c,
        results,
        computedRatios,
        measuredRatios,
        avgCommissionEur,
        periodMonths: effectiveMonths,
      };
    });
  }, [conseillers, perConseillerResults, perConseillerRatios, allResults, agencyObjective]);

  const diagnostic = useMemo(
    () => aggregateTeamDiagnostic(advisorsInput, 2),
    [advisorsInput],
  );

  const teamAveragesByExpertise = useMemo(() => {
    const map = new Map<
      ExpertiseRatioId,
      { percentageOfTarget: number; status: ComputedRatio["status"]; value: number }
    >();
    for (const avg of averages) {
      const expertiseId = RATIO_ID_TO_EXPERTISE_ID[avg.ratioId as RatioId];
      if (!expertiseId) continue;
      map.set(expertiseId, {
        percentageOfTarget: avg.percentageOfTarget,
        status: avg.status,
        value: avg.value,
      });
    }
    return map;
  }, [averages]);

  return {
    ...diagnostic,
    teamAveragesByExpertise,
    loading,
  };
}
