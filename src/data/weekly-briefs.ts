/**
 * Fiches pédagogiques par SEMAINE du plan 30j (sous-PR 1 — infrastructure).
 *
 * Concept : 1 fiche par (painRatioId, weekNumber). 8 ratios × 4 semaines = 32
 * fiches au total. Cette sous-PR 1 livre la MÉCANIQUE (type, storage,
 * helper, drawer) avec 1 fiche STUB en exemple pour validation visuelle.
 *
 * Sous-PR 2 enrichira les 31 fiches manquantes en composant `action-brain.ts`
 * + `RATIO_EXPERTISE` (diagnosis, bestPractices, commonCauses, firstAction)
 * + `coach_brain_patterns` (DB, patterns réels ingérés).
 *
 * Format pédagogique :
 *   - why3Actions : 1-2 paragraphes liant les 3 actions de la semaine
 *   - bestPractices : 3-5 bullets "ce que font les meilleurs"
 *   - errorsToAvoid : 3-5 bullets "pièges classiques"
 *
 * Si une fiche est absente : le drawer affiche un empty state gracieux
 * "Fiche pédagogique en cours de rédaction pour ce levier."
 */

import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export interface WeeklyBrief {
  painRatioId: ExpertiseRatioId;
  weekNumber: 1 | 2 | 3 | 4;
  /** Focus humain de la semaine, repris du builder. */
  focus: string;
  /** 1-2 paragraphes : pourquoi ces 3 actions ensemble. */
  why3Actions: string;
  /** 3-5 bullets : ce que font les meilleurs sur cette semaine. */
  bestPractices: string[];
  /** 3-5 bullets : pièges classiques sur cette semaine. */
  errorsToAvoid: string[];
}

export const WEEKLY_BRIEFS: WeeklyBrief[] = [
  // STUB sous-PR 1 — 1 fiche exemple pour validation visuelle du drawer.
  // Sous-PR 2 ajoutera les 31 fiches manquantes (8 ratios × 4 semaines).
  {
    painRatioId: "contacts_estimations",
    weekNumber: 1,
    focus: "Diagnostic et premiere action sur Contacts → Estimations",
    why3Actions:
      "Cette semaine est centrée sur la prise de conscience du ratio actuel " +
      "et la mise en place du premier réflexe quotidien. Sans diagnostic " +
      "honnête (combien de contacts pour 1 estimation réelle), impossible " +
      "de progresser. Les 3 actions de la semaine forment un trio : observer, " +
      "décider, agir une fois.",
    bestPractices: [
      "Compter ses contacts du jour AVANT de partir le soir (cahier ou app).",
      "Identifier 1 segment de contacts sous-exploité (vendeurs anciens, FSBO, recommandations) plutôt que multiplier les pistes.",
      "Bloquer 30 minutes par jour pour DÉCROCHER son téléphone, pas pour préparer le décrochage.",
    ],
    errorsToAvoid: [
      "Vouloir tout changer la 1ère semaine (changer le ratio = travail de fond, pas de sprint).",
      "Confondre RDV qualifié et estimation réelle (un RDV qui n'aboutit pas ne compte pas).",
      "Reprendre l'ancien rythme dès le 2ème jour parce que ça demande un effort psychologique.",
    ],
  },
];

/**
 * Récupère la fiche pédagogique pour un (ratio, semaine) donné, ou `null`
 * si non encore rédigée. Le consommateur (`<WeeklyBriefDrawer>`) gère
 * l'empty state gracieux.
 */
export function getWeeklyBrief(
  ratioId: ExpertiseRatioId,
  weekNumber: 1 | 2 | 3 | 4,
): WeeklyBrief | null {
  return (
    WEEKLY_BRIEFS.find(
      (b) => b.painRatioId === ratioId && b.weekNumber === weekNumber,
    ) ?? null
  );
}
