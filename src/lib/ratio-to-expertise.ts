import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { MeasuredRatio } from "@/lib/pain-point-detector";

export const RATIO_ID_TO_EXPERTISE_ID: Record<RatioId, ExpertiseRatioId | null> = {
  contacts_rdv: "contacts_estimations",
  rdv_mandats: "estimations_mandats",
  pct_mandats_exclusifs: "pct_exclusivite",
  acheteurs_visites: "acheteurs_tournee",
  visites_offre: "visites_offres",
  offres_compromis: "offres_compromis",
  compromis_actes: "compromis_actes",
  honoraires_moyens: null,
};

function getVolumeBase(
  expertiseId: ExpertiseRatioId,
  results: PeriodResults
): number {
  switch (expertiseId) {
    case "contacts_estimations":
      return results.prospection.contactsTotaux;
    case "estimations_mandats":
      return results.vendeurs.estimationsRealisees || results.vendeurs.rdvEstimation;
    case "pct_exclusivite":
      return results.vendeurs.mandats.length || results.vendeurs.mandatsSignes;
    case "acheteurs_tournee":
    case "visites_par_acheteur":
      return results.acheteurs.acheteursSortisVisite;
    case "visites_offres":
      return results.acheteurs.nombreVisites;
    case "offres_compromis":
      return results.acheteurs.offresRecues;
    case "compromis_actes":
      return results.acheteurs.compromisSignes;
  }
}

export function buildMeasuredRatios(
  computedRatios: ComputedRatio[],
  results: PeriodResults | null | undefined
): MeasuredRatio[] {
  if (!results) return [];
  const measured: MeasuredRatio[] = [];
  for (const computed of computedRatios) {
    const expertiseId = RATIO_ID_TO_EXPERTISE_ID[computed.ratioId as RatioId];
    if (!expertiseId) continue;
    measured.push({
      expertiseId,
      currentValue: computed.value,
      volumeBase: getVolumeBase(expertiseId, results),
    });
  }
  return measured;
}
