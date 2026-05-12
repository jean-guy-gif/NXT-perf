"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTeamRatios } from "@/hooks/team/use-team-ratios";
import { useAdvisorsByPain } from "@/hooks/use-advisors-by-pain";
import { buildTeamHeatmap, type TeamHeatmap } from "@/lib/manager/team-heatmap";

/**
 * Hook orchestrant la heatmap conseillers × leviers (Coach-22).
 *
 * Combine :
 *   - `useAdvisorsByPain` (conseillers triés par painScoreV2 desc)
 *   - `useTeamRatios` (ratios calculés par conseiller)
 *   - `buildTeamHeatmap` (logique pure d'assemblage de la matrice)
 *
 * Les lignes sont triées par pain score décroissant : les conseillers les
 * plus en difficulté apparaissent en haut, cohérent avec QW6 de Coach-21
 * et la règle des 3 clics.
 */
export function useTeamHeatmap(): TeamHeatmap {
  const advisorsByPain = useAdvisorsByPain();
  const { perConseillerRatios } = useTeamRatios();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  return useMemo(() => {
    const advisors = advisorsByPain.map((a) => a.advisor);
    return buildTeamHeatmap(advisors, perConseillerRatios, ratioConfigs);
  }, [advisorsByPain, perConseillerRatios, ratioConfigs]);
}
