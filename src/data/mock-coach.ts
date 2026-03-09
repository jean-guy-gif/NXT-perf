import type { CoachAssignment, CoachAction, CoachPlan, CoachPlanAction, CoachNote, CoachSession, CoachQuickPlan } from "@/types/coach";

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

/* Helper to keep action declarations concise */
function pa(
  id: string,
  label: string,
  frequency: string,
  channel: string,
  proof: string,
  linkedKpi: CoachPlanAction["linkedKpi"],
  done: boolean
): CoachPlanAction {
  return { id, label, frequency, channel, proof, linkedKpi, done };
}

export const mockCoachPlans: CoachPlan[] = [
  // ── Pierre Durand / ca-1 (Alice) — plan validé ──
  {
    id: "cplan-1",
    coachAssignmentId: "ca-1",
    title: "Plan : Contacts → RDV Estimation",
    objective: "Améliorer le ratio Contacts → RDV Estimation",
    startDate: "2026-03-01",
    status: "VALIDATED",
    weeks: [
      {
        weekNumber: 1,
        focus: "Contacts → RDV",
        actions: [
          pa("pa-1-1-1", "Relancer les prospects non contactés", "quotidien", "téléphone", "CRM mis à jour", "contacts_rdv", true),
          pa("pa-1-1-2", "Préparer un script d'appel structuré", "ponctuel", "bureau", "Script rédigé", "contacts_rdv", true),
        ],
      },
      {
        weekNumber: 2,
        focus: "Contacts → RDV",
        actions: [
          pa("pa-1-2-1", "Mettre en pratique le script sur 15 contacts", "quotidien", "téléphone", "CRM mis à jour", "contacts_rdv", false),
          pa("pa-1-2-2", "Mesurer le taux de prise de RDV", "hebdomadaire", "bureau", "Tableau de bord", "contacts_rdv", false),
        ],
      },
      {
        weekNumber: 3,
        focus: "Estimations → Mandats",
        actions: [
          pa("pa-1-3-1", "Revoir l'argumentation prix avec comparables", "2x/semaine", "terrain", "CR estimation", "estimations_mandats", false),
          pa("pa-1-3-2", "Préparer un dossier comparatif par secteur", "ponctuel", "bureau", "Dossier imprimé", "estimations_mandats", false),
        ],
      },
      {
        weekNumber: 4,
        focus: "Estimations → Mandats",
        actions: [
          pa("pa-1-4-1", "Consolider les acquis des semaines précédentes", "quotidien", "mixte", "Rapport vendeur", "estimations_mandats", false),
          pa("pa-1-4-2", "Bilan du plan 30 jours avec le coach", "ponctuel", "visio", "CR bilan", null, false),
        ],
      },
    ],
  },

  // ── Jean-Guy / ca-demo-1 (Théo) — plan terminé ──
  {
    id: "cplan-demo-1",
    coachAssignmentId: "ca-demo-1",
    title: "Plan : Prise de poste Théo",
    objective: "Accompagner la montée en compétences de Théo sur ses premières semaines",
    startDate: "2026-02-01",
    status: "COMPLETED",
    weeks: [
      {
        weekNumber: 1,
        focus: "Prise de poste",
        actions: [
          pa("pa-d1-1-1", "Bilan de démarrage complet", "ponctuel", "bureau", "Fiche bilan remplie", null, true),
          pa("pa-d1-1-2", "Identifier les points forts et axes de travail", "ponctuel", "bureau", "Grille d'évaluation", null, true),
        ],
      },
      {
        weekNumber: 2,
        focus: "Prise de poste",
        actions: [
          pa("pa-d1-2-1", "Définir les objectifs hebdomadaires", "hebdomadaire", "visio", "Fiche objectifs", null, true),
          pa("pa-d1-2-2", "Mettre en place un rituel de suivi quotidien", "quotidien", "téléphone", "Check-in réalisé", null, true),
        ],
      },
      {
        weekNumber: 3,
        focus: "Prospection",
        actions: [
          pa("pa-d1-3-1", "Construire un fichier de 50 contacts qualifiés", "ponctuel", "bureau", "Fichier Excel", "contacts_rdv", true),
          pa("pa-d1-3-2", "Préparer et passer les premiers appels", "quotidien", "téléphone", "CRM mis à jour", "contacts_rdv", true),
        ],
      },
      {
        weekNumber: 4,
        focus: "Prospection",
        actions: [
          pa("pa-d1-4-1", "Bilan des premières prises de contact", "ponctuel", "bureau", "Rapport d'activité", "contacts_rdv", true),
          pa("pa-d1-4-2", "Ajuster le discours commercial", "ponctuel", "visio", "Script révisé", "contacts_rdv", true),
        ],
      },
    ],
  },

  // ── Jean-Guy / ca-demo-1 (Théo) — plan validé en cours ──
  {
    id: "cplan-demo-2",
    coachAssignmentId: "ca-demo-1",
    title: "Plan : Conversion contacts et exclusivité",
    objective: "Améliorer le ratio Contacts → RDV et le taux d'exclusivité",
    startDate: "2026-03-01",
    status: "VALIDATED",
    weeks: [
      {
        weekNumber: 1,
        focus: "Contacts → RDV",
        actions: [
          pa("pa-d2-1-1", "Appliquer le script d'appel sur 20 contacts", "quotidien", "téléphone", "CRM mis à jour", "contacts_rdv", true),
          pa("pa-d2-1-2", "Obtenir 5 RDV estimation minimum", "hebdomadaire", "terrain", "Agenda confirmé", "contacts_rdv", false),
        ],
      },
      {
        weekNumber: 2,
        focus: "Contacts → RDV",
        actions: [
          pa("pa-d2-2-1", "Analyser le taux de transformation S1", "ponctuel", "bureau", "Tableau de bord", "contacts_rdv", false),
          pa("pa-d2-2-2", "Ajuster l'approche selon les retours terrain", "2x/semaine", "visio", "CR coaching", "contacts_rdv", false),
        ],
      },
      {
        weekNumber: 3,
        focus: "% Exclusivité",
        actions: [
          pa("pa-d2-3-1", "Travailler l'argumentaire exclusivité", "2x/semaine", "bureau", "Fiche argumentaire", "pct_mandats_exclusifs", false),
          pa("pa-d2-3-2", "Simuler un RDV estimation avec jeu de rôle", "ponctuel", "bureau", "Grille d'évaluation", "pct_mandats_exclusifs", false),
        ],
      },
      {
        weekNumber: 4,
        focus: "% Exclusivité",
        actions: [
          pa("pa-d2-4-1", "Accompagner Théo sur un vrai RDV estimation", "ponctuel", "terrain", "CR visite", "pct_mandats_exclusifs", false),
          pa("pa-d2-4-2", "Bilan du plan et définir la suite", "ponctuel", "visio", "CR bilan", null, false),
        ],
      },
    ],
  },

  // ── Jean-Guy / ca-demo-2 (Marc/team-gamma) — accompagnement équipe validé ──
  {
    id: "cplan-demo-3",
    coachAssignmentId: "ca-demo-2",
    title: "Plan : Montée en compétences équipe Gamma",
    objective: "Améliorer la performance collective et accompagner Nicolas en priorité",
    startDate: "2026-03-01",
    status: "VALIDATED",
    weeks: [
      {
        weekNumber: 1,
        focus: "Audit équipe",
        actions: [
          pa("pa-d3-1-1", "Analyser les KPIs individuels de chaque agent", "ponctuel", "bureau", "Tableau comparatif", null, true),
          pa("pa-d3-1-2", "Identifier Nicolas comme priorité coaching", "ponctuel", "bureau", "Fiche diagnostic", null, true),
        ],
      },
      {
        weekNumber: 2,
        focus: "Session collective",
        actions: [
          pa("pa-d3-2-1", "Organiser un atelier exclusivité avec l'équipe", "ponctuel", "bureau", "Support de formation", "pct_mandats_exclusifs", false),
          pa("pa-d3-2-2", "Définir les objectifs collectifs Q2", "ponctuel", "visio", "Fiche objectifs équipe", null, false),
        ],
      },
      {
        weekNumber: 3,
        focus: "Accompagnement Nicolas",
        actions: [
          pa("pa-d3-3-1", "Co-animer un RDV estimation avec Nicolas", "ponctuel", "terrain", "CR visite", "estimations_mandats", false),
          pa("pa-d3-3-2", "Débriefer et fixer un plan d'action individuel", "ponctuel", "bureau", "Plan individuel", null, false),
        ],
      },
      {
        weekNumber: 4,
        focus: "Bilan",
        actions: [
          pa("pa-d3-4-1", "Mesurer les progrès de l'équipe sur les ratios clés", "ponctuel", "bureau", "Rapport mensuel", null, false),
          pa("pa-d3-4-2", "Préparer le plan du mois suivant", "ponctuel", "visio", "Ébauche plan M+1", null, false),
        ],
      },
    ],
  },
];

