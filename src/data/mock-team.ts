import type { TeamStats, RankingEntry } from "@/types/team";

export const mockTeamStats: TeamStats = {
  teamId: "team-demo",
  totalCA: 148000,
  totalActes: 11,
  avgExclusivite: 68,
  avgPerformance: 72,
  alerts: [
    {
      id: "a1",
      type: "danger",
      message: "Hervé Fournier : 0 mandat signé ce mois - ratio contacts/RDV très bas (24:1)",
      relatedUserId: "u-demo-8",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a2",
      type: "warning",
      message: "David Dubois : ratio mandats simples/vente à 8 (objectif junior : 10)",
      relatedUserId: "u-demo-4",
      relatedRatioId: "mandats_simples_vente",
    },
    {
      id: "a3",
      type: "warning",
      message: "Géraldine Laurent : CA en dessous de la moyenne équipe (4 800 € vs 18 500 €)",
      relatedUserId: "u-demo-7",
      relatedRatioId: "mandats_exclusifs_vente",
    },
  ],
  members: [],
};

export const mockRankingsEstimations: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 7, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 6, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 5, rank: 3 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 4, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 3, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 3, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 2, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 1, rank: 8 },
];

export const mockRankingsMandats: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 6, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 5, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 3 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 3, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 2, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

export const mockRankingsVisites: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 18, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 16, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 14, rank: 3 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 10, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 8, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 7, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 6, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 2, rank: 8 },
];

export const mockRankingsOffres: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 5, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 4, rank: 2 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 4, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 2, rank: 4 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 2, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 1, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

export const mockRankingsCompromis: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 3, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 3, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 4 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 1, rank: 5 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 1, rank: 6 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

export const mockRankingsActes: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 3, rank: 1 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 2, rank: 2 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 2, rank: 3 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 1, rank: 4 },
  { userId: "u-demo-4", userName: "David Dubois", value: 1, rank: 5 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 1, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 1, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];

export const mockRankingsCA: RankingEntry[] = [
  { userId: "u-demo-6", userName: "Franck Girard", value: 58000, rank: 1 },
  { userId: "u-demo-3", userName: "Catherine Durand", value: 35000, rank: 2 },
  { userId: "u-demo-2", userName: "Bob Bernard", value: 22000, rank: 3 },
  { userId: "u-demo-5", userName: "Émilie Petit", value: 12500, rank: 4 },
  { userId: "u-demo-1", userName: "Alice Martin", value: 8500, rank: 5 },
  { userId: "u-demo-4", userName: "David Dubois", value: 7200, rank: 6 },
  { userId: "u-demo-7", userName: "Géraldine Laurent", value: 4800, rank: 7 },
  { userId: "u-demo-8", userName: "Hervé Fournier", value: 0, rank: 8 },
];
