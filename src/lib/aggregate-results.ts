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

/**
 * Agrège les `months` derniers enregistrements MENSUELS glissants d'un user
 * en un seul PeriodResults cumulatif. Base du diagnostic « 3 derniers mois ».
 *
 * Retourne null si userId absent ou aucun enregistrement mensuel.
 */
export function aggregateLastMonths(
  allResults: PeriodResults[],
  userId: string | undefined,
  months: number
): PeriodResults | null {
  if (!userId) return null;
  const monthly = allResults
    .filter((r) => r.userId === userId && r.periodType === "month")
    // Tri décroissant par début de période → les plus récents d'abord.
    .sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1));
  return aggregateResults(monthly.slice(0, months));
}

/**
 * Agrège toutes les saisies d'un user tombant dans le mois calendaire de
 * `now` (réalisé « depuis le 1er du mois »). Base du débrief post-saisie.
 *
 * Retourne null si userId absent ou aucune saisie ce mois-ci.
 */
export function aggregateCurrentMonth(
  allResults: PeriodResults[],
  userId: string | undefined,
  now: Date
): PeriodResults | null {
  if (!userId) return null;
  const y = now.getFullYear();
  const m = now.getMonth();
  const inMonth = allResults.filter((r) => {
    if (r.userId !== userId) return false;
    const d = new Date(r.periodStart);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  return aggregateResults(inMonth);
}
