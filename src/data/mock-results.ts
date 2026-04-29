import type { PeriodResults } from "@/types/results";
import { makeResult } from "@/data/_mock-result-helpers";

// TODO(provisoire): placeholder dev, valeur à calibrer — CA compromis mock =
// compromisSignes × 15 000€. Les valeurs `chiffreAffairesCompromis` de ce
// fichier sont des placeholders dérivés de cette règle, pas des valeurs
// issues du CRM. À remplacer par des données réelles ou une règle calibrée
// quand le backend sera branché. Voir docs/TECH_DEBT.md.

// Paris (org-demo) perf factor : 1.05 (surperf moyenne)
// Trends 3 mois : janv ×0.95, fév ×1.00, mars ×1.05.
// Janvier/Février Paris déjà mockés ci-dessous (calibrés ad hoc avant 2026-04-29) ;
// Mars Paris ajouté en bas de fichier via le helper makeResult (Task 1 réseau v2.0).
const PARIS_PERF = 1.05;
const PARIS_MAR_FACTOR = PARIS_PERF * 1.05; // ≈ 1.1025

export const mockResults: PeriodResults[] = [
  // Manager (Jean-Guy Dupont - expert, aussi producteur)
  {
    id: "r-manager",
    userId: "m-demo",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 55,
      rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5,
      estimationsRealisees: 5,
      mandatsSignes: 4,
      mandats: [
        { id: "mm1", type: "exclusif" },
        { id: "mm2", type: "exclusif" },
        { id: "mm3", type: "exclusif" },
        { id: "mm4", type: "simple" },
      ],
      rdvSuivi: 8,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 7,
      nombreVisites: 12,
      offresRecues: 3,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 32000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // =====================================================================
  // AGENT 3 — Catherine Durand (expert) — EN RÉUSSITE
  // contacts/rdv=9.3 (seuil 10), estim/mandat=1.4 (seuil 1.5), exclu=80% (seuil 70%)
  // visites/offre=4 (seuil 8), offres/compromis=1.33 (seuil 1.5), CA=42k
  // =====================================================================
  {
    id: "r3",
    userId: "u-demo-3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 65,
      rdvEstimation: 7,
    },
    vendeurs: {
      rdvEstimation: 7,
      estimationsRealisees: 7,
      mandatsSignes: 5,
      mandats: [
        { id: "m19", type: "exclusif" },
        { id: "m20", type: "exclusif" },
        { id: "m21", type: "exclusif" },
        { id: "m22", type: "exclusif" },
        { id: "m23", type: "simple" },
      ],
      rdvSuivi: 10,
      requalificationSimpleExclusif: 2,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 8,
      nombreVisites: 16,
      offresRecues: 4,
      compromisSignes: 3,
      chiffreAffairesCompromis: 45000,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 42000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-26T10:00:00Z",
  },
  // =====================================================================
  // AGENT 2 — Bob Bernard (confirmé) — EN RÉUSSITE
  // contacts/rdv=10.4 (seuil 15), estim/mandat=1.25 (seuil 2), exclu=75% (seuil 50%)
  // visites/offre=3.5 (seuil 10), offres/compromis=1.75 (seuil 2), CA=28k
  // =====================================================================
  {
    id: "r2",
    userId: "u-demo-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 52,
      rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5,
      estimationsRealisees: 5,
      mandatsSignes: 4,
      mandats: [
        { id: "m3", type: "exclusif" },
        { id: "m4", type: "exclusif" },
        { id: "m5", type: "exclusif" },
        { id: "m6", type: "simple" },
      ],
      rdvSuivi: 8,
      requalificationSimpleExclusif: 2,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 7,
      nombreVisites: 14,
      offresRecues: 4,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 28000,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
  // =====================================================================
  // AGENT 1 — Alice Martin (confirmé) — MOYEN
  // contacts/rdv=16.7 (seuil 15 → warning), estim/mandat=1.5 (seuil 2 → ok)
  // exclu=50% (seuil 50% → ok pile), visites/offre=12 (seuil 10 → warning)
  // offres/compromis=2 (seuil 2 → ok), CA=8.5k
  // =====================================================================
  {
    id: "r1",
    userId: "u-demo-1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 50,
      rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 3,
      mandatsSignes: 2,
      mandats: [
        { id: "m1", type: "exclusif" },
        { id: "m2", type: "simple" },
      ],
      rdvSuivi: 5,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 4,
      nombreVisites: 12,
      offresRecues: 2,
      compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 8500,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // ── Team 2 results ──
  // Sophie Lemaire (manager team-beta)
  {
    id: "r-m2",
    userId: "m-demo-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 45,
      rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "ms1", type: "exclusif" },
        { id: "ms2", type: "exclusif" },
        { id: "ms3", type: "simple" },
      ],
      rdvSuivi: 6,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 5,
      nombreVisites: 10,
      offresRecues: 3,
      compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 18000 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
  // Lucas Morel (team-beta, confirmé)
  {
    id: "r-b1",
    userId: "u-demo-b1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 40, rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 2,
      mandats: [{ id: "mb1", type: "exclusif" }, { id: "mb2", type: "simple" }],
      rdvSuivi: 4, requalificationSimpleExclusif: 0, baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 3, nombreVisites: 8, offresRecues: 2, compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 12000 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-24T10:00:00Z",
  },
  // Marine Roche (team-beta, expert)
  {
    id: "r-b2",
    userId: "u-demo-b2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 60, rdvEstimation: 7,
    },
    vendeurs: {
      rdvEstimation: 7, estimationsRealisees: 6, mandatsSignes: 5,
      mandats: [
        { id: "mb3", type: "exclusif" },
        { id: "mb4", type: "exclusif" },
        { id: "mb5", type: "exclusif" },
        { id: "mb6", type: "exclusif" },
        { id: "mb7", type: "simple" },
      ],
      rdvSuivi: 10, requalificationSimpleExclusif: 2, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 8, nombreVisites: 15, offresRecues: 5, compromisSignes: 4,
      chiffreAffairesCompromis: 60000,
    },
    ventes: { actesSignes: 3, chiffreAffaires: 52000 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-27T10:00:00Z",
  },
  // Théo Vasseur (team-beta, junior) — EN DIFFICULTÉ
  // contacts/rdv=11.7 (seuil 20 → ok junior), estim/mandat=3 (seuil 3 → pile)
  // exclu=0% (seuil 30% → danger), visites/offre=6 (seuil 12 → ok)
  // offres/compromis=∞ (0 compromis → danger), CA=0
  {
    id: "r-b3",
    userId: "u-demo-b3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 35, rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 1,
      mandats: [{ id: "mt1", type: "simple" }],
      rdvSuivi: 2, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 2, nombreVisites: 6,
      offresRecues: 1, compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
  },
  // ── Team 3 results ──
  // Marc Fontaine (manager team-gamma)
  {
    id: "r-m3",
    userId: "m-demo-3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 50, rdvEstimation: 6,
    },
    vendeurs: {
      rdvEstimation: 6, estimationsRealisees: 5, mandatsSignes: 4,
      mandats: [
        { id: "mf1", type: "exclusif" },
        { id: "mf2", type: "exclusif" },
        { id: "mf3", type: "exclusif" },
        { id: "mf4", type: "simple" },
      ],
      rdvSuivi: 7, requalificationSimpleExclusif: 1, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 6, nombreVisites: 11, offresRecues: 4, compromisSignes: 3,
      chiffreAffairesCompromis: 45000,
    },
    ventes: { actesSignes: 2, chiffreAffaires: 28000 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-26T10:00:00Z",
  },
  // Julie Carpentier (team-gamma, confirmé)
  {
    id: "r-g1",
    userId: "u-demo-g1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 48, rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4, estimationsRealisees: 4, mandatsSignes: 3,
      mandats: [
        { id: "mg1", type: "exclusif" },
        { id: "mg2", type: "exclusif" },
        { id: "mg3", type: "simple" },
      ],
      rdvSuivi: 5, requalificationSimpleExclusif: 1, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 5, nombreVisites: 12, offresRecues: 3, compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 2, chiffreAffaires: 22000 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
  // Nicolas Mercier (team-gamma, junior) — MOYEN/FAIBLE
  // contacts/rdv=6 (seuil 20 → ok junior), estim/mandat=2.5 (seuil 3 → ok)
  // exclu=50% (seuil 30% → ok), visites/offre=5 (seuil 12 → ok)
  // offres/compromis=∞ (0 compromis → danger), CA=0
  {
    id: "r-g2",
    userId: "u-demo-g2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 30, rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5, estimationsRealisees: 5, mandatsSignes: 2,
      mandats: [
        { id: "mg4", type: "exclusif" },
        { id: "mg5", type: "simple" },
      ],
      rdvSuivi: 3, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 2, nombreVisites: 5,
      offresRecues: 1, compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-18T10:00:00Z",
  },
];

// ── January 2026 results (for YTD aggregation) ──
export const mockJanuaryResults: PeriodResults[] = [
  // Manager (Jean-Guy Dupont)
  {
    id: "r-manager-jan",
    userId: "m-demo",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 45, rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4, estimationsRealisees: 4, mandatsSignes: 3,
      mandats: [
        { id: "mmj1", type: "exclusif" },
        { id: "mmj2", type: "exclusif" },
        { id: "mmj3", type: "simple" },
      ],
      rdvSuivi: 6, requalificationSimpleExclusif: 1, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 6, nombreVisites: 10, offresRecues: 3, compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 22000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Catherine Durand (expert)
  {
    id: "r3-jan",
    userId: "u-demo-3",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 55, rdvEstimation: 6,
    },
    vendeurs: {
      rdvEstimation: 6, estimationsRealisees: 6, mandatsSignes: 4,
      mandats: [
        { id: "m19j", type: "exclusif" },
        { id: "m20j", type: "exclusif" },
        { id: "m21j", type: "exclusif" },
        { id: "m22j", type: "simple" },
      ],
      rdvSuivi: 8, requalificationSimpleExclusif: 1, baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 7, nombreVisites: 14, offresRecues: 3, compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 2, chiffreAffaires: 35000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Bob Bernard (confirmé)
  {
    id: "r2-jan",
    userId: "u-demo-2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 42, rdvEstimation: 4,
    },
    vendeurs: {
      rdvEstimation: 4, estimationsRealisees: 4, mandatsSignes: 3,
      mandats: [
        { id: "m3j", type: "exclusif" },
        { id: "m4j", type: "exclusif" },
        { id: "m5j", type: "simple" },
      ],
      rdvSuivi: 6, requalificationSimpleExclusif: 1, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 5, nombreVisites: 11, offresRecues: 3, compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 18000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Alice Martin (confirmé)
  {
    id: "r1-jan",
    userId: "u-demo-1",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 40, rdvEstimation: 2,
    },
    vendeurs: {
      rdvEstimation: 2, estimationsRealisees: 2, mandatsSignes: 1,
      mandats: [
        { id: "m1j", type: "exclusif" },
      ],
      rdvSuivi: 3, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 3, nombreVisites: 8, offresRecues: 1, compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 9800 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Sophie Lemaire (manager team-beta)
  {
    id: "r-m2-jan",
    userId: "m-demo-2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 38, rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 2,
      mandats: [
        { id: "ms1j", type: "exclusif" },
        { id: "ms2j", type: "simple" },
      ],
      rdvSuivi: 5, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 4, nombreVisites: 8, offresRecues: 2, compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 14000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Lucas Morel (team-beta, confirmé)
  {
    id: "r-b1-jan",
    userId: "u-demo-b1",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 32, rdvEstimation: 2,
    },
    vendeurs: {
      rdvEstimation: 2, estimationsRealisees: 2, mandatsSignes: 1,
      mandats: [{ id: "mb1j", type: "exclusif" }],
      rdvSuivi: 3, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 2, nombreVisites: 6, offresRecues: 1, compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Marine Roche (team-beta, expert)
  {
    id: "r-b2-jan",
    userId: "u-demo-b2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 52, rdvEstimation: 6,
    },
    vendeurs: {
      rdvEstimation: 6, estimationsRealisees: 5, mandatsSignes: 4,
      mandats: [
        { id: "mb3j", type: "exclusif" },
        { id: "mb4j", type: "exclusif" },
        { id: "mb5j", type: "exclusif" },
        { id: "mb6j", type: "simple" },
      ],
      rdvSuivi: 8, requalificationSimpleExclusif: 1, baissePrix: 1,
    },
    acheteurs: {
      acheteursSortisVisite: 7, nombreVisites: 13, offresRecues: 4, compromisSignes: 3,
      chiffreAffairesCompromis: 45000,
    },
    ventes: { actesSignes: 2, chiffreAffaires: 38000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Théo Vasseur (team-beta, junior)
  {
    id: "r-b3-jan",
    userId: "u-demo-b3",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 28, rdvEstimation: 2,
    },
    vendeurs: {
      rdvEstimation: 2, estimationsRealisees: 2, mandatsSignes: 1,
      mandats: [{ id: "mt1j", type: "simple" }],
      rdvSuivi: 1, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 1, nombreVisites: 4, offresRecues: 0, compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Marc Fontaine (manager team-gamma)
  {
    id: "r-m3-jan",
    userId: "m-demo-3",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 42, rdvEstimation: 5,
    },
    vendeurs: {
      rdvEstimation: 5, estimationsRealisees: 4, mandatsSignes: 3,
      mandats: [
        { id: "mf1j", type: "exclusif" },
        { id: "mf2j", type: "exclusif" },
        { id: "mf3j", type: "simple" },
      ],
      rdvSuivi: 5, requalificationSimpleExclusif: 1, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 5, nombreVisites: 9, offresRecues: 3, compromisSignes: 2,
      chiffreAffairesCompromis: 30000,
    },
    ventes: { actesSignes: 2, chiffreAffaires: 24000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Julie Carpentier (team-gamma, confirmé)
  {
    id: "r-g1-jan",
    userId: "u-demo-g1",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 38, rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 2,
      mandats: [
        { id: "mg1j", type: "exclusif" },
        { id: "mg2j", type: "simple" },
      ],
      rdvSuivi: 4, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 4, nombreVisites: 9, offresRecues: 2, compromisSignes: 1,
      chiffreAffairesCompromis: 15000,
    },
    ventes: { actesSignes: 1, chiffreAffaires: 15000 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
  // Nicolas Mercier (team-gamma, junior)
  {
    id: "r-g2-jan",
    userId: "u-demo-g2",
    periodType: "month",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    prospection: {
      contactsTotaux: 25, rdvEstimation: 3,
    },
    vendeurs: {
      rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 1,
      mandats: [
        { id: "mg4j", type: "exclusif" },
      ],
      rdvSuivi: 2, requalificationSimpleExclusif: 0, baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 2, nombreVisites: 4, offresRecues: 1, compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-31T10:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// March 2026 results — Paris (org-demo)
// Generated via makeResult helper for the 11 Paris team members (1 directeur +
// 2 managers + 8 conseillers from mock-users.ts). Calibrated on PARIS_MAR_FACTOR
// (1.1025 = 1.05 perf × 1.05 month trend), part of the Vue Réseau v2.0 Phase 1.
// ─────────────────────────────────────────────────────────────────────────────

export const mockMarchResults: PeriodResults[] = [
  // Jean-Guy Ourmières (m-demo, expert directeur, team-demo)
  makeResult({
    id: "r-manager-mar",
    userId: "m-demo",
    monthKey: "03",
    category: "expert",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-mgr",
  }),
  // Alice Martin (u-demo-1, confirme, team-demo)
  makeResult({
    id: "r-u1-mar",
    userId: "u-demo-1",
    monthKey: "03",
    category: "confirme",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-1",
  }),
  // Bob Bernard (u-demo-2, confirme, team-demo)
  makeResult({
    id: "r-u2-mar",
    userId: "u-demo-2",
    monthKey: "03",
    category: "confirme",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-2",
  }),
  // Catherine Durand (u-demo-3, expert, team-demo)
  makeResult({
    id: "r-u3-mar",
    userId: "u-demo-3",
    monthKey: "03",
    category: "expert",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-3",
  }),
  // Sophie Lemaire (m-demo-2, confirme manager, team-beta)
  makeResult({
    id: "r-m2-mar",
    userId: "m-demo-2",
    monthKey: "03",
    category: "confirme",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-m2",
  }),
  // Lucas Morel (u-demo-b1, confirme, team-beta)
  makeResult({
    id: "r-ub1-mar",
    userId: "u-demo-b1",
    monthKey: "03",
    category: "confirme",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-b1",
  }),
  // Marine Roche (u-demo-b2, expert, team-beta)
  makeResult({
    id: "r-ub2-mar",
    userId: "u-demo-b2",
    monthKey: "03",
    category: "expert",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-b2",
  }),
  // Théo Vasseur (u-demo-b3, debutant, team-beta)
  makeResult({
    id: "r-ub3-mar",
    userId: "u-demo-b3",
    monthKey: "03",
    category: "debutant",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-b3",
  }),
  // Marc Fontaine (m-demo-3, expert manager, team-gamma)
  makeResult({
    id: "r-m3-mar",
    userId: "m-demo-3",
    monthKey: "03",
    category: "expert",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-m3",
  }),
  // Julie Carpentier (u-demo-g1, confirme, team-gamma)
  makeResult({
    id: "r-ug1-mar",
    userId: "u-demo-g1",
    monthKey: "03",
    category: "confirme",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-g1",
  }),
  // Nicolas Mercier (u-demo-g2, debutant, team-gamma)
  makeResult({
    id: "r-ug2-mar",
    userId: "u-demo-g2",
    monthKey: "03",
    category: "debutant",
    factor: PARIS_MAR_FACTOR,
    mandatPrefix: "mp-g2",
  }),
];

// Weekly results for u-demo-1 (current week)
export const mockWeeklyResults: PeriodResults = {
  id: "r1-week",
  userId: "u-demo-1",
  periodType: "week",
  periodStart: "2026-02-23",
  periodEnd: "2026-03-01",
  prospection: {
    contactsTotaux: 12,
    rdvEstimation: 1,
  },
  vendeurs: {
    rdvEstimation: 1,
    estimationsRealisees: 1,
    mandatsSignes: 0,
    mandats: [],
    rdvSuivi: 2,
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
    chiffreAffaires: 0,
  },
  createdAt: "2026-02-23T08:00:00Z",
  updatedAt: "2026-02-24T10:00:00Z",
};

// Yearly results for u-demo-1
export const mockYearlyResults: PeriodResults = {
  id: "r1-year",
  userId: "u-demo-1",
  periodType: "month",
  periodStart: "2026-01-01",
  periodEnd: "2026-12-31",
  prospection: {
    contactsTotaux: 520,
    rdvEstimation: 34,
  },
  vendeurs: {
    rdvEstimation: 34,
    estimationsRealisees: 30,
    mandatsSignes: 18,
    mandats: [
      { id: "m-y1", type: "exclusif" },
      { id: "m-y2", type: "simple" },
      { id: "m-y3", type: "exclusif" },
      { id: "m-y4", type: "exclusif" },
    ],
    rdvSuivi: 56,
    requalificationSimpleExclusif: 5,
    baissePrix: 8,
  },
  acheteurs: {
    acheteursSortisVisite: 42,
    nombreVisites: 88,
    offresRecues: 22,
    compromisSignes: 10,
    chiffreAffairesCompromis: 150000,
  },
  ventes: {
    actesSignes: 8,
    chiffreAffaires: 95000,
  },
  createdAt: "2026-01-01T08:00:00Z",
  updatedAt: "2026-02-24T10:00:00Z",
};

// Monthly CA evolution data for charts
export const mockMonthlyCA = [
  { month: "Sep", ca: 6200 },
  { month: "Oct", ca: 8500 },
  { month: "Nov", ca: 15200 },
  { month: "Déc", ca: 12000 },
  { month: "Jan", ca: 9800 },
  { month: "Fév", ca: 8500 },
];

// Weekly activity data for charts
export const mockWeeklyActivity = [
  { day: "Lun", contacts: 8, rdv: 1, visites: 2 },
  { day: "Mar", contacts: 12, rdv: 0, visites: 1 },
  { day: "Mer", contacts: 6, rdv: 1, visites: 3 },
  { day: "Jeu", contacts: 10, rdv: 0, visites: 1 },
  { day: "Ven", contacts: 9, rdv: 1, visites: 1 },
];

// Monthly progression data for each KPI (last 12 months)
export const mockMonthlyEstimations = [
  { month: "Mar 25", value: 2 },
  { month: "Avr 25", value: 3 },
  { month: "Mai 25", value: 4 },
  { month: "Jun 25", value: 2 },
  { month: "Jul 25", value: 1 },
  { month: "Aoû 25", value: 1 },
  { month: "Sep 25", value: 3 },
  { month: "Oct 25", value: 4 },
  { month: "Nov 25", value: 5 },
  { month: "Déc 25", value: 3 },
  { month: "Jan 26", value: 2 },
  { month: "Fév 26", value: 3 },
];

export const mockMonthlyMandats = [
  { month: "Mar 25", value: 1 },
  { month: "Avr 25", value: 2 },
  { month: "Mai 25", value: 3 },
  { month: "Jun 25", value: 1 },
  { month: "Jul 25", value: 1 },
  { month: "Aoû 25", value: 0 },
  { month: "Sep 25", value: 2 },
  { month: "Oct 25", value: 3 },
  { month: "Nov 25", value: 4 },
  { month: "Déc 25", value: 2 },
  { month: "Jan 26", value: 1 },
  { month: "Fév 26", value: 2 },
];

export const mockMonthlyCompromis = [
  { month: "Mar 25", value: 0 },
  { month: "Avr 25", value: 1 },
  { month: "Mai 25", value: 2 },
  { month: "Jun 25", value: 1 },
  { month: "Jul 25", value: 0 },
  { month: "Aoû 25", value: 0 },
  { month: "Sep 25", value: 1 },
  { month: "Oct 25", value: 2 },
  { month: "Nov 25", value: 3 },
  { month: "Déc 25", value: 1 },
  { month: "Jan 26", value: 1 },
  { month: "Fév 26", value: 1 },
];

export const mockMonthlyCAAnnuel = [
  { month: "Mar 25", value: 5200 },
  { month: "Avr 25", value: 7800 },
  { month: "Mai 25", value: 12500 },
  { month: "Jun 25", value: 8000 },
  { month: "Jul 25", value: 4500 },
  { month: "Aoû 25", value: 3200 },
  { month: "Sep 25", value: 6200 },
  { month: "Oct 25", value: 8500 },
  { month: "Nov 25", value: 15200 },
  { month: "Déc 25", value: 12000 },
  { month: "Jan 26", value: 9800 },
  { month: "Fév 26", value: 8500 },
];

// Zero-results template for new agents
export function createZeroResults(userId: string): PeriodResults {
  return {
    id: `r-${userId}-${Date.now()}`,
    userId,
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsTotaux: 0,
      rdvEstimation: 0,
    },
    vendeurs: {
      rdvEstimation: 0,
      estimationsRealisees: 0,
      mandatsSignes: 0,
      mandats: [],
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 0,
      nombreVisites: 0,
      offresRecues: 0,
      compromisSignes: 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
