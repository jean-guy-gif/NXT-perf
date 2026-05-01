/**
 * Détecteur de plus grosse douleur pour un conseiller
 *
 * Formule : Douleur(ratio) = |Écart normalisé| × Impact_CA_estimé × Poids_levier
 *
 * Alimenté par :
 *   - ratio-expertise.ts (seuils, poids, type d'impact)
 *   - Les ratios calculés du conseiller (ComputedRatio)
 *   - Le profil du conseiller (junior/confirmé/expert)
 *   - La commission moyenne (pour quantifier l'impact en €)
 */

import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
  type ProfileLevel,
  type RatioExpertise,
} from "@/data/ratio-expertise";

// ─── Types ────────────────────────────────────────────────────────────────

/** Ratio calculé brut du conseiller */
export interface MeasuredRatio {
  expertiseId: ExpertiseRatioId;
  currentValue: number;
  /** Volume de base servant au calcul d'impact (ex: mandats en stock, visites réalisées) */
  volumeBase: number;
  /**
   * Statut legacy issu de `determineRatioStatus(value, threshold, config)`.
   * Sert de filet de sécurité pour `findCriticitePoints` qui force-inclut les
   * ratios "warning" / "danger" non détectés par le scoring de douleur (cas
   * du dénominateur nul → ratio = 0 → painScore = 0 mais sous-perf réelle).
   * Optionnel pour ne pas casser les call-sites existants.
   */
  legacyStatus?: "ok" | "warning" | "danger";
}

export interface PainPointResult {
  expertiseId: ExpertiseRatioId;
  expertise: RatioExpertise;
  currentValue: number;
  targetValue: number;
  normalizedGap: number;      // Écart normalisé (>0 si sous-perf)
  estimatedCaLossEur: number; // Impact CA estimé (€)
  painScore: number;          // Score composite final
}

// ─── Calcul de l'écart normalisé ──────────────────────────────────────────

function computeNormalizedGap(
  currentValue: number,
  targetValue: number,
  direction: "less_is_better" | "more_is_better"
): number {
  if (targetValue === 0) return 0;

  const rawGap =
    direction === "less_is_better"
      ? (currentValue - targetValue) / targetValue
      : (targetValue - currentValue) / targetValue;

  // Positif si sous-performance, 0 si OK ou surperf
  return Math.max(0, rawGap);
}

// ─── Estimation de l'impact CA en € ───────────────────────────────────────

/**
 * Estime le manque à gagner en € si le conseiller maintient son ratio actuel
 * au lieu de l'amener au seuil attendu.
 *
 * Formule simplifiée V1 (à calibrer avec data réelle après 3 mois) :
 * - Calcule le "volume perdu" selon la direction du ratio
 * - Multiplie par un coefficient de conversion selon caImpactType
 * - Multiplie par la commission moyenne
 */
function estimateCaImpact(
  ratio: MeasuredRatio,
  expertise: RatioExpertise,
  targetValue: number,
  avgCommissionEur: number
): number {
  const { currentValue, volumeBase } = ratio;

  if (volumeBase <= 0 || avgCommissionEur <= 0) return 0;

  // Coefficient de conversion selon le type d'impact
  // Représente combien d'euros sont impactés par unité de volume "débloquée"
  const conversionCoef: Record<typeof expertise.caImpactType, number> = {
    direct_cascade: 0.35,  // +estim → +mandats → +ventes (cascade atténuée)
    direct_strong: 0.5,    // conversion directe en vente
    leverage_high: 0.5,    // exclusivité convertit 2x mieux (cf. doc)
    security: 1.0,         // CA déjà engagé, sauvegarde à 100%
    indirect: 0.15,        // lien avec le CA moins direct
  };

  const coef = conversionCoef[expertise.caImpactType];

  if (expertise.direction === "less_is_better") {
    // Ex: visites→offres. Si ratio actuel = 15 et seuil = 10, on "gaspille" des visites
    // Volume perdu = volumeBase × (1 - targetValue/currentValue)
    if (currentValue <= 0) return 0;
    const efficiencyLoss = 1 - targetValue / currentValue;
    const lostOpportunities = volumeBase * Math.max(0, efficiencyLoss);
    return lostOpportunities * coef * avgCommissionEur;
  } else {
    // Ex: % exclusivité. Si actuel = 30% et seuil = 50%, on perd des exclus
    // Gap en volume = volumeBase × (targetValue - currentValue) / 100
    const gapPoints = Math.max(0, targetValue - currentValue);
    const lostExclusives = (volumeBase * gapPoints) / 100;
    return lostExclusives * coef * avgCommissionEur;
  }
}

// ─── Détection du point de douleur principal ──────────────────────────────

/**
 * Retourne LE ratio le plus douloureux pour le conseiller, ou null si aucun écart.
 * Le plan 30j est construit exclusivement autour de ce ratio.
 */
export function detectBiggestPainPoint(
  measuredRatios: MeasuredRatio[],
  profile: ProfileLevel,
  avgCommissionEur: number
): PainPointResult | null {
  const scored: PainPointResult[] = [];

  for (const measured of measuredRatios) {
    const expertise = ALL_EXPERTISE_RATIOS.find(
      (e) => e.id === measured.expertiseId
    );
    if (!expertise) continue;

    const targetValue = expertise.thresholds[profile];
    const normalizedGap = computeNormalizedGap(
      measured.currentValue,
      targetValue,
      expertise.direction
    );

    // Si pas d'écart (surperf ou égal au seuil), on skip
    if (normalizedGap === 0) continue;

    const estimatedCaLossEur = estimateCaImpact(
      measured,
      expertise,
      targetValue,
      avgCommissionEur
    );

    // Formule de douleur
    const painScore =
      normalizedGap * estimatedCaLossEur * expertise.leverageWeight;

    scored.push({
      expertiseId: measured.expertiseId,
      expertise,
      currentValue: measured.currentValue,
      targetValue,
      normalizedGap,
      estimatedCaLossEur,
      painScore,
    });
  }

  if (scored.length === 0) return null;

  // Tri décroissant sur le score de douleur, retour du top
  scored.sort((a, b) => b.painScore - a.painScore);
  return scored[0];
}

/**
 * Retourne le top N des douleurs (utile pour affichage/debug, même si le plan 30j
 * n'en cible qu'une).
 */
export function detectTopPainPoints(
  measuredRatios: MeasuredRatio[],
  profile: ProfileLevel,
  avgCommissionEur: number,
  limit = 3
): PainPointResult[] {
  const results: PainPointResult[] = [];

  for (const measured of measuredRatios) {
    const expertise = ALL_EXPERTISE_RATIOS.find(
      (e) => e.id === measured.expertiseId
    );
    if (!expertise) continue;

    const targetValue = expertise.thresholds[profile];
    const normalizedGap = computeNormalizedGap(
      measured.currentValue,
      targetValue,
      expertise.direction
    );
    if (normalizedGap === 0) continue;

    const estimatedCaLossEur = estimateCaImpact(
      measured,
      expertise,
      targetValue,
      avgCommissionEur
    );
    const painScore =
      normalizedGap * estimatedCaLossEur * expertise.leverageWeight;

    results.push({
      expertiseId: measured.expertiseId,
      expertise,
      currentValue: measured.currentValue,
      targetValue,
      normalizedGap,
      estimatedCaLossEur,
      painScore,
    });
  }

  results.sort((a, b) => b.painScore - a.painScore);
  return results.slice(0, limit);
}
