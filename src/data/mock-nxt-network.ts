/**
 * Mocks anonymisés cross-agence pour la comparaison NXT côté Directeur.
 * Tous les libellés sont génériques ("#1" à "#8") — aucune info nominative
 * (pas de prénom, pas de ville, pas d'identifiant agence réel).
 *
 * À raccorder DB en production (cf. MOCK_NXT_TEAMS dans teams-comparison-tab.tsx
 * pour le pattern existant côté Manager).
 */

export interface MockNxtAgency {
  syntheticId: string;
  label: string;
  mandatsSignes: number;
  exclusivityRate: number; // 0-100
  compromisSignes: number;
  chiffreAffaires: number; // €
}

/** 8 agences NXT fictives — distribution variée pour ranking parlant. */
export const MOCK_NXT_AGENCIES: MockNxtAgency[] = [
  { syntheticId: "nxt-agency-1", label: "Agence #1", mandatsSignes: 82, exclusivityRate: 74, compromisSignes: 61, chiffreAffaires: 6_100_000 },
  { syntheticId: "nxt-agency-2", label: "Agence #2", mandatsSignes: 67, exclusivityRate: 68, compromisSignes: 52, chiffreAffaires: 5_300_000 },
  { syntheticId: "nxt-agency-3", label: "Agence #3", mandatsSignes: 58, exclusivityRate: 61, compromisSignes: 44, chiffreAffaires: 4_500_000 },
  { syntheticId: "nxt-agency-4", label: "Agence #4", mandatsSignes: 49, exclusivityRate: 55, compromisSignes: 37, chiffreAffaires: 3_800_000 },
  { syntheticId: "nxt-agency-5", label: "Agence #5", mandatsSignes: 41, exclusivityRate: 49, compromisSignes: 30, chiffreAffaires: 3_100_000 },
  { syntheticId: "nxt-agency-6", label: "Agence #6", mandatsSignes: 32, exclusivityRate: 42, compromisSignes: 24, chiffreAffaires: 2_400_000 },
  { syntheticId: "nxt-agency-7", label: "Agence #7", mandatsSignes: 25, exclusivityRate: 36, compromisSignes: 19, chiffreAffaires: 1_900_000 },
  { syntheticId: "nxt-agency-8", label: "Agence #8", mandatsSignes: 18, exclusivityRate: 30, compromisSignes: 14, chiffreAffaires: 1_400_000 },
];

export interface MockNxtConseiller {
  syntheticId: string;
  label: string;
  mandatsSignes: number;
  exclusivityRate: number; // 0-100
  compromisSignes: number;
}

/** 8 conseillers NXT fictifs — distribution variée pour ranking parlant. */
export const MOCK_NXT_CONSEILLERS: MockNxtConseiller[] = [
  { syntheticId: "nxt-conseiller-1", label: "Conseiller #1", mandatsSignes: 8, exclusivityRate: 78, compromisSignes: 6 },
  { syntheticId: "nxt-conseiller-2", label: "Conseiller #2", mandatsSignes: 7, exclusivityRate: 70, compromisSignes: 5 },
  { syntheticId: "nxt-conseiller-3", label: "Conseiller #3", mandatsSignes: 6, exclusivityRate: 62, compromisSignes: 4 },
  { syntheticId: "nxt-conseiller-4", label: "Conseiller #4", mandatsSignes: 5, exclusivityRate: 55, compromisSignes: 4 },
  { syntheticId: "nxt-conseiller-5", label: "Conseiller #5", mandatsSignes: 4, exclusivityRate: 48, compromisSignes: 3 },
  { syntheticId: "nxt-conseiller-6", label: "Conseiller #6", mandatsSignes: 3, exclusivityRate: 41, compromisSignes: 2 },
  { syntheticId: "nxt-conseiller-7", label: "Conseiller #7", mandatsSignes: 2, exclusivityRate: 33, compromisSignes: 2 },
  { syntheticId: "nxt-conseiller-8", label: "Conseiller #8", mandatsSignes: 1, exclusivityRate: 25, compromisSignes: 1 },
];
