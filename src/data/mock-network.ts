import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import { makeResult } from "@/data/_mock-result-helpers";

// =============================================================================
// Vue Réseau v2.0 — Phase 1 (Task 1)
// =============================================================================
//
// 4 agences mockées avec performances contrastées pour le tableau de bord
// réseau v2.0 :
//
//   PARIS     org-demo    perf 1.05  surperformer (mocks dans mock-users.ts +
//                                     mock-results.ts — non répétés ici)
//   LYON      org-demo-2  perf 0.88  stable
//   MARSEILLE org-demo-3  perf 0.72  sous-performer
//   TOULOUSE  org-demo-4  perf mixte (équipe A 1.15 / équipe B 0.75)
//
// Trends 3 mois : janv ×0.95, fév ×1.00, mars ×1.05.
// Multiplicateur final = perf agence × multiplicateur mois.
//
// Note historique : les valeurs Lyon Janv/Févr existaient avant 2026-04-29 et
// sont conservées telles quelles (calibrées ad hoc). Mars Lyon ajouté via
// makeResult. Marseille et Toulouse intégralement générés via makeResult.
//
// TODO(provisoire): le mock chiffreAffairesCompromis = compromisSignes ×
// 15 000€ représente la valeur des biens en compromis. Le proxy runtime du
// hook useNetworkProductionChain pour calculer l'objectif "CA Compromis"
// utilise une formule différente (compromis × 7 500€ = honoraires moyens).
// Ne pas confondre les deux. Voir docs/TECH_DEBT.md.

// =============================================================================
// Lyon (org-demo-2) — perf 0.88 (stable)
// =============================================================================
//
// Mix conseillers cible : 2 Junior + 2 Confirmé + 2 Expert.
// Recatégorisation : Clara Morin promue confirme → expert (Vue Réseau v2.0 Q2).
// Ajout : Aurélien Chambon (confirme, team-lyon-2) — 6ème conseiller.
// Émilie Renaud reste manager dédié de team-lyon-2 (déjà le cas).

