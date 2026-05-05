/**
 * Team plan — payload + helper de construction (chantier d.1).
 *
 * Persistance via `user_improvement_resources` avec `resource_type =
 * "team_plan_30j"` + `team_id` (extension schéma déjà en place via Supabase
 * MCP, hors repo). Pas de migration ici.
 *
 * Différences avec `Plan30jPayload` (plan perso) :
 *   - Pas de découpage en 4 semaines — 3 actions équipe à plat (V1)
 *   - Pas de `pain_ratio_id` au niveau row (utilisé pour plan perso) — on
 *     stocke `expertise_id` dans le payload jsonb à la place pour rester
 *     symétrique aux conventions team
 *   - Le suivi des cochages se fait dans `team_plan_action_progress`
 *     (table dédiée, consommée en d.3) — pas de champ `done` dans le payload
 *
 * Module pur — pas de dépendance React ni Supabase. Testable isolément.
 */

import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export interface TeamPlanAction {
  /** ID stable utilisé comme clé de cochage côté `team_plan_action_progress`. */
  id: string;
  label: string;
}

export interface TeamPlanPayload {
  expertise_id: ExpertiseRatioId;
  lever_label: string;
  /** 3 actions équipe — voix manager via `getTeamActions` côté coach-brain. */
  actions: TeamPlanAction[];
  /** Manager qui a lancé le plan. */
  created_by_user_id: string;
  /** ISO. Préservé même en cas d'archivage tardif. */
  created_at: string;
}

export interface BuildTeamPlanInput {
  expertiseId: ExpertiseRatioId;
  leverLabel: string;
  /** Issu de `getTeamActions(expertiseId)` — actions text only. */
  actions: { label: string }[];
  managerId: string;
}

/** Durée standard (jours) — alignée sur le plan perso. */
export const TEAM_PLAN_DURATION_DAYS = 30;

export function buildTeamPlanPayload(
  input: BuildTeamPlanInput,
): TeamPlanPayload {
  return {
    expertise_id: input.expertiseId,
    lever_label: input.leverLabel,
    actions: input.actions.map((a, i) => ({
      id: `team-action-${i + 1}`,
      label: a.label,
    })),
    created_by_user_id: input.managerId,
    created_at: new Date().toISOString(),
  };
}

/**
 * Calcule J+x (jours écoulés depuis création) borné à [0, TEAM_PLAN_DURATION_DAYS].
 */
export function computeTeamPlanDay(createdAtIso: string): number {
  const created = new Date(createdAtIso).getTime();
  const elapsed = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.min(TEAM_PLAN_DURATION_DAYS, elapsed));
}
