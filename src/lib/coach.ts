import type { CoachAssignment, CoachPlanWeek } from "@/types/coach";
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
function getRatioLabel(ratioId: string): string {
  const config = defaultRatioConfigs[ratioId as RatioId];
  return config?.name ?? ratioId;
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
      { weekNumber: 1, focus: "Maintien de la performance", actions: ["Continuer les bonnes pratiques actuelles"] },
      { weekNumber: 2, focus: "Maintien de la performance", actions: ["Consolider les acquis"] },
      { weekNumber: 3, focus: "Développement", actions: ["Explorer de nouvelles opportunités"] },
      { weekNumber: 4, focus: "Développement", actions: ["Bilan et objectifs suivants"] },
    ];
  }

  const primary = weak[0];
  const secondary = weak[1] ?? weak[0];

  const primaryLabel = getRatioLabel(primary.ratioId);
  const secondaryLabel = getRatioLabel(secondary.ratioId);

  const primaryActions = getActionsForRatio(primary.ratioId as RatioId).slice(0, 2).map((a) => a.label);
  const secondaryActions = getActionsForRatio(secondary.ratioId as RatioId).slice(0, 2).map((a) => a.label);

  return [
    { weekNumber: 1, focus: primaryLabel, actions: primaryActions.length > 0 ? primaryActions : ["Analyser les causes"] },
    { weekNumber: 2, focus: primaryLabel, actions: ["Mettre en pratique les actions de S1", "Mesurer les premiers résultats"] },
    { weekNumber: 3, focus: secondaryLabel, actions: secondaryActions.length > 0 ? secondaryActions : ["Identifier les axes d'amélioration"] },
    { weekNumber: 4, focus: secondaryLabel, actions: ["Consolider les acquis", "Bilan du plan 30 jours"] },
  ];
}
