import type { RatioId } from "./ratios";

export type CoachTargetType = "AGENT" | "MANAGER" | "INSTITUTION";
export type AssignmentStatus = "ACTIVE" | "REVOKED";
export type CoachActionStatus = "TODO" | "DONE";
export type CoachPlanStatus = "DRAFT" | "VALIDATED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface CoachAssignment {
  id: string;
  coachId: string;
  targetType: CoachTargetType;
  targetId: string;
  status: AssignmentStatus;
  excludedManagerIds: string[] | null;
  createdAt: string;
}

export interface CoachAction {
  id: string;
  coachAssignmentId: string;
  title: string;
  status: CoachActionStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface CoachPlanAction {
  id: string;
  label: string;
  frequency: string;
  channel: string;
  proof: string;
  linkedKpi: RatioId | null;
  done: boolean;
}

export interface CoachPlanWeek {
  weekNumber: 1 | 2 | 3 | 4;
  focus: string;
  actions: CoachPlanAction[];
}

export interface CoachPlan {
  id: string;
  coachAssignmentId: string;
  title: string;
  objective: string;
  startDate: string;
  status: CoachPlanStatus;
  weeks: CoachPlanWeek[];
}

/* ── Private coach notes per assignment ── */
export interface CoachNote {
  id: string;
  coachAssignmentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Coaching session log ── */
export interface CoachSession {
  id: string;
  coachAssignmentId: string;
  date: string;
  title: string;
  notes: string;
  createdAt: string;
}

/* ── Simple action plan (distinct from the 30-day plan) ── */
export interface CoachQuickPlan {
  id: string;
  coachAssignmentId: string;
  objective: string;
  actions: string[];
  comment: string;
  updatedAt: string;
}
