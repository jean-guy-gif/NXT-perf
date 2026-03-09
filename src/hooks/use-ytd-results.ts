"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { aggregateResults } from "@/lib/aggregate-results";
import type { PeriodResults } from "@/types/results";

/**
 * Returns year-to-date aggregated results for the given user (or current user).
 * Filters all monthly results whose periodStart falls in the current year,
 * then aggregates them into a single cumulative PeriodResults.
 */
export function useYTDResults(userId?: string): PeriodResults | null {
  const results = useAppStore((s) => s.results);
  const user = useAppStore((s) => s.user);
  const targetUserId = userId ?? user?.id;

  return useMemo(() => {
    if (!targetUserId) return null;

    const currentYear = new Date().getFullYear();
    const jan1 = `${currentYear}-01-01`;

    const userResults = results.filter(
      (r) =>
        r.userId === targetUserId &&
        r.periodType === "month" &&
        r.periodStart >= jan1
    );

    return aggregateResults(userResults);
  }, [results, targetUserId]);
}
