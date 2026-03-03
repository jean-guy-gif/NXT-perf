import type { CoachAssignment, CoachPlanAction, CoachPlanWeek, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio, RatioId } from "@/types/ratios";
import { getActionsForRatio } from "@/lib/formation";
import { defaultRatioConfigs } from "@/data/mock-ratios";

/**
 * Returns all userIds accessible to a coach based on their active assignments.
 */
export function getCoachScopeUserIds(
  assignments: CoachAssignment[],
  users: User[]
): Set<string> {
  const ids = new Set<string>();

  const active = assignments.filter((a) => a.status === "ACTIVE");

  for (const assignment of active) {
    switch (assignment.targetType) {
      case "AGENT":
        ids.add(assignment.targetId);
        break;

      case "MANAGER": {
        ids.add(assignment.targetId);
        const teamAgents = users.filter(
          (u) => u.managerId === assignment.targetId && u.role === "conseiller"
        );
        for (const agent of teamAgents) ids.add(agent.id);
        break;
      }

      case "INSTITUTION": {
        const excluded = new Set(assignment.excludedManagerIds ?? []);
        const orgUsers = users.filter(
          (u) => u.institutionId === assignment.targetId
        );
        for (const u of orgUsers) {
          if (u.role === "manager" || u.role === "directeur") {
            if (!excluded.has(u.id)) {
              ids.add(u.id);
            }
          } else if (u.role === "conseiller") {
            if (!u.managerId || !excluded.has(u.managerId)) {
              ids.add(u.id);
            }
          }
        }
        break;
      }
    }
  }

  return ids;
}

/**
 * Get the display label for a ratio by its ID.
 */
export function getRatioLabel(ratioId: string): string {
  const config = defaultRatioConfigs[ratioId as RatioId];
  return config?.name ?? ratioId;
}

/**
 * Default frequency / channel / proof per ratio for auto-generated actions.
 */
const RATIO_DEFAULTS: Record<string, { frequency: string; channel: string; proof: string }> = {
  contacts_rdv: { frequency: "quotidien", channel: "téléphone", proof: "CRM mis à jour" },
  estimations_mandats: { frequency: "2x/semaine", channel: "terrain", proof: "CR estimation" },
  pct_mandats_exclusifs: { frequency: "par RDV", channel: "terrain", proof: "Mandat signé" },
  visites_offre: { frequency: "par visite", channel: "terrain", proof: "CR visite" },
  offres_compromis: { frequency: "par offre", channel: "bureau", proof: "Offre transmise" },
  mandats_simples_vente: { frequency: "hebdomadaire", channel: "téléphone", proof: "Rapport vendeur" },
  mandats_exclusifs_vente: { frequency: "hebdomadaire", channel: "mixte", proof: "Rapport marketing" },
};

/**
 * Wrap a label string into a CoachPlanAction with sensible defaults.
 */
function toAction(
  label: string,
  ratioId: RatioId | null,
  index: number
): CoachPlanAction {
  const defaults = ratioId ? RATIO_DEFAULTS[ratioId] : undefined;
  return {
    id: "pa-" + Date.now() + "-" + index,
    label,
    frequency: defaults?.frequency ?? "hebdomadaire",
    channel: defaults?.channel ?? "mixte",
    proof: defaults?.proof ?? "",
    linkedKpi: ratioId,
    done: false,
  };
}

/**
 * Auto-generate a 30-day coach plan from weak ratios.
 */
export function generateCoachPlanWeeks(
  ratios: ComputedRatio[]
): CoachPlanWeek[] {
  const weak = ratios
    .filter((r) => r.status === "danger" || r.status === "warning")
    .sort((a, b) => {
      const priority = { danger: 0, warning: 1, ok: 2 };
      return priority[a.status] - priority[b.status];
    });

  if (weak.length === 0) {
    return [
      { weekNumber: 1, focus: "Maintien de la performance", actions: [toAction("Continuer les bonnes pratiques actuelles", null, 0)] },
      { weekNumber: 2, focus: "Maintien de la performance", actions: [toAction("Consolider les acquis", null, 1)] },
      { weekNumber: 3, focus: "Développement", actions: [toAction("Explorer de nouvelles opportunités", null, 2)] },
      { weekNumber: 4, focus: "Développement", actions: [toAction("Bilan et objectifs suivants", null, 3)] },
    ];
  }

  const primary = weak[0];
  const secondary = weak[1] ?? weak[0];

  const primaryLabel = getRatioLabel(primary.ratioId);
  const secondaryLabel = getRatioLabel(secondary.ratioId);

  const primaryRatioId = primary.ratioId as RatioId;
  const secondaryRatioId = secondary.ratioId as RatioId;

  const primaryActions = getActionsForRatio(primaryRatioId).slice(0, 2);
  const secondaryActions = getActionsForRatio(secondaryRatioId).slice(0, 2);

  let idx = 0;

  return [
    {
      weekNumber: 1,
      focus: primaryLabel,
      actions: primaryActions.length > 0
        ? primaryActions.map((a) => toAction(a.label, primaryRatioId, idx++))
        : [toAction("Analyser les causes", primaryRatioId, idx++)],
    },
    {
      weekNumber: 2,
      focus: primaryLabel,
      actions: [
        toAction("Mettre en pratique les actions de S1", primaryRatioId, idx++),
        toAction("Mesurer les premiers résultats", primaryRatioId, idx++),
      ],
    },
    {
      weekNumber: 3,
      focus: secondaryLabel,
      actions: secondaryActions.length > 0
        ? secondaryActions.map((a) => toAction(a.label, secondaryRatioId, idx++))
        : [toAction("Identifier les axes d'amélioration", secondaryRatioId, idx++)],
    },
    {
      weekNumber: 4,
      focus: secondaryLabel,
      actions: [
        toAction("Consolider les acquis", secondaryRatioId, idx++),
        toAction("Bilan du plan 30 jours", null, idx++),
      ],
    },
  ];
}

/**
 * Generate a full CoachPlan (DRAFT) from weak ratios for a given assignment.
 */
export function generateCoachPlan(
  ratios: ComputedRatio[],
  assignmentId: string
): CoachPlan {
  const weeks = generateCoachPlanWeeks(ratios);
  const weak = ratios.filter((r) => r.status === "danger" || r.status === "warning");
  const primaryLabel = weak.length > 0 ? getRatioLabel(weak[0].ratioId) : "Maintien";

  return {
    id: "cplan-" + Date.now(),
    coachAssignmentId: assignmentId,
    title: `Plan : ${primaryLabel}`,
    objective: weak.length > 0
      ? `Améliorer le ratio ${primaryLabel}`
      : "Maintenir la performance actuelle",
    startDate: new Date().toISOString().slice(0, 10),
    status: "DRAFT",
    weeks,
  };
}
