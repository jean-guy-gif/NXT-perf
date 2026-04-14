import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

// =============================================================================
// NXT Immobilier Lyon — Second agency for network-level demo
// =============================================================================
//
// TODO(provisoire): placeholder dev, valeur à calibrer — CA compromis mock =
// compromisSignes × 15 000€. Les valeurs `chiffreAffairesCompromis` de ce
// fichier sont des placeholders dérivés de cette règle, pas des valeurs
// issues du CRM. À remplacer par des données réelles ou une règle calibrée
// quand le backend sera branché. Voir docs/TECH_DEBT.md.

export const mockNetworkUsers: User[] = [
  // Directeur d'agence Lyon (also manages team-lyon-1)
  {
    id: "d-lyon",
    email: "d-lyon@demo.fr",
    password: "demo",
    firstName: "Laurent",
    lastName: "Girard",
    mainRole: "directeur",
    role: "directeur",
    availableRoles: ["directeur", "manager", "conseiller"],
    category: "expert",
    teamId: "team-lyon-1",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "INSTITUTION",
    institutionId: "org-demo-2",
  },
  // Manager team-lyon-2
  {
    id: "m-lyon-2",
    email: "m-lyon-2@demo.fr",
    password: "demo",
    firstName: "Émilie",
    lastName: "Renaud",
    mainRole: "manager",
    role: "manager",
    availableRoles: ["manager", "conseiller"],
    category: "confirme",
    teamId: "team-lyon-2",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "MANAGER",
    institutionId: "org-demo-2",
  },
  // ── Team 1 (team-lyon-1) — managed by Laurent Girard ──
  {
    id: "u-lyon-1",
    email: "u-lyon-1@demo.fr",
    password: "demo",
    firstName: "Mathieu",
    lastName: "Fabre",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-lyon-1",
    managerId: "d-lyon",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },
  {
    id: "u-lyon-2",
    email: "u-lyon-2@demo.fr",
    password: "demo",
    firstName: "Léa",
    lastName: "Blanc",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "expert",
    teamId: "team-lyon-1",
    managerId: "d-lyon",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },
  {
    id: "u-lyon-3",
    email: "u-lyon-3@demo.fr",
    password: "demo",
    firstName: "Romain",
    lastName: "Garnier",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-lyon-1",
    managerId: "d-lyon",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },
  // ── Team 2 (team-lyon-2) — managed by Émilie Renaud ──
  {
    id: "u-lyon-4",
    email: "u-lyon-4@demo.fr",
    password: "demo",
    firstName: "Clara",
    lastName: "Morin",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-lyon-2",
    managerId: "m-lyon-2",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },
  {
    id: "u-lyon-5",
    email: "u-lyon-5@demo.fr",
    password: "demo",
    firstName: "Hugo",
    lastName: "Petit",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-lyon-2",
    managerId: "m-lyon-2",
    createdAt: "2024-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },
];

// =============================================================================
// February 2026 Results — Lyon agency
// =============================================================================

export const mockNetworkResults: PeriodResults[] = [
  // Laurent Girard (expert directeur) — good performance, CA 28000, 2 actes
  {
    id: "r-lyon-d-feb",
    userId: "d-lyon",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 52,
      rdvEstimation: 6,
    },
    vendeurs: {
      rdvEstimation: 6,
      estimationsRealisees: 5,
      mandatsSignes: 4,
      mandats: [
        { id: "ml-d1", nomVendeur: "M. Dupuis", type: "exclusif" },
        { id: "ml-d2", nomVendeur: "Mme Charvet", type: "exclusif" },
        { id: "ml-d3", nomVendeur: "M. et Mme Roche", type: "exclusif" },
        { id: "ml-d4", nomVendeur: "SCI Bellecour", type: "simple" },
      ],
      rdvSuivi: 7,
      requalificationSimpleExclusif: 1,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 6,
      nombreVisites: 10,
      offresRecues: 3,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 28000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Mathieu Fabre (confirme) — medium performance, CA 18000, 2 actes
  {
    id: "r-lyon-1-feb",
    userId: "u-lyon-1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 38,
      rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 3,
      mandatsSignes: 3,
      mandats: [
        { id: "ml-11", nomVendeur: "M. Bouvier", type: "exclusif" },
        { id: "ml-12", nomVendeur: "Mme Fontaine", type: "simple" },
        { id: "ml-13", nomVendeur: "M. Leroy", type: "exclusif" },
      ],
      rdvSuivi: 5,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 5,
      nombreVisites: 8,
      offresRecues: 3,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 18000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-20T14:00:00Z",
  },
  // Léa Blanc (expert) — excellent performance, CA 38000, 3 actes
  {
    id: "r-lyon-2-feb",
    userId: "u-lyon-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 70,
      rdvEstimation: 8,
    },
    vendeurs: {
      rdvEstimation: 8,
      estimationsRealisees: 7,
      mandatsSignes: 6,
      mandats: [
        { id: "ml-21", nomVendeur: "M. Berthier", type: "exclusif" },
        { id: "ml-22", nomVendeur: "Mme Lacroix", type: "exclusif" },
        { id: "ml-23", nomVendeur: "M. et Mme Vidal", type: "exclusif" },
        { id: "ml-24", nomVendeur: "SCI Part-Dieu", type: "exclusif" },
        { id: "ml-25", nomVendeur: "M. Arnaud", type: "simple" },
        { id: "ml-26", nomVendeur: "Mme Collet", type: "exclusif" },
      ],
      rdvSuivi: 10,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 9,
      nombreVisites: 15,
      offresRecues: 5,
      compromisSignes: 3,
      chiffreAffairesCompromis: 45000,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 38000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T16:00:00Z",
  },
  // Romain Garnier (debutant) — struggling, CA 5000, 1 acte
  {
    id: "r-lyon-3-feb",
    userId: "u-lyon-3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 18,
      rdvEstimation: 2,
    },
    vendeurs: {
      rdvEstimation: 2,
      estimationsRealisees: 1,
      mandatsSignes: 1,
      mandats: [
        { id: "ml-31", nomVendeur: "M. Perret", type: "simple" },
      ],
      rdvSuivi: 2,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 2,
      nombreVisites: 4,
      offresRecues: 1,
      compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 5000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-18T11:00:00Z",
  },
  // Émilie Renaud (confirme manager) — decent, CA 15000, 1 acte
  {
    id: "r-lyon-m2-feb",
    userId: "m-lyon-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 30,
      rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 3,
      mandatsSignes: 2,
      mandats: [
        { id: "ml-m1", nomVendeur: "Mme Guérin", type: "exclusif" },
        { id: "ml-m2", nomVendeur: "M. Marchand", type: "simple" },
      ],
      rdvSuivi: 4,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 3,
      nombreVisites: 6,
      offresRecues: 2,
      compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 15000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-22T09:00:00Z",
  },
  // Clara Morin (confirme) — good, CA 20000, 2 actes
  {
    id: "r-lyon-4-feb",
    userId: "u-lyon-4",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 42,
      rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5,
      estimationsRealisees: 4,
      mandatsSignes: 4,
      mandats: [
        { id: "ml-41", nomVendeur: "M. Rousseau", type: "exclusif" },
        { id: "ml-42", nomVendeur: "Mme Dufour", type: "exclusif" },
        { id: "ml-43", nomVendeur: "M. Clément", type: "simple" },
        { id: "ml-44", nomVendeur: "Mme Gauthier", type: "exclusif" },
      ],
      rdvSuivi: 6,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 5,
      nombreVisites: 9,
      offresRecues: 3,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 20000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-24T15:00:00Z",
  },
  // Hugo Petit (debutant) — weak, CA 3000, 0 actes
  {
    id: "r-lyon-5-feb",
    userId: "u-lyon-5",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 14,
      rdvEstimation: 1,
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 1,
      mandatsSignes: 1,
      mandats: [
        { id: "ml-51", nomVendeur: "M. Bonnet", type: "simple" },
      ],
      rdvSuivi: 1,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 1,
      nombreVisites: 3,
      offresRecues: 0,
      compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 3000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
];

// =============================================================================
// January 2026 Results — Lyon agency
// =============================================================================

export const mockNetworkJanuaryResults: PeriodResults[] = [
  // Laurent Girard (expert directeur) — January
  {
    id: "r-lyon-d-jan",
    userId: "d-lyon",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 48,
      rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "ml-dj1", nomVendeur: "M. Tissot", type: "exclusif" },
        { id: "ml-dj2", nomVendeur: "Mme Barbier", type: "exclusif" },
        { id: "ml-dj3", nomVendeur: "M. Caron", type: "simple" },
      ],
      rdvSuivi: 6,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 5,
      nombreVisites: 9,
      offresRecues: 2,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 25000,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-28T10:00:00Z",
  },
  // Mathieu Fabre (confirme) — January
  {
    id: "r-lyon-1-jan",
    userId: "u-lyon-1",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 32,
      rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 3,
      mandatsSignes: 2,
      mandats: [
        { id: "ml-1j1", nomVendeur: "M. Mercier", type: "exclusif" },
        { id: "ml-1j2", nomVendeur: "Mme Blanc", type: "simple" },
      ],
      rdvSuivi: 4,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 4,
      nombreVisites: 7,
      offresRecues: 2,
      compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 14000,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-27T14:00:00Z",
  },
  // Léa Blanc (expert) — January
  {
    id: "r-lyon-2-jan",
    userId: "u-lyon-2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 65,
      rdvEstimation: 7,
    },
    vendeurs: {
      rdvEstimation: 7,
      estimationsRealisees: 6,
      mandatsSignes: 5,
      mandats: [
        { id: "ml-2j1", nomVendeur: "M. Pélissier", type: "exclusif" },
        { id: "ml-2j2", nomVendeur: "Mme Rivière", type: "exclusif" },
        { id: "ml-2j3", nomVendeur: "M. et Mme Faure", type: "exclusif" },
        { id: "ml-2j4", nomVendeur: "SCI Confluence", type: "simple" },
        { id: "ml-2j5", nomVendeur: "M. Delorme", type: "exclusif" },
      ],
      rdvSuivi: 9,
      requalificationSimpleExclusif: 1,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 8,
      nombreVisites: 14,
      offresRecues: 4,
      compromisSignes: 3,
      chiffreAffairesCompromis: 45000,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 35000,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-29T16:00:00Z",
  },
  // Romain Garnier (debutant) — January
  {
    id: "r-lyon-3-jan",
    userId: "u-lyon-3",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 15,
      rdvEstimation: 1,
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 1,
      mandatsSignes: 1,
      mandats: [
        { id: "ml-3j1", nomVendeur: "M. Giraud", type: "simple" },
      ],
      rdvSuivi: 1,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 2,
      nombreVisites: 3,
      offresRecues: 1,
      compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-20T11:00:00Z",
  },
  // Émilie Renaud (confirme manager) — January
  {
    id: "r-lyon-m2-jan",
    userId: "m-lyon-2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 28,
      rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 2,
      mandatsSignes: 2,
      mandats: [
        { id: "ml-mj1", nomVendeur: "M. Lemoine", type: "exclusif" },
        { id: "ml-mj2", nomVendeur: "Mme Duval", type: "simple" },
      ],
      rdvSuivi: 3,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 3,
      nombreVisites: 5,
      offresRecues: 1,
      compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 12000,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-25T09:00:00Z",
  },
  // Clara Morin (confirme) — January
  {
    id: "r-lyon-4-jan",
    userId: "u-lyon-4",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 38,
      rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "ml-4j1", nomVendeur: "M. Poncet", type: "exclusif" },
        { id: "ml-4j2", nomVendeur: "Mme Lefèvre", type: "exclusif" },
        { id: "ml-4j3", nomVendeur: "M. Blanc", type: "simple" },
      ],
      rdvSuivi: 5,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 4,
      nombreVisites: 8,
      offresRecues: 2,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 18000,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-28T15:00:00Z",
  },
  // Hugo Petit (debutant) — January
  {
    id: "r-lyon-5-jan",
    userId: "u-lyon-5",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 10,
      rdvEstimation: 1,
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 0,
      mandatsSignes: 0,
      mandats: [],
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 1,
      nombreVisites: 2,
      offresRecues: 0,
      compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
    },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-18T10:00:00Z",
  },
];

// =============================================================================
// Institution
// =============================================================================

export const mockNetworkInstitutions = [
  { id: "org-demo-2", name: "NXT Immobilier Lyon", inviteCode: "ORG-LYON" },
];

// =============================================================================
// Network
// =============================================================================

export interface Network {
  id: string;
  name: string;
  institutionIds: string[];
}

export const mockNetworks: Network[] = [
  { id: "network-demo", name: "Groupe NXT Immobilier", institutionIds: ["org-demo", "org-demo-2"] },
];

// =============================================================================
// Réseau admin user
// =============================================================================

export const mockReseauUser: User = {
  id: "reseau-1",
  email: "reseau@demo.fr",
  password: "demo",
  firstName: "Philippe",
  lastName: "Moreau",
  mainRole: "reseau",
  role: "reseau",
  availableRoles: ["reseau"],
  category: "expert",
  teamId: "",
  createdAt: "2024-01-01T00:00:00Z",
  onboardingStatus: "DONE",
  profileType: "INSTITUTION",
  institutionId: "",
};
