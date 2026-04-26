"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTeamResults } from "./use-team-results";
import { computeAllRatios } from "@/lib/ratios";
import type { ComputedRatio, RatioId } from "@/types/ratios";

interface UseTeamRatiosReturn {
  loading: boolean;
  perConseillerRatios: Map<string, ComputedRatio[]>;
  averages: ComputedRatio[];
}

/**
 * Compute per-conseiller ratios + team averages — extracted from /manager/cockpit + /manager/equipe.
 * Status of `averages[i]` is recomputed on the average value vs the "confirme" threshold (proxy benchmark).
 */
export function useTeamRatios(teamId?: string): UseTeamRatiosReturn {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { conseillers, perConseillerResults, loading } = useTeamResults(teamId);

  const perConseillerRatios = useMemo(() => {
    const map = new Map<string, ComputedRatio[]>();
    for (const c of conseillers) {
      const results = perConseillerResults.get(c.id);
      if (results) {
        map.set(c.id, computeAllRatios(results, c.category, ratioConfigs));
      } else {
        map.set(c.id, []);
      }
    }
    return map;
  }, [conseillers, perConseillerResults, ratioConfigs]);

  const averages = useMemo<ComputedRatio[]>(() => {
    const ratioIds = Object.keys(ratioConfigs) as RatioId[];
    const result: ComputedRatio[] = [];

    for (const ratioId of ratioIds) {
      const config = ratioConfigs[ratioId];
      let sumValue = 0;
      let sumPct = 0;
      let count = 0;

      for (const c of conseillers) {
        const ratios = perConseillerRatios.get(c.id);
        const r = ratios?.find((x) => x.ratioId === ratioId);
        if (r) {
          sumValue += r.value;
          sumPct += r.percentageOfTarget;
          count++;
        }
      }

      const avgValue = count > 0 ? sumValue / count : 0;
      const avgPct = count > 0 ? Math.round(sumPct / count) : 0;
      const threshold = config.thresholds.confirme;

      let status: "ok" | "warning" | "danger" = "ok";
      if (avgValue === 0 && !config.isPercentage) {
        status = "danger";
      } else if (config.isLowerBetter) {
        if (avgValue <= threshold) status = "ok";
        else if (avgValue <= threshold * 1.3) status = "warning";
        else status = "danger";
      } else {
        if (avgValue >= threshold) status = "ok";
        else if (avgValue >= threshold * 0.7) status = "warning";
        else status = "danger";
      }

      result.push({
        ratioId,
        value: Math.round(avgValue * 100) / 100,
        thresholdForCategory: threshold,
        status,
        percentageOfTarget: avgPct,
      });
    }

    return result;
  }, [conseillers, perConseillerRatios, ratioConfigs]);

  return {
    loading,
    perConseillerRatios,
    averages,
  };
}
