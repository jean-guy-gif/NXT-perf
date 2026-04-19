/**
 * Configuration centrale du système de coaching humain NXT Performance
 *
 * V1 (démo actuelle) : mono-coach pointant vers Jean-Guy
 * V2 (roadmap) : pool de coachs NXT avec attribution dynamique
 *
 * Le reste du code consomme UNIQUEMENT les helpers de ce fichier.
 * Ne JAMAIS hardcoder un coach_id ou un lien Calendar ailleurs.
 */

// ─── V1 — Constantes démo ──────────────────────────────────────────────

/**
 * UUID du coach démo dans Supabase (compte coach.jean-guy@start-academy.fr).
 * En V2, sera remplacé par une résolution dynamique via coach_pool.
 */
export const DEMO_COACH_ID = "7d3cf5aa-5fd5-45a9-ac8a-2963615b6063";

/**
 * Lien Google Calendar du coach pour prise de RDV humain.
 * Affiché dans le CTA "Prendre RDV avec un coach" du ImprovementCatalogue
 * quand la ressource nxt_coaching est en statut debrief_offered.
 */
export const DEMO_COACH_CALENDAR_URL = "https://calendar.app.google/YG8ydKHsPBTsvDi87";

// ─── Lifecycle des ressources d'amélioration ───────────────────────────

/** Durée de vie d'un plan 30j avant passage en status 'expired' */
export const PLAN_30J_DURATION_DAYS = 30;

/** Fenêtre pendant laquelle le debrief offert reste activable après expiration du plan */
export const DEBRIEF_OFFERED_EXPIRY_DAYS = 14;

// ─── Types (miroir TypeScript du CHECK SQL migration 030) ──────────────

export type ResourceType =
  | "plan_30j"
  | "nxt_coaching"
  | "nxt_training"
  | "agefice";

export type Plan30jStatus = "active" | "completed" | "expired";

export type NxtCoachingStatus =
  | "none"
  | "debrief_offered"
  | "debrief_used"
  | "pending_human_coach"
  | "human_coached"
  | "subscribed"
  | "cancelled";

export type NxtTrainingStatus =
  | "none"
  | "trial_1_used"
  | "trial_2_used"
  | "subscribed";

export type AgeficeStatus = "none" | "draft" | "submitted" | "accepted" | "refused";

export type ImprovementResourceStatus =
  | Plan30jStatus
  | NxtCoachingStatus
  | NxtTrainingStatus
  | AgeficeStatus;

// ─── Résolution du coach (V1 → V2 ready) ───────────────────────────────

/**
 * Retourne l'UUID du coach à assigner lors d'une demande de coaching humain.
 *
 * V1 : retourne toujours DEMO_COACH_ID.
 * V2 : round-robin ou matching par sujet depuis la table `coach_pool`.
 *
 * @param _painRatioId — Sur quel ratio le conseiller veut être coaché.
 *                       Ignoré en V1, utilisé en V2 pour matcher un coach spécialisé.
 */
export async function resolveCoachId(
  _painRatioId?: string
): Promise<string> {
  // V1 : toujours Jean-Guy
  return DEMO_COACH_ID;

  // V2 (exemple) :
  // const specialistId = await findCoachBySpecialty(_painRatioId);
  // return specialistId ?? await getNextAvailableCoachRoundRobin();
}

/**
 * Retourne l'URL du calendrier à afficher dans le CTA.
 * V1 : URL fixe. V2 : URL du coach résolu.
 */
export async function resolveCoachCalendarUrl(
  _coachId?: string
): Promise<string> {
  return DEMO_COACH_CALENDAR_URL;
}

// ─── Helpers de payload JSONB ──────────────────────────────────────────

/**
 * Structure du payload pour une ressource plan_30j.
 * Stocké en JSONB dans user_improvement_resources.payload.
 */
export interface Plan30jPayload {
  pain_ratio_id: string;
  pain_score: number;
  estimated_ca_loss_eur: number;
  weeks: Plan30jWeek[];
  regenerated_from_plan_id?: string; // anti-abus : traçabilité régénération
}

export interface Plan30jWeek {
  week_number: 1 | 2 | 3 | 4;
  focus: string;
  actions: Plan30jAction[];
  exercice?: string;
}

export interface Plan30jAction {
  id: string;
  label: string;
  done: boolean;
}

/**
 * Structure du payload pour une ressource nxt_coaching.
 */
export interface NxtCoachingPayload {
  debrief_offered_at?: string;
  debrief_used_at?: string;
  human_coach_requested_at?: string;
  human_coach_confirmed_at?: string;
  subscribed_at?: string;
  cancelled_at?: string;
}
