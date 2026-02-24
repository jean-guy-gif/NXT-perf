"use client";

import { useMemo } from "react";
import { computeAllRatios } from "@/lib/ratios";
import { useUser } from "./use-user";
import { useResults } from "./use-results";
import { useAppStore } from "@/stores/app-store";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";

export function useRatios(userId?: string): {
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
} {
  const { category } = useUser();
  const results = useResults(userId);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  const computedRatios = useMemo(() => {
    if (!results) return [];
    return computeAllRatios(results, category, ratioConfigs);
  }, [results, category, ratioConfigs]);

  return { computedRatios, ratioConfigs };
}
