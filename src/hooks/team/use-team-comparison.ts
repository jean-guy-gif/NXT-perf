"use client";

import type { PeriodResults } from "@/types/results";

interface UseTeamComparisonReturn {
  loading: boolean;
  team1Aggregate: PeriodResults | null;
  team2Aggregate: PeriodResults | null;
  deltas: null;
}

/**
 * Compare two teams' aggregated metrics.
 *
 * TODO Phase 3: implement when refactoring /manager/comparaison.
 * Signature finalized for type safety; logic to be filled in Phase 3.
 */
export function useTeamComparison(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  teamId1: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  teamId2?: string,
): UseTeamComparisonReturn {
  return {
    loading: false,
    team1Aggregate: null,
    team2Aggregate: null,
    deltas: null,
  };
}
