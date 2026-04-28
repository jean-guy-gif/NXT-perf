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

interface UseTeamFormationOptions {
  /** Cible une équipe spécifique en mode démo (fallback sur currentUser.teamId si absent). */
  teamId?: string;
  /**
   * Override direct de la liste de conseillers à diagnostiquer.
   * Quand fourni, court-circuite tout filtre interne (managerId / teamId).
   * Utilisé par la page Directeur pour cibler une équipe ou une agence
   * arbitraire sans dépendre du currentUser.
   */
  conseillersOverride?: User[];
}

/**
 * Aggregate team formation diagnostics — extracted from /manager/cockpit teamRecommendations.
 * Returns per-conseiller diagnostic + aggregated priority areas (sorted by count desc).
 *
 * Backwards-compatible : appel sans argument = comportement Manager actuel
 * (fallback sur currentUser.teamId / currentUser.id).
 */
export function useTeamFormation(
  options?: UseTeamFormationOptions,
): UseTeamFormationReturn {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const teamId = options?.teamId;
  const conseillersOverride = options?.conseillersOverride;
  const effectiveTeamId = teamId ?? currentUser?.teamId ?? null;

  const conseillers = useMemo<User[]>(() => {
    // Override Directeur : utiliser la liste fournie sans filtrage interne.
    if (conseillersOverride) return conseillersOverride;
    if (!currentUser) return [];
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === effectiveTeamId;
      return u.managerId === currentUser.id;
    });
  }, [users, currentUser, isDemo, effectiveTeamId, conseillersOverride]);

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
