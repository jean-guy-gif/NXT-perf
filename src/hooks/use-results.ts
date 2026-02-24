"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import type { PeriodResults } from "@/types/results";

export function useResults(userId?: string): PeriodResults | null {
  const results = useAppStore((s) => s.results);
  const user = useAppStore((s) => s.user);
  const targetUserId = userId ?? user?.id;

  return useMemo(() => {
    return results.find((r) => r.userId === targetUserId) ?? null;
  }, [results, targetUserId]);
}

export function useAllResults(): PeriodResults[] {
  return useAppStore((s) => s.results);
}
