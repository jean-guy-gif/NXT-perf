"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { aggregateResults } from "@/lib/aggregate-results";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

interface UseTeamResultsReturn {
  loading: boolean;
  conseillers: User[];
  perConseillerResults: Map<string, PeriodResults | null>;
  aggregated: PeriodResults | null;
}

/**
 * Aggregate team results — extracted from /manager/cockpit teamData logic.
 * Returns the team's conseillers + per-conseiller aggregated results + global aggregate.
 */
export function useTeamResults(teamId?: string): UseTeamResultsReturn {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const allResults = useAllResults();

  const effectiveTeamId = teamId ?? currentUser?.teamId ?? null;

  const conseillers = useMemo<User[]>(() => {
    if (!currentUser) return [];
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === effectiveTeamId;
      return u.managerId === currentUser.id;
    });
  }, [users, currentUser, isDemo, effectiveTeamId]);

  const perConseillerResults = useMemo(() => {
    const map = new Map<string, PeriodResults | null>();
    for (const c of conseillers) {
      const matching = allResults.filter((r) => r.userId === c.id);
      map.set(c.id, matching.length > 0 ? aggregateResults(matching) : null);
    }
    return map;
  }, [conseillers, allResults]);

  const aggregated = useMemo<PeriodResults | null>(() => {
    const allMatching = allResults.filter((r) =>
      conseillers.some((c) => c.id === r.userId),
    );
    return allMatching.length > 0 ? aggregateResults(allMatching) : null;
  }, [conseillers, allResults]);

  return {
    loading: false,
    conseillers,
    perConseillerResults,
    aggregated,
  };
}
