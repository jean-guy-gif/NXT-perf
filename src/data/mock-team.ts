import type { TeamStats, RankingEntry } from "@/types/team";

export const mockTeamStats: TeamStats = {
  teamId: "team1",
  totalCA: 37700,
  totalActes: 4,
  avgExclusivite: 57,
  avgPerformance: 72,
  alerts: [
    {
      id: "a1",
      type: "danger",
      message: "Pierre Durand : 0 mandat signé ce mois - ratio contacts/RDV très bas (30:1)",
      relatedUserId: "u3",
      relatedRatioId: "contacts_rdv",
    },
    {
      id: "a2",
      type: "warning",
      message: "Lucie Bernard : ratio mandats simples/vente à 8 (objectif confirmé : 6)",
      relatedUserId: "u4",
      relatedRatioId: "mandats_simples_vente",
    },
    {
      id: "a3",
      type: "warning",
      message: "Taux d'exclusivité moyen équipe : 57% - en dessous de l'objectif confirmé (50% OK mais visez 70%)",
      relatedRatioId: "pct_mandats_exclusifs",
    },
  ],
  members: [],
};

export const mockRankingsEstimations: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 5, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 3, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 2, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 1, rank: 4 },
];

export const mockRankingsMandats: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 4, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 2, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 1, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 0, rank: 4 },
];

export const mockRankingsVisites: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 14, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 8, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 6, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 5, rank: 4 },
];

export const mockRankingsOffres: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 4, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 2, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 1, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 0, rank: 4 },
];

export const mockRankingsCompromis: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 2, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 1, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 1, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 0, rank: 4 },
];

export const mockRankingsActes: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 2, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 1, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 1, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 0, rank: 4 },
];

export const mockRankingsCA: RankingEntry[] = [
  { userId: "u2", userName: "Marie Martin", value: 22000, rank: 1 },
  { userId: "u1", userName: "Jean Dupont", value: 8500, rank: 2 },
  { userId: "u4", userName: "Lucie Bernard", value: 7200, rank: 3 },
  { userId: "u3", userName: "Pierre Durand", value: 0, rank: 4 },
];
