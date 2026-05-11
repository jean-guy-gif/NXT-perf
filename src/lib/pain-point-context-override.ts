/**
 * pain-point-context-override — sous-PR Coach-8.
 *
 * Détecteur déterministe de "downstream blockage" qui corrige le bias
 * upstream du painScoreV2. L'algo V2 (impact € × chainPosition × feasibility)
 * pondère fortement la position amont dans la chaîne, ce qui fait sortir
 * `contacts_estimations` quasi systématiquement comme top pain.
 *
 * Or quand un agent a déjà du STOCK aval (mandats, acheteurs, compromis),
 * le problème n'est pas amont — c'est de transformer ce qui est déjà dans
 * le pipe. Les 5 règles ci-dessous corrigent ce bias par détection
 * contextuelle.
 *
 * Module pur, testable. Retourne soit un `ExpertiseRatioId` override, soit
 * `null` si aucun blocage downstream détecté (= painScoreV2 reste source
 * de vérité).
 *
 * Seuils calibrés V1 — ajustables après terrain. Volumes mensuels typiques
 * pour un agent confirmé (junior /2, expert ×1.5).
 */

import type { MeasuredRatio } from "@/lib/pain-point-detector";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { PeriodResults } from "@/types/results";
import { resolveThreshold, type ThresholdContext } from "@/lib/diagnostic/resolve-threshold";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";

/** Résultat de la détection contextuelle. */
export interface PainContextOverride {
  /** Levier prioritaire suggéré par la règle. */
  expertiseId: ExpertiseRatioId;
  /** Identifiant de la règle qui a déclenché l'override (pour logs/audit). */
  ruleId: ContextRuleId;
  /** Bref descriptif factuel de la situation détectée (sans LLM). */
  reason: string;
}

export type ContextRuleId =
  | "MANDATS_STOCK_HIGH_ACTES_LOW"
  | "ESTIMATIONS_HIGH_MANDATS_LOW"
  | "ACHETEURS_HIGH_VISITES_LOW"
  | "VISITES_HIGH_OFFRES_LOW"
  | "COMPROMIS_HIGH_ACTES_LOW";

// ─── Seuils volumes (calibration V1) ──────────────────────────────────────

