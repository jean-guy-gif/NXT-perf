import type { PeriodResults } from "@/types/results";

/**
 * Aggregate multiple PeriodResults into a single cumulative result.
 * Numeric fields are summed; list fields are concatenated.
 */
export function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  const base = results[0];

  const sorted = [...results].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  return {
    id: `agg-${base.userId}`,
    userId: base.userId,
    periodType: "month",
    periodStart: sorted[0].periodStart,
    periodEnd: sorted[sorted.length - 1].periodEnd,
    prospection: {
      contactsTotaux: sum(results, (r) => r?.prospection?.contactsTotaux ?? 0),
      rdvEstimation: sum(results, (r) => r?.prospection?.rdvEstimation ?? 0),
    },
    vendeurs: {
      rdvEstimation: sum(results, (r) => r?.vendeurs?.rdvEstimation ?? 0),
      estimationsRealisees: sum(results, (r) => r?.vendeurs?.estimationsRealisees ?? 0),
      mandatsSignes: sum(results, (r) => r?.vendeurs?.mandatsSignes ?? 0),
      mandats: results.flatMap((r) => r?.vendeurs?.mandats ?? []),
      rdvSuivi: sum(results, (r) => r?.vendeurs?.rdvSuivi ?? 0),
      requalificationSimpleExclusif: sum(results, (r) => r?.vendeurs?.requalificationSimpleExclusif ?? 0),
      baissePrix: sum(results, (r) => r?.vendeurs?.baissePrix ?? 0),
    },
    acheteurs: {
      acheteursSortisVisite: sum(results, (r) => r?.acheteurs?.acheteursSortisVisite ?? 0),
      nombreVisites: sum(results, (r) => r?.acheteurs?.nombreVisites ?? 0),
      offresRecues: sum(results, (r) => r?.acheteurs?.offresRecues ?? 0),
      compromisSignes: sum(results, (r) => r?.acheteurs?.compromisSignes ?? 0),
      chiffreAffairesCompromis: sum(results, (r) => r?.acheteurs?.chiffreAffairesCompromis ?? 0),
    },
    ventes: {
      actesSignes: sum(results, (r) => r?.ventes?.actesSignes ?? 0),
      chiffreAffaires: sum(results, (r) => r?.ventes?.chiffreAffaires ?? 0),
    },
    createdAt: sorted[0].createdAt,
    updatedAt: sorted[sorted.length - 1].updatedAt,
  };
}

function sum(results: PeriodResults[], getter: (r: PeriodResults) => number): number {
  return results.reduce((acc, r) => acc + getter(r), 0);
}
