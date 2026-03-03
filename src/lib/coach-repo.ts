import { useAppStore } from "@/stores/app-store";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";

function getState() {
  return useAppStore.getState();
}

export const coachRepo = {
  // Assignments
  getAssignments(coachId: string): CoachAssignment[] {
    return getState().coachAssignments.filter(
      (a) => a.coachId === coachId && a.status === "ACTIVE"
    );
  },

  revokeAssignment(id: string): void {
    getState().revokeCoachAssignment(id);
  },

  updateExcludedManagers(id: string, excluded: string[]): void {
    getState().updateExcludedManagers(id, excluded);
  },

  // Plans
  getPlans(assignmentId: string): CoachPlan[] {
    return getState().coachPlans.filter((p) => p.coachAssignmentId === assignmentId);
  },

  getActivePlan(assignmentId: string): CoachPlan | null {
    return (
      getState().coachPlans.find(
        (p) =>
          p.coachAssignmentId === assignmentId &&
          (p.status === "ACTIVE" || p.status === "VALIDATED" || p.status === "DRAFT")
      ) ?? null
    );
  },

  createPlan(plan: CoachPlan): void {
    getState().createCoachPlan(plan);
  },

  updatePlan(id: string, updates: Partial<CoachPlan>): void {
    getState().updateCoachPlan(id, updates);
  },

  validatePlan(id: string): void {
    getState().validateCoachPlan(id);
  },

  revertToDraft(id: string): void {
    getState().revertCoachPlanToDraft(id);
  },

  completePlan(id: string): void {
    getState().completeCoachPlan(id);
  },

  // Actions
  getActions(assignmentId: string): CoachAction[] {
    return getState().coachActions.filter((a) => a.coachAssignmentId === assignmentId);
  },

  addAction(action: CoachAction): void {
    getState().addCoachAction(action);
  },

  toggleAction(id: string): void {
    getState().toggleCoachAction(id);
  },

  removeAction(id: string): void {
    getState().removeCoachAction(id);
  },
};