/* ── Coach Notes ── */
export const mockCoachNotes: CoachNote[] = [
  {
    id: "cnote-1",
    coachAssignmentId: "ca-demo-1",
    content: "Théo manque de confiance en appel. Travailler le script et la posture vocale. Bonne attitude terrain.",
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-03-01T14:00:00Z",
  },
  {
    id: "cnote-2",
    coachAssignmentId: "ca-demo-2",
    content: "Marc a un bon leadership mais l'équipe manque de rigueur sur l'exclusivité. Nicolas est la priorité.",
    createdAt: "2026-02-26T09:00:00Z",
    updatedAt: "2026-02-26T09:00:00Z",
  },
  {
    id: "cnote-3",
    coachAssignmentId: "ca-demo-3",
    content: "Organisation solide mais taux de mandats exclusifs trop faible globalement. Culture agence à faire évoluer.",
    createdAt: "2026-03-02T11:00:00Z",
    updatedAt: "2026-03-02T11:00:00Z",
  },
  {
    id: "cnote-4",
    coachAssignmentId: "ca-1",
    content: "Alice a un très bon potentiel. Problématique pricing vendeur, elle sous-estime parfois les biens.",
    createdAt: "2026-02-18T15:00:00Z",
    updatedAt: "2026-02-18T15:00:00Z",
  },
];

