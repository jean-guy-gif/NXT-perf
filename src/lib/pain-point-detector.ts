/**
 * Détecteur de plus grosse douleur pour un conseiller
 *
 * Formule V1 (legacy, conservée comme `painScore`) :
 *   painScore = |Écart normalisé| × Impact_CA_estimé × Poids_levier
 *
 * Formule V2 (chantier A.1, utilisée pour le tri du top) :
 *   painScoreV2 = 0.4 × impactScoreNormalized
 *               + 0.4 × chainScore
 *               + 0.2 × feasibilityScore
 *
 * - `impactScoreNormalized` = `painScore / max(painScores du pool)` (0-1)
 * - `chainScore`            = `expertise.chainPosition` (0-1, amont→aval)
 * - `feasibilityScore`      = `FEASIBILITY_SCORE[expertise.feasibility]`
 *                              (easy 1.0 / medium 0.6 / hard 0.3)
 *
 * Justification : l'ancienne formule mono-critère (impact € pur) ratait
 * parfois le top quand plusieurs ratios étaient en sous-perf — un ratio aval
 * à fort impact € peut être inutile à fixer si l'amont du funnel n'est pas
 * alimenté. La formule V2 pondère impact / position chaîne / faisabilité.
 *
 * Alimenté par :
 *   - ratio-expertise.ts (seuils, poids, type d'impact, chainPosition, feasibility)
 *   - Les ratios calculés du conseiller (ComputedRatio)
 *   - Le profil du conseiller (junior/confirmé/expert)
 *   - La commission moyenne (pour quantifier l'impact en €)
 */

import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
  type RatioExpertise,
  type RatioFeasibility,
} from "@/data/ratio-expertise";
import {
  resolveThreshold,
  type ThresholdContext,
} from "@/lib/diagnostic/resolve-threshold";

/**
 * Mapping faisabilité → score numérique (chantier A.1 — décisions Q2 validées).
 */
export const FEASIBILITY_SCORE: Record<RatioFeasibility, number> = {
  easy: 1.0,
  medium: 0.6,
  hard: 0.3,
};

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
  normalizedGap: number;             // Écart normalisé (>0 si sous-perf)
  estimatedCaLossEur: number;        // Impact CA estimé (€)
  /**
   * Score V1 legacy (impact brut). Conservé pour compat backward — c'est la
   * valeur stockée en colonne DB `pain_score` (cf. `route.ts`,
   * `use-improvement-resources.ts`). N'est plus utilisé pour le tri du top
   * depuis chantier A.1.
   */
  painScore: number;
  /**
   * Score V2 composite (chantier A.1) : 0.4 impact + 0.4 chain + 0.2 feasibility.
   * Échelle 0-1. Utilisé comme clé de tri pour désigner le top point.
   */
  painScoreV2: number;
  /** Composante 1 du V2 — `painScore` divisé par max(painScores du pool). 0-1. */
  impactScoreNormalized: number;
  /** Composante 2 du V2 — = `expertise.chainPosition`. 0-1. */
  chainScore: number;
  /** Composante 3 du V2 — issue de `FEASIBILITY_SCORE[feasibility]`. 0-1. */
  feasibilityScore: number;
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
 * Helper interne — applique la formule complète (V1 legacy + V2 composite)
 * sur le pool de mesures et retourne le tableau **trié par painScoreV2 desc**.
 *
 * Étapes :
 *   1. Pour chaque ratio sous-perf (normalizedGap > 0), calculer painScore V1.
 *   2. Calculer maxPainScore du pool (fallback 1 si pool vide ou tous nuls).
 *   3. Calculer impactScoreNormalized + chainScore + feasibilityScore.
 *   4. painScoreV2 = 0.4 × impact + 0.4 × chain + 0.2 × feasibility.
 *   5. Trier desc sur painScoreV2.
 *
 * Filtre force-skip ligne `normalizedGap === 0` : INCHANGÉ — la
 * force-inclusion PR3.5 dans `diagnostic-criticite.ts` reste responsable de
 * récupérer les ratios skippés (cas du dénominateur nul → ratio = 0).
 */
function scoreAllPainPoints(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainPointResult[] {
  // Pass 1 : painScore V1 (legacy, formule actuelle inchangée)
  type Partial1 = Omit<
    PainPointResult,
    "painScoreV2" | "impactScoreNormalized" | "chainScore" | "feasibilityScore"
  >;
  const partials: Partial1[] = [];

  for (const measured of measuredRatios) {
    const expertise = ALL_EXPERTISE_RATIOS.find(
      (e) => e.id === measured.expertiseId,
    );
    if (!expertise) continue;

    // Chantier A.3 — résolution contextuelle (4 axes) du seuil au lieu de
    // l'accès direct expertise.thresholds[profile].
    const targetValue = resolveThreshold(expertise, ctx);
    const normalizedGap = computeNormalizedGap(
      measured.currentValue,
      targetValue,
      expertise.direction,
    );

    // Si pas d'écart (surperf ou égal au seuil), on skip
    if (normalizedGap === 0) continue;

    const estimatedCaLossEur = estimateCaImpact(
      measured,
      expertise,
      targetValue,
      ctx.avgCommissionEur,
    );

    // Formule de douleur V1 (legacy — préservée pour compat DB pain_score)
    const painScore =
      normalizedGap * estimatedCaLossEur * expertise.leverageWeight;

    partials.push({
      expertiseId: measured.expertiseId,
      expertise,
      currentValue: measured.currentValue,
      targetValue,
      normalizedGap,
      estimatedCaLossEur,
      painScore,
    });
  }

  if (partials.length === 0) return [];

  // Pass 2 : V2 composite (chantier A.1)
  const maxPainScore = Math.max(1, ...partials.map((p) => p.painScore));

  const scored: PainPointResult[] = partials.map((p) => {
    const impactScoreNormalized = p.painScore / maxPainScore;
    const chainScore = p.expertise.chainPosition;
    const feasibilityScore = FEASIBILITY_SCORE[p.expertise.feasibility];
    const painScoreV2 =
      0.4 * impactScoreNormalized + 0.4 * chainScore + 0.2 * feasibilityScore;
    return {
      ...p,
      painScoreV2,
      impactScoreNormalized,
      chainScore,
      feasibilityScore,
    };
  });

  // Tri décroissant sur le score V2 composite (≠ painScore legacy)
  scored.sort((a, b) => b.painScoreV2 - a.painScoreV2);
  return scored;
}

/**
 * Retourne LE ratio le plus douloureux pour le conseiller, ou null si aucun écart.
 * Le plan 30j est construit exclusivement autour de ce ratio.
 *
 * Tri par painScoreV2 (chantier A.1). Seuils contextualisés 4 axes (A.3).
 */
export function detectBiggestPainPoint(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainPointResult | null {
  const scored = scoreAllPainPoints(measuredRatios, ctx);
  return scored[0] ?? null;
}

/**
 * Retourne le top N des douleurs (utile pour affichage/debug, même si le plan 30j
 * n'en cible qu'une).
 *
 * Tri par painScoreV2 (chantier A.1). Seuils contextualisés 4 axes (A.3).
 */
export function detectTopPainPoints(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
  limit = 3,
): PainPointResult[] {
  const scored = scoreAllPainPoints(measuredRatios, ctx);
  return scored.slice(0, limit);
}
