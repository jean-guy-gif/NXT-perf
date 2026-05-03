/**
 * Objectif "à date" (PR3.8.6 hotfix).
 *
 * Problème métier corrigé :
 *   Avant cette correction, un volume mensuel (ex. 30 contacts au 3 du mois
 *   pour une cible mensuelle de 300) pouvait être marqué "en sous-perf"
 *   parce qu'il était comparé à l'objectif mensuel COMPLET. Or, le rythme
 *   attendu à date est `300 × 3 / 31 ≈ 29` — le conseiller est dans le rythme.
 *
 * Formule centrale :
 *   objectiveToDate = monthlyTarget × (currentDayOfMonth / daysInMonth)
 *
 * Politique d'application :
 *   - Volumes entiers : arrondi à l'entier supérieur (`Math.ceil`) pour ne pas
 *     sous-évaluer la cible (un conseiller à 9 sur cible 9.7 doit voir "Dans
 *     le rythme" plutôt que "+1").
 *   - CA en € : arrondi à l'euro entier.
 *   - Ratios : NE PAS appliquer cette logique (pas de notion temporelle —
 *     les ratios sont calculés sur la période de saisie disponible).
 *
 * Le module est PURE — pas de hook, pas de dépendance React. Réutilisable
 * Conseiller + Manager.
 */

import type { PeriodResults } from "@/types/results";

// ─── Helpers calendaires ──────────────────────────────────────────────────

/** Nombre de jours dans le mois calendaire de `date` (28-31). */
export function getDaysInCurrentMonth(date: Date): number {
  // Le jour 0 du mois suivant = dernier jour du mois courant.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Numéro du jour dans le mois (1..31). */
export function getCurrentDayOfMonth(date: Date): number {
  return date.getDate();
}

/**
 * Facteur de proration intra-mois — `currentDay / daysInMonth`.
 *
 * Clamp dans (0, 1] pour éviter les divisions par zéro et les facteurs
 * supérieurs à 1 (théoriquement impossible avec un Date valide, sécurité
 * défensive).
 */
export function getProRationFactor(date: Date): number {
  const day = getCurrentDayOfMonth(date);
  const total = getDaysInCurrentMonth(date);
  if (total <= 0) return 1;
  const raw = day / total;
  if (raw <= 0) return 0.01; // au moins 1 % pour ne pas annuler la cible
  if (raw >= 1) return 1;
  return raw;
}

// ─── Objectif à date (volume / CA) ────────────────────────────────────────

export type ObjectiveType = "volume" | "currency" | "ratio";

interface CalculateObjectiveOpts {
  /** Type d'indicateur — pilote l'arrondi. Défaut : "volume". */
  type?: ObjectiveType;
}

/**
 * Calcule l'objectif à date d'un indicateur mensuel.
 *
 * - `volume`   → arrondi `Math.ceil` (entier ≥ valeur exacte)
 * - `currency` → arrondi `Math.round` à l'euro
 * - `ratio`    → renvoie la cible mensuelle telle quelle (no-op temporel,
 *                signal au caller que la proration ne s'applique pas)
 */
export function calculateObjectiveToDate(
  monthlyTarget: number,
  date: Date,
  opts: CalculateObjectiveOpts = {},
): number {
  const type = opts.type ?? "volume";
  if (type === "ratio") return monthlyTarget;

  const factor = getProRationFactor(date);
  const raw = monthlyTarget * factor;
  if (type === "currency") return Math.round(raw);
  return Math.ceil(raw); // volume
}

// ─── Période effective (multi-mois avec dernier mois en cours) ────────────

/**
 * Détermine si une `PeriodResults` couvre le mois calendaire en cours.
 *
 * Heuristique : `periodStart` ou `periodEnd` (le plus tardif) est dans le
 * même mois que `today`. Si `periodEnd` est strictement antérieur à
 * `today`, la période est considérée close (pas de proration).
 */
export function isCurrentMonthInProgress(
  results: PeriodResults | null | undefined,
  today: Date,
): boolean {
  if (!results) return false;
  const startStr = results.periodEnd ?? results.periodStart;
  if (!startStr) return false;
  const periodEnd = new Date(startStr);
  if (Number.isNaN(periodEnd.getTime())) return false;
  // Si la fin de période est dans le futur OU dans le mois courant → mois en
  // cours. On compare au dernier jour du mois courant pour les périodes
  // saisies "en bloc" (ex: periodEnd = 2026-05-31 et today = 2026-05-03).
  const sameMonth =
    periodEnd.getFullYear() === today.getFullYear() &&
    periodEnd.getMonth() === today.getMonth();
  return sameMonth || periodEnd > today;
}

/**
 * Calcule la période effective (en mois, fractionnaire) à utiliser pour
 * comparer un volume cumulé à un objectif mensuel.
 *
 * - Si le mois courant est en cours : `(periodMonths - 1) + factor(today)`
 *   où `factor` est la proration intra-mois.
 * - Sinon : `periodMonths` brut.
 *
 * Le caller passe `today` (généralement `new Date()`). En tests, on peut
 * injecter une date fixe.
 */
export function computeEffectivePeriodMonths(
  periodMonths: number,
  today: Date,
  isInProgress: boolean,
): number {
  if (!isInProgress) return periodMonths;
  const monthsBeforeCurrent = Math.max(0, periodMonths - 1);
  return monthsBeforeCurrent + getProRationFactor(today);
}

// ─── Status helper (volume vs cible à date) ───────────────────────────────

export type RhythmStatus = "ahead" | "on_track" | "behind";

/**
 * Statut "rythme" pour un volume — plus tolérant que le statut sur cible
 * mensuelle complète :
 *
 * - `ahead`     : réalisé ≥ 110 % de l'objectif à date
 * - `on_track`  : réalisé dans [80 %, 110 %] de l'objectif à date
 * - `behind`    : réalisé < 80 % de l'objectif à date
 *
 * Le seuil bas à 80 % conserve une zone "à surveiller" perceptible avant
 * de marquer le retard.
 */
export function determineRhythmStatus(
  actual: number,
  objectiveToDate: number,
): RhythmStatus {
  if (objectiveToDate <= 0) return "on_track";
  const pct = actual / objectiveToDate;
  if (pct >= 1.1) return "ahead";
  if (pct >= 0.8) return "on_track";
  return "behind";
}

export const RHYTHM_LABEL: Record<RhythmStatus, string> = {
  ahead: "En avance",
  on_track: "Dans le rythme",
  behind: "En retard",
};