const LYON_PERF = 0.88;
const LYON_MAR_FACTOR = LYON_PERF * 1.05; // ≈ 0.924

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
  // Clara Morin : promue confirme → expert (Vue Réseau v2.0 Q2 — recatégorisation pour mix 2J+2C+2E).
  {
    id: "u-lyon-4",
    email: "u-lyon-4@demo.fr",
    password: "demo",
    firstName: "Clara",
    lastName: "Morin",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "expert",
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
  // 6ème conseiller Lyon (NEW — Vue Réseau v2.0 Phase 1)
  {
    id: "u-lyon-6",
    email: "aurelien.chambon@nxt-lyon.fr",
    password: "demo",
    firstName: "Aurélien",
    lastName: "Chambon",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-lyon-2",
    managerId: "m-lyon-2",
    createdAt: "2025-09-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-2",
  },

  // ===========================================================================
  // Marseille (org-demo-3) — perf 0.72 (sous-performer)
  // ===========================================================================
  // 1 directeur (Karim Benali, teamId="" — purement directeur d'agence)
  // 1 manager (Sophie Martinez, team-marseille-1)
  // 5 conseillers (4 Junior + 1 Confirmé)
  {
    id: "d-marseille",
    email: "karim.benali@nxt-marseille.fr",
    password: "demo",
    firstName: "Karim",
    lastName: "Benali",
    mainRole: "directeur",
    role: "directeur",
    availableRoles: ["directeur", "manager", "conseiller"],
    category: "expert",
    teamId: "",
    createdAt: "2024-04-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "INSTITUTION",
    institutionId: "org-demo-3",
  },
  {
    id: "m-marseille-1",
    email: "sophie.martinez@nxt-marseille.fr",
    password: "demo",
    firstName: "Sophie",
    lastName: "Martinez",
    mainRole: "manager",
    role: "manager",
    availableRoles: ["manager", "conseiller"],
    category: "confirme",
    teamId: "team-marseille-1",
    managerId: "d-marseille",
    createdAt: "2024-04-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "MANAGER",
    institutionId: "org-demo-3",
  },
  {
    id: "u-marseille-1",
    email: "theo.roussel@nxt-marseille.fr",
    password: "demo",
    firstName: "Théo",
    lastName: "Roussel",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-marseille-1",
    managerId: "m-marseille-1",
    createdAt: "2025-01-10T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-3",
  },
  {
    id: "u-marseille-2",
    email: "marion.bertrand@nxt-marseille.fr",
    password: "demo",
    firstName: "Marion",
    lastName: "Bertrand",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-marseille-1",
    managerId: "m-marseille-1",
    createdAt: "2025-02-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-3",
  },
  {
    id: "u-marseille-3",
    email: "hugo.petit@nxt-marseille.fr",
    password: "demo",
    firstName: "Hugo",
    lastName: "Petit",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-marseille-1",
    managerId: "m-marseille-1",
    createdAt: "2025-03-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-3",
  },
  {
    id: "u-marseille-4",
    email: "lea.garcia@nxt-marseille.fr",
    password: "demo",
    firstName: "Léa",
    lastName: "Garcia",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-marseille-1",
    managerId: "m-marseille-1",
    createdAt: "2025-04-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-3",
  },
  {
    id: "u-marseille-5",
    email: "maxime.dubois@nxt-marseille.fr",
    password: "demo",
    firstName: "Maxime",
    lastName: "Dubois",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-marseille-1",
    managerId: "m-marseille-1",
    createdAt: "2024-08-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-3",
  },

  // ===========================================================================
  // Toulouse (org-demo-4) — perf mixte (équipe A 1.15 / équipe B 0.75)
  // ===========================================================================
  // 1 directeur (Camille Roux, teamId="" — purement directeur d'agence)
  // 2 managers : Antoine Lefèvre (équipe A surperf, expert) · Charlotte Vidal (équipe B sous-perf, confirme)
  // 6 conseillers : équipe A 2E+1C surperf · équipe B 2J+1C sous-perf
  {
    id: "d-toulouse",
    email: "camille.roux@nxt-toulouse.fr",
    password: "demo",
    firstName: "Camille",
    lastName: "Roux",
    mainRole: "directeur",
    role: "directeur",
    availableRoles: ["directeur", "manager", "conseiller"],
    category: "expert",
    teamId: "",
    createdAt: "2024-05-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "INSTITUTION",
    institutionId: "org-demo-4",
  },
  {
    id: "m-toulouse-a",
    email: "antoine.lefevre@nxt-toulouse.fr",
    password: "demo",
    firstName: "Antoine",
    lastName: "Lefèvre",
    mainRole: "manager",
    role: "manager",
    availableRoles: ["manager", "conseiller"],
    category: "expert",
    teamId: "team-toulouse-a",
    managerId: "d-toulouse",
    createdAt: "2024-05-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "MANAGER",
    institutionId: "org-demo-4",
  },
  {
    id: "m-toulouse-b",
    email: "charlotte.vidal@nxt-toulouse.fr",
    password: "demo",
    firstName: "Charlotte",
    lastName: "Vidal",
    mainRole: "manager",
    role: "manager",
    availableRoles: ["manager", "conseiller"],
    category: "confirme",
    teamId: "team-toulouse-b",
    managerId: "d-toulouse",
    createdAt: "2024-05-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "MANAGER",
    institutionId: "org-demo-4",
  },
  // ── Équipe A (surperf 1.15) ──
  {
    id: "u-toulouse-a1",
    email: "julien.mercier@nxt-toulouse.fr",
    password: "demo",
    firstName: "Julien",
    lastName: "Mercier",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "expert",
    teamId: "team-toulouse-a",
    managerId: "m-toulouse-a",
    createdAt: "2024-06-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
  {
    id: "u-toulouse-a2",
    email: "sarah.cohen@nxt-toulouse.fr",
    password: "demo",
    firstName: "Sarah",
    lastName: "Cohen",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "expert",
    teamId: "team-toulouse-a",
    managerId: "m-toulouse-a",
    createdAt: "2024-06-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
  {
    id: "u-toulouse-a3",
    email: "vincent.lambert@nxt-toulouse.fr",
    password: "demo",
    firstName: "Vincent",
    lastName: "Lambert",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-toulouse-a",
    managerId: "m-toulouse-a",
    createdAt: "2024-07-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
  // ── Équipe B (sous-perf 0.75) ──
  {
    id: "u-toulouse-b1",
    email: "elise.moreau@nxt-toulouse.fr",
    password: "demo",
    firstName: "Élise",
    lastName: "Moreau",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-toulouse-b",
    managerId: "m-toulouse-b",
    createdAt: "2025-02-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
  {
    id: "u-toulouse-b2",
    email: "florian.petit@nxt-toulouse.fr",
    password: "demo",
    firstName: "Florian",
    lastName: "Petit",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "debutant",
    teamId: "team-toulouse-b",
    managerId: "m-toulouse-b",
    createdAt: "2025-03-15T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
  {
    id: "u-toulouse-b3",
    email: "hugo.bernard@nxt-toulouse.fr",
    password: "demo",
    firstName: "Hugo",
    lastName: "Bernard",
    mainRole: "conseiller",
    role: "conseiller",
    availableRoles: ["conseiller"],
    category: "confirme",
    teamId: "team-toulouse-b",
    managerId: "m-toulouse-b",
    createdAt: "2024-09-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "AGENT",
    institutionId: "org-demo-4",
  },
];

// =============================================================================
// February 2026 Results — Lyon (existing, ad-hoc calibrated, kept as-is)
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
        { id: "ml-d1", type: "exclusif" },
        { id: "ml-d2", type: "exclusif" },
        { id: "ml-d3", type: "exclusif" },
        { id: "ml-d4", type: "simple" },
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
        { id: "ml-11", type: "exclusif" },
        { id: "ml-12", type: "simple" },
        { id: "ml-13", type: "exclusif" },
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
        { id: "ml-21", type: "exclusif" },
        { id: "ml-22", type: "exclusif" },
        { id: "ml-23", type: "exclusif" },
        { id: "ml-24", type: "exclusif" },
        { id: "ml-25", type: "simple" },
        { id: "ml-26", type: "exclusif" },
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
        { id: "ml-31", type: "simple" },
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
        { id: "ml-m1", type: "exclusif" },
        { id: "ml-m2", type: "simple" },
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
  // Clara Morin (PROMUE expert) — good, CA 20000, 2 actes (jan/fév kept as confirme-calibrated)
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
        { id: "ml-41", type: "exclusif" },
        { id: "ml-42", type: "exclusif" },
        { id: "ml-43", type: "simple" },
        { id: "ml-44", type: "exclusif" },
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
        { id: "ml-51", type: "simple" },
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
  // ── NEW (Vue Réseau v2.0 Phase 1 — Aurélien Chambon, february) ──
  makeResult({
    id: "r-lyon-6-feb",
    userId: "u-lyon-6",
    monthKey: "02",
    category: "confirme",
    factor: LYON_PERF, // ×1.0 (trend cible)
    mandatPrefix: "ml-6",
  }),

  // ===========================================================================
  // Marseille — February 2026 (perf 0.72)
  // ===========================================================================
  makeResult({ id: "r-mars-d-feb",  userId: "d-marseille",  monthKey: "02", category: "expert",   factor: 0.72, mandatPrefix: "mm-d" }),
  makeResult({ id: "r-mars-m1-feb", userId: "m-marseille-1", monthKey: "02", category: "confirme", factor: 0.72, mandatPrefix: "mm-m1" }),
  makeResult({ id: "r-mars-1-feb",  userId: "u-marseille-1", monthKey: "02", category: "debutant", factor: 0.72, mandatPrefix: "mm-1" }),
  makeResult({ id: "r-mars-2-feb",  userId: "u-marseille-2", monthKey: "02", category: "debutant", factor: 0.72, mandatPrefix: "mm-2" }),
  makeResult({ id: "r-mars-3-feb",  userId: "u-marseille-3", monthKey: "02", category: "debutant", factor: 0.72, mandatPrefix: "mm-3" }),
  makeResult({ id: "r-mars-4-feb",  userId: "u-marseille-4", monthKey: "02", category: "debutant", factor: 0.72, mandatPrefix: "mm-4" }),
  makeResult({ id: "r-mars-5-feb",  userId: "u-marseille-5", monthKey: "02", category: "confirme", factor: 0.72, mandatPrefix: "mm-5" }),

  // ===========================================================================
  // Toulouse — February 2026 (équipe A 1.15 / équipe B 0.75)
  // ===========================================================================
  makeResult({ id: "r-toul-d-feb",  userId: "d-toulouse",   monthKey: "02", category: "expert",   factor: 0.95, mandatPrefix: "mt-d" }),
  makeResult({ id: "r-toul-ma-feb", userId: "m-toulouse-a", monthKey: "02", category: "expert",   factor: 1.15, mandatPrefix: "mt-ma" }),
  makeResult({ id: "r-toul-mb-feb", userId: "m-toulouse-b", monthKey: "02", category: "confirme", factor: 0.75, mandatPrefix: "mt-mb" }),
  makeResult({ id: "r-toul-a1-feb", userId: "u-toulouse-a1", monthKey: "02", category: "expert",   factor: 1.15, mandatPrefix: "mt-a1" }),
  makeResult({ id: "r-toul-a2-feb", userId: "u-toulouse-a2", monthKey: "02", category: "expert",   factor: 1.15, mandatPrefix: "mt-a2" }),
  makeResult({ id: "r-toul-a3-feb", userId: "u-toulouse-a3", monthKey: "02", category: "confirme", factor: 1.15, mandatPrefix: "mt-a3" }),
  makeResult({ id: "r-toul-b1-feb", userId: "u-toulouse-b1", monthKey: "02", category: "debutant", factor: 0.75, mandatPrefix: "mt-b1" }),
  makeResult({ id: "r-toul-b2-feb", userId: "u-toulouse-b2", monthKey: "02", category: "debutant", factor: 0.75, mandatPrefix: "mt-b2" }),
  makeResult({ id: "r-toul-b3-feb", userId: "u-toulouse-b3", monthKey: "02", category: "confirme", factor: 0.75, mandatPrefix: "mt-b3" }),
];

// =============================================================================
// January 2026 Results — Lyon (existing, ad-hoc calibrated, kept as-is)
// + Marseille / Toulouse generated (Phase 1)
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
        { id: "ml-dj1", type: "exclusif" },
        { id: "ml-dj2", type: "exclusif" },
        { id: "ml-dj3", type: "simple" },
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
        { id: "ml-1j1", type: "exclusif" },
        { id: "ml-1j2", type: "simple" },
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
        { id: "ml-2j1", type: "exclusif" },
        { id: "ml-2j2", type: "exclusif" },
        { id: "ml-2j3", type: "exclusif" },
        { id: "ml-2j4", type: "simple" },
        { id: "ml-2j5", type: "exclusif" },
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
        { id: "ml-3j1", type: "simple" },
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
        { id: "ml-mj1", type: "exclusif" },
        { id: "ml-mj2", type: "simple" },
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
  // Clara Morin (PROMUE expert — jan/fév kept confirme-calibrated) — January
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
        { id: "ml-4j1", type: "exclusif" },
        { id: "ml-4j2", type: "exclusif" },
        { id: "ml-4j3", type: "simple" },
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
  // ── NEW (Aurélien Chambon, January) ──
  makeResult({
    id: "r-lyon-6-jan",
    userId: "u-lyon-6",
    monthKey: "01",
    category: "confirme",
    factor: LYON_PERF * 0.95,
    mandatPrefix: "ml-6j",
  }),

  // ===========================================================================
  // Marseille — January 2026 (perf 0.72 × 0.95 = 0.684)
  // ===========================================================================
  makeResult({ id: "r-mars-d-jan",  userId: "d-marseille",  monthKey: "01", category: "expert",   factor: 0.72 * 0.95, mandatPrefix: "mm-dj" }),
  makeResult({ id: "r-mars-m1-jan", userId: "m-marseille-1", monthKey: "01", category: "confirme", factor: 0.72 * 0.95, mandatPrefix: "mm-m1j" }),
  makeResult({ id: "r-mars-1-jan",  userId: "u-marseille-1", monthKey: "01", category: "debutant", factor: 0.72 * 0.95, mandatPrefix: "mm-1j" }),
  makeResult({ id: "r-mars-2-jan",  userId: "u-marseille-2", monthKey: "01", category: "debutant", factor: 0.72 * 0.95, mandatPrefix: "mm-2j" }),
  makeResult({ id: "r-mars-3-jan",  userId: "u-marseille-3", monthKey: "01", category: "debutant", factor: 0.72 * 0.95, mandatPrefix: "mm-3j" }),
  makeResult({ id: "r-mars-4-jan",  userId: "u-marseille-4", monthKey: "01", category: "debutant", factor: 0.72 * 0.95, mandatPrefix: "mm-4j" }),
  makeResult({ id: "r-mars-5-jan",  userId: "u-marseille-5", monthKey: "01", category: "confirme", factor: 0.72 * 0.95, mandatPrefix: "mm-5j" }),

  // ===========================================================================
  // Toulouse — January 2026
  // ===========================================================================
  makeResult({ id: "r-toul-d-jan",  userId: "d-toulouse",   monthKey: "01", category: "expert",   factor: 0.95 * 0.95, mandatPrefix: "mt-dj" }),
  makeResult({ id: "r-toul-ma-jan", userId: "m-toulouse-a", monthKey: "01", category: "expert",   factor: 1.15 * 0.95, mandatPrefix: "mt-maj" }),
  makeResult({ id: "r-toul-mb-jan", userId: "m-toulouse-b", monthKey: "01", category: "confirme", factor: 0.75 * 0.95, mandatPrefix: "mt-mbj" }),
  makeResult({ id: "r-toul-a1-jan", userId: "u-toulouse-a1", monthKey: "01", category: "expert",   factor: 1.15 * 0.95, mandatPrefix: "mt-a1j" }),
  makeResult({ id: "r-toul-a2-jan", userId: "u-toulouse-a2", monthKey: "01", category: "expert",   factor: 1.15 * 0.95, mandatPrefix: "mt-a2j" }),
  makeResult({ id: "r-toul-a3-jan", userId: "u-toulouse-a3", monthKey: "01", category: "confirme", factor: 1.15 * 0.95, mandatPrefix: "mt-a3j" }),
  makeResult({ id: "r-toul-b1-jan", userId: "u-toulouse-b1", monthKey: "01", category: "debutant", factor: 0.75 * 0.95, mandatPrefix: "mt-b1j" }),
  makeResult({ id: "r-toul-b2-jan", userId: "u-toulouse-b2", monthKey: "01", category: "debutant", factor: 0.75 * 0.95, mandatPrefix: "mt-b2j" }),
  makeResult({ id: "r-toul-b3-jan", userId: "u-toulouse-b3", monthKey: "01", category: "confirme", factor: 0.75 * 0.95, mandatPrefix: "mt-b3j" }),
];

// =============================================================================
// March 2026 Results — Lyon + Marseille + Toulouse (Vue Réseau v2.0 Phase 1)
// =============================================================================

export const mockNetworkMarchResults: PeriodResults[] = [
  // ── Lyon — March 2026 (perf 0.88 × 1.05 = 0.924) ──
  makeResult({ id: "r-lyon-d-mar",  userId: "d-lyon",   monthKey: "03", category: "expert",   factor: LYON_MAR_FACTOR, mandatPrefix: "ml-dm" }),
  makeResult({ id: "r-lyon-1-mar",  userId: "u-lyon-1", monthKey: "03", category: "confirme", factor: LYON_MAR_FACTOR, mandatPrefix: "ml-1m" }),
  makeResult({ id: "r-lyon-2-mar",  userId: "u-lyon-2", monthKey: "03", category: "expert",   factor: LYON_MAR_FACTOR, mandatPrefix: "ml-2m" }),
  makeResult({ id: "r-lyon-3-mar",  userId: "u-lyon-3", monthKey: "03", category: "debutant", factor: LYON_MAR_FACTOR, mandatPrefix: "ml-3m" }),
  makeResult({ id: "r-lyon-m2-mar", userId: "m-lyon-2", monthKey: "03", category: "confirme", factor: LYON_MAR_FACTOR, mandatPrefix: "ml-m2m" }),
  // Clara Morin (now expert) — calibrée expert pour mars (cohérent avec sa nouvelle catégorie)
  makeResult({ id: "r-lyon-4-mar",  userId: "u-lyon-4", monthKey: "03", category: "expert",   factor: LYON_MAR_FACTOR, mandatPrefix: "ml-4m" }),
  makeResult({ id: "r-lyon-5-mar",  userId: "u-lyon-5", monthKey: "03", category: "debutant", factor: LYON_MAR_FACTOR, mandatPrefix: "ml-5m" }),
  makeResult({ id: "r-lyon-6-mar",  userId: "u-lyon-6", monthKey: "03", category: "confirme", factor: LYON_MAR_FACTOR, mandatPrefix: "ml-6m" }),

  // ── Marseille — March 2026 (perf 0.72 × 1.05 = 0.756) ──
  makeResult({ id: "r-mars-d-mar",  userId: "d-marseille",   monthKey: "03", category: "expert",   factor: 0.72 * 1.05, mandatPrefix: "mm-dm" }),
  makeResult({ id: "r-mars-m1-mar", userId: "m-marseille-1", monthKey: "03", category: "confirme", factor: 0.72 * 1.05, mandatPrefix: "mm-m1m" }),
  makeResult({ id: "r-mars-1-mar",  userId: "u-marseille-1", monthKey: "03", category: "debutant", factor: 0.72 * 1.05, mandatPrefix: "mm-1m" }),
  makeResult({ id: "r-mars-2-mar",  userId: "u-marseille-2", monthKey: "03", category: "debutant", factor: 0.72 * 1.05, mandatPrefix: "mm-2m" }),
  makeResult({ id: "r-mars-3-mar",  userId: "u-marseille-3", monthKey: "03", category: "debutant", factor: 0.72 * 1.05, mandatPrefix: "mm-3m" }),
  makeResult({ id: "r-mars-4-mar",  userId: "u-marseille-4", monthKey: "03", category: "debutant", factor: 0.72 * 1.05, mandatPrefix: "mm-4m" }),
  makeResult({ id: "r-mars-5-mar",  userId: "u-marseille-5", monthKey: "03", category: "confirme", factor: 0.72 * 1.05, mandatPrefix: "mm-5m" }),

  // ── Toulouse — March 2026 (équipe A 1.2075, équipe B 0.7875, dir 0.9975) ──
  makeResult({ id: "r-toul-d-mar",  userId: "d-toulouse",    monthKey: "03", category: "expert",   factor: 0.95 * 1.05, mandatPrefix: "mt-dm" }),
  makeResult({ id: "r-toul-ma-mar", userId: "m-toulouse-a",  monthKey: "03", category: "expert",   factor: 1.15 * 1.05, mandatPrefix: "mt-mam" }),
  makeResult({ id: "r-toul-mb-mar", userId: "m-toulouse-b",  monthKey: "03", category: "confirme", factor: 0.75 * 1.05, mandatPrefix: "mt-mbm" }),
  makeResult({ id: "r-toul-a1-mar", userId: "u-toulouse-a1", monthKey: "03", category: "expert",   factor: 1.15 * 1.05, mandatPrefix: "mt-a1m" }),
  makeResult({ id: "r-toul-a2-mar", userId: "u-toulouse-a2", monthKey: "03", category: "expert",   factor: 1.15 * 1.05, mandatPrefix: "mt-a2m" }),
  makeResult({ id: "r-toul-a3-mar", userId: "u-toulouse-a3", monthKey: "03", category: "confirme", factor: 1.15 * 1.05, mandatPrefix: "mt-a3m" }),
  makeResult({ id: "r-toul-b1-mar", userId: "u-toulouse-b1", monthKey: "03", category: "debutant", factor: 0.75 * 1.05, mandatPrefix: "mt-b1m" }),
  makeResult({ id: "r-toul-b2-mar", userId: "u-toulouse-b2", monthKey: "03", category: "debutant", factor: 0.75 * 1.05, mandatPrefix: "mt-b2m" }),
  makeResult({ id: "r-toul-b3-mar", userId: "u-toulouse-b3", monthKey: "03", category: "confirme", factor: 0.75 * 1.05, mandatPrefix: "mt-b3m" }),
];

// =============================================================================
// Institutions
// =============================================================================

export const mockNetworkInstitutions = [
  { id: "org-demo-2", name: "NXT Immobilier Lyon",      inviteCode: "ORG-LYON" },
  { id: "org-demo-3", name: "NXT Immobilier Marseille", inviteCode: "ORG-MARSEILLE" },
  { id: "org-demo-4", name: "NXT Immobilier Toulouse",  inviteCode: "ORG-TOULOUSE" },
];

// =============================================================================
// Network — 4 agences (org-demo Paris est dans mockUsers, les 3 autres ici)
// =============================================================================

export interface Network {
  id: string;
  name: string;
  institutionIds: string[];
}

export const mockNetworks: Network[] = [
  {
    id: "network-demo",
    name: "Groupe NXT Immobilier",
    institutionIds: ["org-demo", "org-demo-2", "org-demo-3", "org-demo-4"],
  },
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
