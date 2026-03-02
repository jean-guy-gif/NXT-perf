import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";

export const mockCoachAssignments: CoachAssignment[] = [
  {
    id: "ca-1",
    coachId: "coach-1",
    targetType: "AGENT",
    targetId: "u-demo-1",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "ca-2",
    coachId: "coach-1",
    targetType: "MANAGER",
    targetId: "m-beta",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "ca-3",
    coachId: "coach-1",
    targetType: "INSTITUTION",
    targetId: "org-demo",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-15T00:00:00Z",
  },
];

export const mockCoachActions: CoachAction[] = [
  {
    id: "cact-1",
    coachAssignmentId: "ca-1",
    title: "Relancer les 5 leads en attente",
    status: "TODO",
    dueDate: "2026-03-10",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "cact-2",
    coachAssignmentId: "ca-1",
    title: "Préparer script d'appel prospection",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "cact-3",
    coachAssignmentId: "ca-2",
    title: "Former l'équipe sur l'argumentaire exclusivité",
    status: "TODO",
    dueDate: "2026-03-15",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

export const mockCoachPlans: CoachPlan[] = [
  {
    id: "cplan-1",
    coachAssignmentId: "ca-1",
    startDate: "2026-03-01",
    status: "ACTIVE",
    weeks: [
      { weekNumber: 1, focus: "Contacts → RDV", actions: ["Relancer les prospects non contactés", "Préparer un script d'appel"] },
      { weekNumber: 2, focus: "Contacts → RDV", actions: ["Mettre en pratique les actions de S1", "Mesurer les premiers résultats"] },
      { weekNumber: 3, focus: "Estimations → Mandats", actions: ["Revoir l'argumentation prix", "Préparer un dossier comparatif"] },
      { weekNumber: 4, focus: "Estimations → Mandats", actions: ["Consolider les acquis", "Bilan du plan 30 jours"] },
    ],
  },
];
