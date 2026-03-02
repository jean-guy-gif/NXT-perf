import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";

export const mockCoachAssignments: CoachAssignment[] = [
  // ── Coach Pierre Durand (coach-1) — 3 assignments ──
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
    targetId: "m-demo-2",
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

  // ── Jean-Guy en tant que coach (m-demo) — 3 assignments ──
  {
    id: "ca-demo-1",
    coachId: "m-demo",
    targetType: "AGENT",
    targetId: "u-demo-b3",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "ca-demo-2",
    coachId: "m-demo",
    targetType: "MANAGER",
    targetId: "m-demo-3",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-25T00:00:00Z",
  },
  {
    id: "ca-demo-3",
    coachId: "m-demo",
    targetType: "INSTITUTION",
    targetId: "org-demo",
    status: "ACTIVE",
    excludedManagerIds: ["m-demo-2"],
    createdAt: "2026-03-01T00:00:00Z",
  },
];

export const mockCoachActions: CoachAction[] = [
  // ── Pierre Durand (coach-1) — existing actions ──
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

  // ── Jean-Guy / ca-demo-1 (Théo Vasseur) — 4 actions ──
  {
    id: "cact-demo-1",
    coachAssignmentId: "ca-demo-1",
    title: "Établir un bilan de démarrage avec Théo",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "cact-demo-2",
    coachAssignmentId: "ca-demo-1",
    title: "Définir un objectif de 30 contacts par semaine",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-02-22T00:00:00Z",
  },
  {
    id: "cact-demo-3",
    coachAssignmentId: "ca-demo-1",
    title: "Préparer un script d'appel pour la prospection téléphonique",
    status: "TODO",
    dueDate: "2026-03-08",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "cact-demo-4",
    coachAssignmentId: "ca-demo-1",
    title: "Simuler un RDV estimation avec jeu de rôle",
    status: "TODO",
    dueDate: "2026-03-15",
    createdAt: "2026-03-01T00:00:00Z",
  },

  // ── Jean-Guy / ca-demo-2 (Marc/team-gamma) — 3 actions ──
  {
    id: "cact-demo-5",
    coachAssignmentId: "ca-demo-2",
    title: "Analyser les résultats Q1 de l'équipe gamma",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-02-25T00:00:00Z",
  },
  {
    id: "cact-demo-6",
    coachAssignmentId: "ca-demo-2",
    title: "Organiser une session collective sur l'argumentaire exclusivité",
    status: "TODO",
    dueDate: "2026-03-10",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "cact-demo-7",
    coachAssignmentId: "ca-demo-2",
    title: "Accompagner Nicolas sur son premier mandat exclusif",
    status: "TODO",
    dueDate: "2026-03-20",
    createdAt: "2026-03-01T00:00:00Z",
  },

  // ── Jean-Guy / ca-demo-3 (org-demo) — 2 actions ──
  {
    id: "cact-demo-8",
    coachAssignmentId: "ca-demo-3",
    title: "Réunion de lancement coaching institutionnel",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "cact-demo-9",
    coachAssignmentId: "ca-demo-3",
    title: "Produire le rapport trimestriel de performance agence",
    status: "TODO",
    dueDate: "2026-03-30",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

export const mockCoachPlans: CoachPlan[] = [
  // ── Pierre Durand / ca-1 (Alice) — plan actif ──
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

  // ── Jean-Guy / ca-demo-1 (Théo) — plan terminé ──
  {
    id: "cplan-demo-1",
    coachAssignmentId: "ca-demo-1",
    startDate: "2026-02-01",
    status: "COMPLETED",
    weeks: [
      { weekNumber: 1, focus: "Prise de poste", actions: ["Bilan de démarrage", "Identifier les points forts et axes de travail"] },
      { weekNumber: 2, focus: "Prise de poste", actions: ["Définir les objectifs hebdomadaires", "Mettre en place un rituel de suivi"] },
      { weekNumber: 3, focus: "Prospection", actions: ["Construire un fichier de 50 contacts", "Préparer les premiers appels"] },
      { weekNumber: 4, focus: "Prospection", actions: ["Bilan des premières prises de contact", "Ajuster le discours commercial"] },
    ],
  },

  // ── Jean-Guy / ca-demo-1 (Théo) — plan actif en cours ──
  {
    id: "cplan-demo-2",
    coachAssignmentId: "ca-demo-1",
    startDate: "2026-03-01",
    status: "ACTIVE",
    weeks: [
      { weekNumber: 1, focus: "Contacts → RDV", actions: ["Appliquer le script d'appel sur 20 contacts", "Obtenir 5 RDV minimum"] },
      { weekNumber: 2, focus: "Contacts → RDV", actions: ["Analyser le taux de transformation", "Ajuster l'approche selon les retours"] },
      { weekNumber: 3, focus: "% Exclusivité", actions: ["Travailler l'argumentaire exclusivité", "Simuler un RDV estimation"] },
      { weekNumber: 4, focus: "% Exclusivité", actions: ["Accompagner sur un vrai RDV estimation", "Bilan du plan et définir la suite"] },
    ],
  },

  // ── Jean-Guy / ca-demo-2 (Marc/team-gamma) — accompagnement équipe ──
  {
    id: "cplan-demo-3",
    coachAssignmentId: "ca-demo-2",
    startDate: "2026-03-01",
    status: "ACTIVE",
    weeks: [
      { weekNumber: 1, focus: "Audit équipe", actions: ["Analyser les KPIs individuels de chaque agent", "Identifier Nicolas comme priorité coaching"] },
      { weekNumber: 2, focus: "Session collective", actions: ["Organiser un atelier exclusivité avec l'équipe", "Définir les objectifs collectifs Q2"] },
      { weekNumber: 3, focus: "Accompagnement Nicolas", actions: ["Co-animer un RDV estimation avec Nicolas", "Débriefer et fixer un plan d'action individuel"] },
      { weekNumber: 4, focus: "Bilan", actions: ["Mesurer les progrès de l'équipe", "Préparer le plan du mois suivant"] },
    ],
  },
];
