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

const DEFAULT_MAX = 3;

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