/** Volume minimal d'un stock pour déclencher la règle aval. */
const VOLUME_THRESHOLDS = {
  mandatsSignes: 5,
  estimationsRealisees: 10,
  acheteursSortisVisite: 10,
  nombreVisites: 20,
  compromisSignes: 3,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Retourne true si le ratio est sous le seuil contextuel (donc dégradé). */
function isRatioDegraded(
  measuredRatios: MeasuredRatio[],
  expertiseId: ExpertiseRatioId,
  ctx: ThresholdContext,
): boolean {
  const measured = measuredRatios.find((m) => m.expertiseId === expertiseId);
  if (!measured) return false;
  const expertise = RATIO_EXPERTISE[expertiseId];
  const target = resolveThreshold(expertise, ctx);
  if (target === 0) return false;

  // Direction-aware : less_is_better = dégradé si current > target. more_is_better = dégradé si current < target.
  if (expertise.direction === "less_is_better") {
    return measured.currentValue > target;
  }
  return measured.currentValue < target;
}

// ─── Règles ───────────────────────────────────────────────────────────────

/**
 * Règle 1 : beaucoup de mandats signés + ratio compromis_actes dégradé →
 * priorité = sécuriser les ventes en cours (signature compromis → acte).
 */
function ruleMandatsHighActesLow(
  results: PeriodResults,
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainContextOverride | null {
  if (results.vendeurs.mandatsSignes < VOLUME_THRESHOLDS.mandatsSignes) {
    return null;
  }
  if (!isRatioDegraded(measuredRatios, "compromis_actes", ctx)) return null;
  return {
    expertiseId: "compromis_actes",
    ruleId: "MANDATS_STOCK_HIGH_ACTES_LOW",
    reason: `${results.vendeurs.mandatsSignes} mandats signés en stock — sécurise les actes au lieu de chercher plus de contacts.`,
  };
}

/**
 * Règle 2 : beaucoup d'estimations + ratio estimations_mandats dégradé →
 * priorité = relancer/conclure les estimations existantes.
 */
function ruleEstimationsHighMandatsLow(
  results: PeriodResults,
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainContextOverride | null {
  if (
    results.vendeurs.estimationsRealisees < VOLUME_THRESHOLDS.estimationsRealisees
  ) {
    return null;
  }
  if (!isRatioDegraded(measuredRatios, "estimations_mandats", ctx)) return null;
  return {
    expertiseId: "estimations_mandats",
    ruleId: "ESTIMATIONS_HIGH_MANDATS_LOW",
    reason: `${results.vendeurs.estimationsRealisees} estimations réalisées sans signer assez de mandats — relance et close ce qui est en cours.`,
  };
}

/**
 * Règle 3 : beaucoup d'acheteurs sortis en visite + ratio visites_par_acheteur
 * dégradé → priorité = qualification / découverte acheteur.
 */
function ruleAcheteursHighVisitesLow(
  results: PeriodResults,
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainContextOverride | null {
  if (
    results.acheteurs.acheteursSortisVisite <
    VOLUME_THRESHOLDS.acheteursSortisVisite
  ) {
    return null;
  }
  if (!isRatioDegraded(measuredRatios, "visites_par_acheteur", ctx))
    return null;
  return {
    expertiseId: "visites_par_acheteur",
    ruleId: "ACHETEURS_HIGH_VISITES_LOW",
    reason: `${results.acheteurs.acheteursSortisVisite} acheteurs sortis mais peu de visites par acheteur — travaille la découverte client en amont.`,
  };
}

/**
 * Règle 4 : beaucoup de visites + ratio visites_offres dégradé → priorité
 * = travailler la conversion visite → offre (signal acheteur, débrief).
 */
function ruleVisitesHighOffresLow(
  results: PeriodResults,
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainContextOverride | null {
  if (results.acheteurs.nombreVisites < VOLUME_THRESHOLDS.nombreVisites)
    return null;
  if (!isRatioDegraded(measuredRatios, "visites_offres", ctx)) return null;
  return {
    expertiseId: "visites_offres",
    ruleId: "VISITES_HIGH_OFFRES_LOW",
    reason: `${results.acheteurs.nombreVisites} visites réalisées mais peu d'offres — c'est la conversion visite → offre qui bloque.`,
  };
}

/**
 * Règle 5 : compromis signés + ratio compromis_actes dégradé → priorité
 * = sécurisation (financement, conditions suspensives).
 *
 * Note : peut overlapper avec Règle 1 (mandats stock élevé). On garde
 * les deux car Règle 5 est plus aval (pipe presque fermé) — si
 * compromisSignes >= seuil, c'est encore plus urgent.
 */
function ruleCompromisHighActesLow(
  results: PeriodResults,
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
): PainContextOverride | null {
  if (results.acheteurs.compromisSignes < VOLUME_THRESHOLDS.compromisSignes)
    return null;
  if (!isRatioDegraded(measuredRatios, "compromis_actes", ctx)) return null;
  return {
    expertiseId: "compromis_actes",
    ruleId: "COMPROMIS_HIGH_ACTES_LOW",
    reason: `${results.acheteurs.compromisSignes} compromis signés en cours mais peu d'actes — sécurise le financement et les conditions suspensives.`,
  };
}

// ─── API publique ─────────────────────────────────────────────────────────

/**
 * Évalue les 5 règles dans l'ordre aval → amont (le plus aval gagne car
 * le pipe est le plus proche du CA). Retourne le premier override matché
 * ou null si aucun blocage downstream détecté.
 */
export function detectContextualBlockage(
  measuredRatios: MeasuredRatio[],
  results: PeriodResults,
  ctx: ThresholdContext,
): PainContextOverride | null {
  // Ordre AVAL → AMONT : sécuriser ce qui est le plus proche du CA en priorité.
  return (
    ruleCompromisHighActesLow(results, measuredRatios, ctx) ??
    ruleMandatsHighActesLow(results, measuredRatios, ctx) ??
    ruleVisitesHighOffresLow(results, measuredRatios, ctx) ??
    ruleAcheteursHighVisitesLow(results, measuredRatios, ctx) ??
    ruleEstimationsHighMandatsLow(results, measuredRatios, ctx) ??
    null
  );
}
