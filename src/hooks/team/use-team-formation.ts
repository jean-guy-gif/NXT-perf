"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { generateFormationDiagnostic } from "@/lib/formation";
import type { FormationDiagnostic, FormationArea } from "@/types/formation";
import type { User } from "@/types/user";

export interface AggregatedFormationArea {
  area: FormationArea;
  label: string;
  count: number;
  totalGap: number;
  avgGap: number;
  conseillerNames: string[];
  priority: 1 | 2 | 3;
}

interface UseTeamFormationReturn {
  loading: boolean;
  perConseillerDiagnostic: Map<string, FormationDiagnostic>;
  prioritizedAreas: AggregatedFormationArea[];
}

/**
 * Aggregate team formation diagnostics — extracted from /manager/cockpit teamRecommendations.
 * Returns per-conseiller diagnostic + aggregated priority areas (sorted by count desc).
 */
export function useTeamFormation(teamId?: string): UseTeamFormationReturn {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
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

  const perConseillerDiagnostic = useMemo(() => {
    const map = new Map<string, FormationDiagnostic>();
    for (const c of conseillers) {
      const results = allResults.find((r) => r.userId === c.id);
      if (!results) continue;
      const ratios = computeAllRatios(results, c.category, ratioConfigs);
      const diag = generateFormationDiagnostic(ratios, ratioConfigs, c.id);
      map.set(c.id, diag);
    }
    return map;
  }, [conseillers, allResults, ratioConfigs]);

  const prioritizedAreas = useMemo<AggregatedFormationArea[]>(() => {
    const areaCount: Record<
      string,
      { count: number; area: FormationArea; label: string; totalGap: number; names: string[] }
    > = {};

    for (const c of conseillers) {
      const diag = perConseillerDiagnostic.get(c.id);
      if (!diag) continue;
      for (const rec of diag.recommendations.filter((r) => r.priority <= 2)) {
        if (!areaCount[rec.area]) {
          areaCount[rec.area] = {
            count: 0,
            area: rec.area,
            label: rec.label,
            totalGap: 0,
            names: [],
          };
        }
        areaCount[rec.area].count++;
        areaCount[rec.area].totalGap += rec.gapPercentage;
        areaCount[rec.area].names.push(`${c.firstName} ${c.lastName}`);
      }
    }

    return Object.values(areaCount)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        area: item.area,
        label: item.label,
        count: item.count,
        totalGap: item.totalGap,
        avgGap: Math.round(item.totalGap / item.count),
        conseillerNames: item.names,
        priority: (item.count >= 3 ? 1 : item.count >= 2 ? 2 : 3) as 1 | 2 | 3,
      }));
  }, [conseillers, perConseillerDiagnostic]);

  return {
    loading: false,
    perConseillerDiagnostic,
    prioritizedAreas,
  };
}
