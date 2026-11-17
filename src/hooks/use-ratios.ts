"use client";

import { useMemo } from "react";
import { computeDiagnosticRatios } from "@/lib/ratios";
import { useUser } from "./use-user";
import { useDiagnosticResults } from "./use-diagnostic-results";
import { useAppStore } from "@/stores/app-store";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";

export function useRatios(userId?: string): {
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
} {
  const { category } = useUser();
  // Diagnostic « qui ne ment pas » : ratios calculés sur l'agrégat des 3
  // derniers mois glissants (compromis → actes sur 6 mois), plus sur le
  // dernier enregistrement seul.
  const { results3m, results6m } = useDiagnosticResults(userId);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  const computedRatios = useMemo(() => {
    return computeDiagnosticRatios(results3m, results6m, category, ratioConfigs);
  }, [results3m, results6m, category, ratioConfigs]);

  return { computedRatios, ratioConfigs };
}
