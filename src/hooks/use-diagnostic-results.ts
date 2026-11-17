"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAdvisorOverride } from "@/contexts/advisor-override-context";
import {
  aggregateLastMonths,
} from "@/lib/aggregate-results";
import {
  DIAGNOSTIC_WINDOW_MONTHS,
  COMPROMIS_ACTES_WINDOW_MONTHS,
} from "@/lib/ratios";
import type { PeriodResults } from "@/types/results";

/**
 * Fenêtres glissantes du diagnostic conseiller.
 * - `results3m` : agrégat des 3 derniers mois (base de tous les ratios).
 * - `results6m` : agrégat des 6 derniers mois (ratio compromis → actes).
 *
 * Respecte la même résolution d'utilisateur que `useResults` :
 * argument explicite > override Manager → advisor > user store.
 */
export function useDiagnosticResults(userId?: string): {
  results3m: PeriodResults | null;
  results6m: PeriodResults | null;
} {
  const results = useAppStore((s) => s.results);
  const storeUserId = useAppStore((s) => s.user?.id);
  const { advisorId } = useAdvisorOverride();
  const targetUserId = userId ?? advisorId ?? storeUserId;

  return useMemo(
    () => ({
      results3m: aggregateLastMonths(
        results,
        targetUserId,
        DIAGNOSTIC_WINDOW_MONTHS
      ),
      results6m: aggregateLastMonths(
        results,
        targetUserId,
        COMPROMIS_ACTES_WINDOW_MONTHS
      ),
    }),
    [results, targetUserId]
  );
}
