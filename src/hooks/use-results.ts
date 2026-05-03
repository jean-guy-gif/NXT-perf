"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAdvisorOverride } from "@/contexts/advisor-override-context";
import type { PeriodResults } from "@/types/results";

export function useResults(userId?: string): PeriodResults | null {
  const results = useAppStore((s) => s.results);
  const storeUserId = useAppStore((s) => s.user?.id);
  const { advisorId } = useAdvisorOverride();
  // Priorité : argument explicite > override Manager → advisor > user store
  const targetUserId = userId ?? advisorId ?? storeUserId;

  return useMemo(() => {
    const userResults = results.filter((r) => r.userId === targetUserId);
    if (userResults.length === 0) return null;
    // Return the most recent result (latest periodStart)
    return userResults.reduce((latest, r) =>
      r.periodStart > latest.periodStart ? r : latest
    );
  }, [results, targetUserId]);
}

export function useAllResults(): PeriodResults[] {
  return useAppStore((s) => s.results);
}
