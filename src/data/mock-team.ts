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
      message: "Théo Vasseur : 0 mandat signé sur 1 estimation — aucune conversion ce mois",
      relatedUserId: "u-demo-b3",
      relatedRatioId: "estimations_mandats",
    },
    {
      id: "a2",
      type: "warning",
      message: "Nicolas Mercier : 30 contacts → 1 RDV → 1 mandat simple → 0 vente. Pipeline très faible.",
      relatedUserId: "u-demo-g2",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a3",
      type: "warning",
      message: "Alice Martin : ratio contacts/RDV à 16.7 (objectif confirmé : 15). Légèrement au-dessus.",
      relatedUserId: "u-demo-1",
      relatedRatioId: "contacts_rdv",
    },
  ],
  members: [],
};

// Estimations réalisées
export const mockRankingsEstimations: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 7, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 5, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 3, rank: 3 },
];

// Mandats signés
export const mockRankingsMandats: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 5, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 3 },
];

// Visites
export const mockRankingsVisites: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 16, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 14, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 12, rank: 3 },
];

// Offres reçues
export const mockRankingsOffres: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 4, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 3 },
];

// Compromis signés
export const mockRankingsCompromis: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 3, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 3 },
];

// Actes signés
export const mockRankingsActes: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 3, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 3 },
];

// Chiffre d'affaires
export const mockRankingsCA: RankingEntry[] = [
  { userId: "u-demo-3", userName: "Catherine Durand", value: 42000, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 28000, rank: 2 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 8500, rank: 3 },
];
