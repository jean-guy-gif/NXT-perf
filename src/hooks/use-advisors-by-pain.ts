"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useTeamRatios } from "@/hooks/team/use-team-ratios";
import { useManagerView } from "@/hooks/use-manager-view";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import { detectBiggestPainPoint } from "@/lib/pain-point-detector";
import {
  bucketTeamSize,
  type ThresholdContext,
} from "@/lib/diagnostic/resolve-threshold";
import type { User } from "@/types/user";

export interface AdvisorWithPain {
  advisor: User;
  /** painScoreV2 composite (0-1) — null si conseiller sans data exploitable. */
  painScore: number | null;
  /** Gain potentiel € sur le top pain — null si pas de pain. */
  topGainEur: number | null;
}

/**
 * Sous-PR Coach-21 (meeting alignement).
 *
 * Retourne la liste des conseillers du manager triée par `painScoreV2`
 * décroissant — les conseillers les plus en difficulté en premier dans le
 * dropdown. Les conseillers sans data exploitable (pas de résultats, pas de
 * commission moyenne) sont placés en fin de liste.
 *
 * Alimente le dropdown `ManagerViewSwitcher` pour appliquer la règle des
 * "3 clics max" : le manager arrive sur celui qui a besoin de lui en
 * priorité, sans chercher dans une liste alphabétique.
 */
export function useAdvisorsByPain(): AdvisorWithPain[] {
  const { advisors } = useManagerView();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const allResults = useAllResults();
  const { perConseillerResults } = useTeamResults();
  const { perConseillerRatios } = useTeamRatios();

  return useMemo(() => {
    if (advisors.length === 0) return [];

    const teamSizeBucket = bucketTeamSize(advisors.length);

    const enriched: AdvisorWithPain[] = advisors.map((advisor) => {
      const results = perConseillerResults.get(advisor.id) ?? null;
      const computedRatios = perConseillerRatios.get(advisor.id) ?? [];
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const history = allResults.filter((r) => r.userId === advisor.id);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        history,
      );

      if (!results || measuredRatios.length === 0 || avgCommissionEur <= 0) {
        return { advisor, painScore: null, topGainEur: null };
      }

      const ctx: ThresholdContext = {
        seniority: deriveProfileLevel(advisor.category),
        agentStatus: advisor.agentStatus ?? null,
        teamSizeBucket,
        avgCommissionEur,
      };

      const top = detectBiggestPainPoint(measuredRatios, ctx);
      if (!top) return { advisor, painScore: 0, topGainEur: 0 };

      return {
        advisor,
        painScore: top.painScoreV2,
        topGainEur: top.estimatedCaLossEur,
      };
    });

    enriched.sort((a, b) => {
      if (a.painScore === null && b.painScore === null) return 0;
      if (a.painScore === null) return 1;
      if (b.painScore === null) return -1;
      return b.painScore - a.painScore;
    });

    return enriched;
  }, [
    advisors,
    perConseillerResults,
    perConseillerRatios,
    allResults,
    agencyObjective,
  ]);
}