/* ── Coach Sessions ── */
export const mockCoachSessions: CoachSession[] = [
  {
    id: "csess-1",
    coachAssignmentId: "ca-demo-1",
    date: "2026-02-20",
    title: "Bilan de démarrage",
    notes: "Points forts identifiés : motivation, ponctualité. Axes : prospection téléphonique, gestion du temps.",
    createdAt: "2026-02-20T17:00:00Z",
  },
  {
    id: "csess-2",
    coachAssignmentId: "ca-demo-1",
    date: "2026-03-01",
    title: "Suivi prospection S1",
    notes: "30 contacts réalisés mais seulement 2 RDV. Travailler le pitch d'accroche.",
    createdAt: "2026-03-01T18:00:00Z",
  },
  {
    id: "csess-3",
    coachAssignmentId: "ca-demo-2",
    date: "2026-02-28",
    title: "Analyse Q1 équipe Gamma",
    notes: "Résultats disparates. Julie performe bien, Nicolas en difficulté. Marc doit déléguer davantage.",
    createdAt: "2026-02-28T16:00:00Z",
  },
  {
    id: "csess-4",
    coachAssignmentId: "ca-demo-3",
    date: "2026-03-01",
    title: "Lancement coaching institutionnel",
    notes: "Objectifs fixés : +15% taux exclusivité en 3 mois. Formation collective planifiée.",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "csess-5",
    coachAssignmentId: "ca-1",
    date: "2026-02-15",
    title: "Premier RDV coaching Alice",
    notes: "Alice a besoin de structurer sa prospection. Script d'appel à préparer ensemble.",
    createdAt: "2026-02-15T14:00:00Z",
  },
];

/* ── Coach Quick Plans ── */
export const mockCoachQuickPlans: CoachQuickPlan[] = [
  {
    id: "cqp-1",
    coachAssignmentId: "ca-demo-1",
    objective: "Atteindre 5 RDV estimation par semaine",
    actions: [
      "Appliquer le script d'appel sur 20 contacts/jour",
      "Relancer les leads chauds sous 24h",
      "Préparer un argumentaire estimation solide",
    ],
    comment: "Focus sur la conversion contacts → RDV. Théo progresse mais doit être plus régulier.",
    updatedAt: "2026-03-01T14:00:00Z",
  },
  {
    id: "cqp-2",
    coachAssignmentId: "ca-demo-2",
    objective: "Améliorer le taux d'exclusivité de l'équipe à 50%",
    actions: [
      "Former l'équipe sur l'argumentaire exclusivité",
      "Accompagner Nicolas sur ses prochains RDV estimation",
      "Mettre en place un suivi hebdomadaire des mandats",
    ],
    comment: "L'équipe Gamma a un bon volume mais manque de conviction sur l'exclusivité.",
    updatedAt: "2026-03-01T15:00:00Z",
  },
];
