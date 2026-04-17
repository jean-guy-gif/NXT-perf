import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId, ComputedRatio } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import { defaultRatioConfigs } from "@/data/mock-ratios";

export function computeRatioValue(
  ratioId: RatioId,
  results: PeriodResults
): number {
  const { prospection, vendeurs, acheteurs, ventes } = results;

  switch (ratioId) {
    case "contacts_rdv":
      return prospection.rdvEstimation > 0
        ? prospection.contactsTotaux / prospection.rdvEstimation
        : 0;

    case "rdv_mandats":
      return vendeurs.mandatsSignes > 0
        ? vendeurs.rdvEstimation / vendeurs.mandatsSignes
        : 0;

    case "pct_mandats_exclusifs": {
      const totalMandats = vendeurs.mandats.length;
      const exclusifs = vendeurs.mandats.filter((m) => m.type === "exclusif").length;
      return totalMandats > 0 ? (exclusifs / totalMandats) * 100 : 0;
    }

    case "acheteurs_visites":
      return acheteurs.acheteursSortisVisite > 0
        ? acheteurs.nombreVisites / acheteurs.acheteursSortisVisite
        : 0;

    case "visites_offre":
      return acheteurs.offresRecues > 0
        ? acheteurs.nombreVisites / acheteurs.offresRecues
        : 0;

    case "offres_compromis":
      return acheteurs.compromisSignes > 0
        ? acheteurs.offresRecues / acheteurs.compromisSignes
        : 0;

    case "compromis_actes":
      return ventes.actesSignes > 0
        ? acheteurs.compromisSignes / ventes.actesSignes
        : 0;

    case "honoraires_moyens":
      return ventes.actesSignes > 0
        ? ventes.chiffreAffaires / ventes.actesSignes
        : 0;

    default:
      return 0;
  }
}

export function determineRatioStatus(
  value: number,
  threshold: number,
  config: RatioConfig
): "ok" | "warning" | "danger" {
  if (value === 0 && !config.isPercentage) return "danger";

  if (config.isLowerBetter) {
    if (value <= threshold) return "ok";
    if (value <= threshold * 1.3) return "warning";
    return "danger";
  } else {
    if (value >= threshold) return "ok";
    if (value >= threshold * 0.7) return "warning";
    return "danger";
  }
}

export function computeAllRatios(
  results: PeriodResults,
  category: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig> = defaultRatioConfigs
): ComputedRatio[] {
  const ratioIds = Object.keys(ratioConfigs) as RatioId[];

  return ratioIds.map((ratioId) => {
    const config = ratioConfigs[ratioId];
    const value = computeRatioValue(ratioId, results);
    const threshold = config.thresholds[category];
    const status = determineRatioStatus(value, threshold, config);

    let percentageOfTarget: number;
    if (config.isLowerBetter) {
      percentageOfTarget = value > 0 ? (threshold / value) * 100 : 100;
    } else {
      percentageOfTarget = threshold > 0 ? (value / threshold) * 100 : 0;
    }
    percentageOfTarget = Math.min(Math.max(percentageOfTarget, 0), 150);

    return {
      ratioId,
      value: Math.round(value * 100) / 100,
      thresholdForCategory: threshold,
      status,
      percentageOfTarget: Math.round(percentageOfTarget),
    };
  });
}
