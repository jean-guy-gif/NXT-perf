/**
 * Coach-brain — façade unique pour exposer le contenu pédagogique métier
 * (le "cerveau coach") aux composants UI.
 *
 * Source de vérité :
 *   - src/data/ratio-expertise.ts → RATIO_EXPERTISE (Q1 diagnosis,
 *     Q2 commonCauses, Q3 bestPractices, Q4 firstAction)
 *   - src/lib/coaching/top-practices.ts → TOP_PRACTICES (synthèse 3 bullets
 *     par levier, optionnelle)
 *
 * Politique de fallback pour `getTopPractices` :
 *   1. TOP_PRACTICES[id] si présent → tronqué à `max` items
 *   2. Sinon : split heuristique de bestPractices sur "." (max 3)
 *   3. Sinon : [bestPractices] tel quel (un seul item paragraphe)
 *
 * Ne JAMAIS muter RATIO_EXPERTISE depuis cette façade. Ce module est
 * uniquement read-side : adaptateur léger entre data et UI.
 */

import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { TOP_PRACTICES } from "@/lib/coaching/top-practices";
import type { VolumeKey } from "@/lib/diagnostic-criticite";
import { ratioToFormationArea } from "@/lib/formation";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { RatioId } from "@/types/ratios";
import type { FormationArea } from "@/types/formation";

const DEFAULT_MAX = 3;

/**
 * Mapping volume → ratio "le plus directement actionnable" pour ce volume.
 * Sert quand un verdict est de type volume (ex: Contacts) et qu'on veut
 * proposer un plan ciblé : on remonte au ratio le plus en amont qui pilote
 * ce volume.
 */
const VOLUME_TO_RATIO: Record<VolumeKey, ExpertiseRatioId> = {
  contactsTotaux: "contacts_estimations",
  rdvEstimation: "contacts_estimations",
  estimationsRealisees: "estimations_mandats",
  mandatsSignes: "estimations_mandats",
  nombreVisites: "visites_offres",
  offresRecues: "offres_compromis",
  compromisSignes: "compromis_actes",
  actesSignes: "compromis_actes",
};

/**
 * Mapping métier : associe chaque volume au ratio le plus actionnable.
 * Ce mapping pilote directement le levier recommandé affiché à l'utilisateur.
 * Toute modification doit être validée côté métier (impact direct sur les
 * recommandations).
 *
 * Retourne le ratio expert le plus pertinent pour un volume donné.
 * Utilisé par WhyDangerDrawer (volume verdict) et par ameliorer-adaptive-flow
 * (recommended lever quand le top criticité est un volume).
 */
export function volumeToRelatedRatio(
  volumeKey: VolumeKey
): ExpertiseRatioId | null {
  return VOLUME_TO_RATIO[volumeKey] ?? null;
}

// ─── Mapping ExpertiseRatioId → FormationArea ────────────────────────────

/**
 * Reverse map ExpertiseRatioId → RatioId (legacy) calculé une fois au load.
 * Sert de pont vers `ratioToFormationArea` qui n'expose que des RatioId.
 */
const EXPERTISE_TO_RATIO_ID: Partial<Record<ExpertiseRatioId, RatioId>> = (
  Object.entries(RATIO_ID_TO_EXPERTISE_ID) as [RatioId, ExpertiseRatioId | null][]
).reduce(
  (acc, [ratioId, expertiseId]) => {
    if (expertiseId) acc[expertiseId] = ratioId;
    return acc;
  },
  {} as Partial<Record<ExpertiseRatioId, RatioId>>
);

/**
 * Retourne l'axe formation associé à un levier expert.
 * Pont entre le cerveau coach (ExpertiseRatioId) et le système formation
 * (FormationArea).
 *
 * Utilisé par FocusedTrainingBlock pour filtrer le catalogue formations
 * selon le levier recommandé du jour.
 */
export function expertiseToFormationArea(
  expertiseId: ExpertiseRatioId
): FormationArea | null {
  const ratioId = EXPERTISE_TO_RATIO_ID[expertiseId];
  if (!ratioId) return null;
  return ratioToFormationArea[ratioId] ?? null;
}

// ─── Helpers internes ────────────────────────────────────────────────────

function fallbackSplit(narrative: string, max: number): string[] {
  if (!narrative) return [];
  // Split simple sur ". " puis trim. Filtre les fragments trop courts.
  const parts = narrative
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) return [narrative.trim()];
  return parts.slice(0, max);
}

function clampList(list: string[], max: number): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, max);
}

// ─── API publique ────────────────────────────────────────────────────────

/**
 * Retourne max N pratiques terrain pour un levier.
 *
 * Priorité :
 *   1. TOP_PRACTICES[id] (synthèse explicite, formulation terrain)
 *   2. Split heuristique de bestPractices narratif
 *   3. [bestPractices] (un seul item, paragraphe complet)
 *
 * Si l'id est inconnu : retourne [].
 */
export function getTopPractices(
  id: ExpertiseRatioId,
  max: number = DEFAULT_MAX
): string[] {
  const expertise = RATIO_EXPERTISE[id];
  if (!expertise) return [];

  const explicit = TOP_PRACTICES[id];
  if (explicit && explicit.length > 0) {
    return clampList(explicit, max);
  }

  // Fallback : split narratif
  const split = fallbackSplit(expertise.bestPractices, max);
  if (split.length > 0) return split;

  // Fallback ultime : un seul item paragraphe
  if (expertise.bestPractices) {
    return [expertise.bestPractices];
  }
  return [];
}

/**
 * Retourne les causes fréquentes d'un levier (déjà array dans expertise).
 * Filtré + clamped à `max`.
 */
export function getCommonCauses(
  id: ExpertiseRatioId,
  max: number = DEFAULT_MAX
): string[] {
  const expertise = RATIO_EXPERTISE[id];
  if (!expertise) return [];
  return clampList(expertise.commonCauses, max);
}

/**
 * Retourne le diagnostic narratif Q1 ("ce que ça veut dire vraiment").
 * Empty string si id inconnu.
 */
export function getDiagnosis(id: ExpertiseRatioId): string {
  return RATIO_EXPERTISE[id]?.diagnosis ?? "";
}

/**
 * Retourne la première action concrète Q4.
 * Empty string si id inconnu.
 */
export function getFirstAction(id: ExpertiseRatioId): string {
  return RATIO_EXPERTISE[id]?.firstAction ?? "";
}
