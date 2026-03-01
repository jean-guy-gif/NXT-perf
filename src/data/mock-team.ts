import type { TeamStats, RankingEntry } from "@/types/team";

export const mockTeamStats: TeamStats = {
  teamId: "team-demo",
  totalCA: 150500,
  totalActes: 10,
  avgExclusivite: 58,
  avgPerformance: 55,
  alerts: [
    {
      id: "a1",
      type: "danger",
      message: "Hervé Fournier : 0 RDV estimation sur 42 contacts — aucune conversion ce mois",
      relatedUserId: "u-demo-8",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a2",
      type: "danger",
      message: "Géraldine Laurent : 50 contacts → 2 RDV → 1 mandat simple → 0 vente. Pipeline bloqué.",
      relatedUserId: "u-demo-7",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a3",
      type: "warning",
      message: "David Dubois : ratio contacts/RDV à 30 (objectif junior : 20). Besoin d'accompagnement prise de RDV.",
      relatedUserId: "u-demo-4",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a4",
      type: "warning",
      message: "Émilie Petit : 5 estimations mais seulement 2 mandats signés. Taux de transformation à améliorer.",
      relatedUserId: "u-demo-5",
      relatedRatioId: "estimations_mandats",
    },
  ],
  members: [],
};

// Estimations réalisées
export const mockRankingsEstimations: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 8, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 7, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 5, rank: 3 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 5, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 3, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 3, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 2, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

// Mandats signés
export const mockRankingsMandats: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 7, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 5, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 4 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 2, rank: 5 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

// Visites
export const mockRankingsVisites: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 18, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 16, rank: 2 },
  { userId: "u-demo-4", userName: "David Dubois", value: 15, rank: 3 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 14, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 12, rank: 5 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 10, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 7, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 3, rank: 8 },
];

// Offres reçues
export const mockRankingsOffres: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 6, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 2 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 4, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 4 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 2, rank: 5 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

// Compromis signés
export const mockRankingsCompromis: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 5, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 3, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 4 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 1, rank: 5 },
  { userId: "u-demo-4", userName: "David Dubois", value: 0, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 0, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

// Actes signés
export const mockRankingsActes: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 4, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 3, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 4 },
  { userId: "u-demo-4", userName: "David Dubois", value: 0, rank: 5 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 0, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 0, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

// Chiffre d'affaires
export const mockRankingsCA: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 72000, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 42000, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 28000, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 8500, rank: 4 },
  { userId: "u-demo-4", userName: "David Dubois", value: 0, rank: 5 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 0, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 0, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];
