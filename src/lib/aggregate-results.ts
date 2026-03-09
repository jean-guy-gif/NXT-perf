import type { PeriodResults } from "@/types/results";

/**
 * Aggregate multiple PeriodResults into a single cumulative result.
 * Numeric fields are summed; list fields are concatenated;
 * delaiMoyenVente is weighted-averaged by actesSignes.
 */
export function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  const base = results[0];

  // Weighted average for delai moyen vente
  let totalActes = 0;
  let weightedDelai = 0;
  for (const r of results) {
    if (r.ventes.actesSignes > 0) {
      totalActes += r.ventes.actesSignes;
      weightedDelai += r.ventes.delaiMoyenVente * r.ventes.actesSignes;
    }
  }
  const avgDelai = totalActes > 0 ? Math.round(weightedDelai / totalActes) : 0;

  // Sort by periodStart to get correct date range
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
      contactsEntrants: sum(results, (r) => r.prospection.contactsEntrants),
      contactsTotaux: sum(results, (r) => r.prospection.contactsTotaux),
      rdvEstimation: sum(results, (r) => r.prospection.rdvEstimation),
      informationsVente: results.flatMap((r) => r.prospection.informationsVente),
    },
    vendeurs: {
      rdvEstimation: sum(results, (r) => r.vendeurs.rdvEstimation),
      estimationsRealisees: sum(results, (r) => r.vendeurs.estimationsRealisees),
      mandatsSignes: sum(results, (r) => r.vendeurs.mandatsSignes),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: sum(results, (r) => r.vendeurs.rdvSuivi),
      requalificationSimpleExclusif: sum(results, (r) => r.vendeurs.requalificationSimpleExclusif),
      baissePrix: sum(results, (r) => r.vendeurs.baissePrix),
    },
    acheteurs: {
      acheteursChauds: results.flatMap((r) => r.acheteurs.acheteursChauds),
      acheteursSortisVisite: sum(results, (r) => r.acheteurs.acheteursSortisVisite),
      nombreVisites: sum(results, (r) => r.acheteurs.nombreVisites),
      offresRecues: sum(results, (r) => r.acheteurs.offresRecues),
      compromisSignes: sum(results, (r) => r.acheteurs.compromisSignes),
    },
    ventes: {
      actesSignes: sum(results, (r) => r.ventes.actesSignes),
      chiffreAffaires: sum(results, (r) => r.ventes.chiffreAffaires),
      delaiMoyenVente: avgDelai,
    },
    createdAt: sorted[0].createdAt,
    updatedAt: sorted[sorted.length - 1].updatedAt,
  };
}

function sum(results: PeriodResults[], getter: (r: PeriodResults) => number): number {
  return results.reduce((acc, r) => acc + getter(r), 0);
}
