"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useTeamRatios } from "@/hooks/team/use-team-ratios";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur } from "@/lib/get-avg-commission";
import { getProRationFactor } from "@/lib/performance/pro-rated-objective";
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
    // PR3.8.6 hotfix #2 — On prorate TOUJOURS la cible volume sur today,
    // indépendamment de la période effective des résultats. Cela évite que la
    // criticité équipe remonte un volume sous-perf juste parce qu'on regarde
    // une donnée mensuelle pas encore complète à date (ou en démo, des
    // données passées traitées comme "ce mois").
    const today = new Date();
    const effectiveMonths = getProRationFactor(today);
    return conseillers.map((c) => {
      const results = perConseillerResults.get(c.id) ?? null;
      const computedRatios = perConseillerRatios.get(c.id) ?? [];
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const myHistory = allResults.filter((r) => r.userId === c.id);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        myHistory,
      );
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
