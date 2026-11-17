import type { PeriodResults } from "@/types/results";
import type {
  RatioConfig,
  RatioId,
  ComputedRatio,
  RatioStatus,
} from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import { defaultRatioConfigs } from "@/data/mock-ratios";

// ─── Mesurabilité : dénominateur nul + échantillon minimum ─────────────────
//
// Un diagnostic qui ne ment pas : un ratio dont le dénominateur est nul ou
// dont l'échantillon est trop faible n'est PAS « danger », il est
// « non_mesurable » (gris). On n'oriente pas la formation sur du bruit.

interface RatioSampleSpec {
  /** Dénominateur du ratio : s'il vaut 0, le ratio est non mesurable. */
  denominator: (r: PeriodResults) => number;
  /** Volume d'échantillon (numérateur porteur) servant de garde statistique. */
  sample: (r: PeriodResults) => number;
  /** Échantillon minimum requis pour oser mesurer. */
  minSample: number;
  /** Unité affichée dans « Encore N … pour mesurer ». */
  unit: string;
}

/**
 * Seuils d'échantillon minimum par ratio (décision produit) :
 * 10 contacts · 3 estimations · 3 mandats · 10 visites · 3 offres · 3 compromis.
 * `honoraires_moyens` n'a pas de seuil d'échantillon : seul le dénominateur
 * nul (aucun acte) le rend non mesurable.
 */
const RATIO_SAMPLE_SPEC: Record<RatioId, RatioSampleSpec> = {
  contacts_rdv: {
    denominator: (r) => r.prospection.rdvEstimation,
    sample: (r) => r.prospection.contactsTotaux,
    minSample: 10,
    unit: "contacts",
  },
  rdv_mandats: {
    denominator: (r) => r.vendeurs.mandatsSignes,
    sample: (r) => r.vendeurs.rdvEstimation,
    minSample: 3,
    unit: "estimations",
  },
  pct_mandats_exclusifs: {
    denominator: (r) => r.vendeurs.mandats.length,
    sample: (r) => r.vendeurs.mandats.length,
    minSample: 3,
    unit: "mandats",
  },
  acheteurs_visites: {
    denominator: (r) => r.acheteurs.acheteursSortisVisite,
    sample: (r) => r.acheteurs.nombreVisites,
    minSample: 10,
    unit: "visites",
  },
  visites_offre: {
    denominator: (r) => r.acheteurs.offresRecues,
    sample: (r) => r.acheteurs.nombreVisites,
    minSample: 10,
    unit: "visites",
  },
  offres_compromis: {
    denominator: (r) => r.acheteurs.compromisSignes,
    sample: (r) => r.acheteurs.offresRecues,
    minSample: 3,
    unit: "offres",
  },
  compromis_actes: {
    denominator: (r) => r.ventes.actesSignes,
    sample: (r) => r.acheteurs.compromisSignes,
    minSample: 3,
    unit: "compromis",
  },
  honoraires_moyens: {
    denominator: (r) => r.ventes.actesSignes,
    sample: (r) => r.ventes.actesSignes,
    minSample: 0,
    unit: "actes",
  },
};

export interface RatioMeasurability {
  measurable: boolean;
  /** Message affiché quand non mesurable. */
  message?: string;
}

/**
 * Décide si un ratio est mesurable sur `results`.
 * - Échantillon sous le seuil → « Encore N [unité] pour mesurer ».
 * - Dénominateur nul → « Pas encore assez de données » (jamais « danger »).
 */
export function assessMeasurability(
  ratioId: RatioId,
  results: PeriodResults
): RatioMeasurability {
  const spec = RATIO_SAMPLE_SPEC[ratioId];
  if (!spec) return { measurable: true };

  const sample = spec.sample(results);
  if (spec.minSample > 0 && sample < spec.minSample) {
    const remaining = spec.minSample - sample;
    return {
      measurable: false,
      message: `Encore ${remaining} ${spec.unit} pour mesurer`,
    };
  }

  if (spec.denominator(results) <= 0) {
    return { measurable: false, message: "Pas encore assez de données" };
  }

  return { measurable: true };
}

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

    // Mesurabilité d'abord : dénominateur nul ou échantillon insuffisant →
    // statut gris « non_mesurable », jamais « danger ».
    const measurability = assessMeasurability(ratioId, results);
    let status: RatioStatus;
    let message: string | undefined;
    if (!measurability.measurable) {
      status = "non_mesurable";
      message = measurability.message;
    } else {
      status = determineRatioStatus(value, threshold, config);
    }

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
      ...(message ? { message } : {}),
    };
  });
}

// ─── Diagnostic : fenêtres glissantes 3 mois / 6 mois ──────────────────────

/** Fenêtre par défaut du diagnostic (mois glissants). */
export const DIAGNOSTIC_WINDOW_MONTHS = 3;
/** Fenêtre étendue pour les ratios aval à faible volume (compromis → actes). */
export const COMPROMIS_ACTES_WINDOW_MONTHS = 6;

/**
 * Calcule les ratios du diagnostic sur l'agrégat des 3 derniers mois glissants,
 * sauf `compromis → actes` mesuré sur 6 mois (volume rare en bas de funnel).
 * Ne s'appuie plus sur le dernier enregistrement seul.
 *
 * @param results3m Agrégat des 3 derniers mois (cf. aggregateLastMonths).
 * @param results6m Agrégat des 6 derniers mois — si null, compromis reste sur 3m.
 */
export function computeDiagnosticRatios(
  results3m: PeriodResults | null,
  results6m: PeriodResults | null,
  category: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig> = defaultRatioConfigs
): ComputedRatio[] {
  if (!results3m) return [];
  const base = computeAllRatios(results3m, category, ratioConfigs);
  if (!results6m) return base;

  const compromis6m = computeAllRatios(results6m, category, ratioConfigs).find(
    (r) => r.ratioId === "compromis_actes"
  );
  if (!compromis6m) return base;

  return base.map((r) =>
    r.ratioId === "compromis_actes" ? compromis6m : r
  );
}
