import type { PeriodResults } from "@/types/results";

// TODO(provisoire): placeholder dev, valeur à calibrer — CA compromis mock =
// compromisSignes × 15 000€. Les valeurs `chiffreAffairesCompromis` de ce
// fichier sont des placeholders dérivés de cette règle, pas des valeurs
// issues du CRM. À remplacer par des données réelles ou une règle calibrée
// quand le backend sera branché. Voir docs/TECH_DEBT.md.

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
        { id: "mm1", nomVendeur: "M. Delacroix", type: "exclusif", profiled: true },
        { id: "mm2", nomVendeur: "Mme Vasseur", type: "exclusif", profiled: true },
        { id: "mm3", nomVendeur: "SCI Horizon", type: "exclusif" },
        { id: "mm4", nomVendeur: "M. Prat", type: "simple" },
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
        { id: "m19", nomVendeur: "M. Lambert", type: "exclusif" },
        { id: "m20", nomVendeur: "Mme Perrin", type: "exclusif" },
        { id: "m21", nomVendeur: "SCI Patrimoine+", type: "exclusif" },
        { id: "m22", nomVendeur: "M. André", type: "exclusif" },
        { id: "m23", nomVendeur: "Mme Clément", type: "simple" },
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
        { id: "m3", nomVendeur: "M. Moreau", type: "exclusif" },
        { id: "m4", nomVendeur: "Mme Leroy", type: "exclusif" },
        { id: "m5", nomVendeur: "M. Faure", type: "exclusif" },
        { id: "m6", nomVendeur: "Mme Simon", type: "simple" },
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
        { id: "m1", nomVendeur: "Mme Dubois", type: "exclusif" },
        { id: "m2", nomVendeur: "M. Garcia", type: "simple" },
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
        { id: "ms1", nomVendeur: "M. Duplessis", type: "exclusif" },
        { id: "ms2", nomVendeur: "Mme Cartier", type: "exclusif" },
        { id: "ms3", nomVendeur: "M. Roy", type: "simple" },
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
      mandats: [{ id: "mb1", nomVendeur: "M. Blanc", type: "exclusif" }, { id: "mb2", nomVendeur: "Mme Giraud", type: "simple" }],
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
        { id: "mb3", nomVendeur: "SCI Méridien", type: "exclusif" },
        { id: "mb4", nomVendeur: "M. Pons", type: "exclusif" },
        { id: "mb5", nomVendeur: "Mme Lepage", type: "exclusif" },
        { id: "mb6", nomVendeur: "M. Collin", type: "exclusif" },
        { id: "mb7", nomVendeur: "Mme Brun", type: "simple" },
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
      mandats: [{ id: "mt1", nomVendeur: "M. Renoir", type: "simple" }],
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
        { id: "mf1", nomVendeur: "M. Lefèvre", type: "exclusif" },
        { id: "mf2", nomVendeur: "Mme Guérin", type: "exclusif" },
        { id: "mf3", nomVendeur: "M. Bailly", type: "exclusif" },
        { id: "mf4", nomVendeur: "Mme Caron", type: "simple" },
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
        { id: "mg1", nomVendeur: "M. Picard", type: "exclusif" },
        { id: "mg2", nomVendeur: "Mme Aubry", type: "exclusif" },
        { id: "mg3", nomVendeur: "M. Leconte", type: "simple" },
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
        { id: "mg4", nomVendeur: "M. Vernet", type: "exclusif" },
        { id: "mg5", nomVendeur: "Mme Pascal", type: "simple" },
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
        { id: "mmj1", nomVendeur: "Mme Arnaud", type: "exclusif", profiled: true },
        { id: "mmj2", nomVendeur: "M. Chevalier", type: "exclusif" },
        { id: "mmj3", nomVendeur: "M. Tessier", type: "simple" },
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
        { id: "m19j", nomVendeur: "M. Dubois", type: "exclusif" },
        { id: "m20j", nomVendeur: "Mme Colin", type: "exclusif" },
        { id: "m21j", nomVendeur: "M. Girard", type: "exclusif" },
        { id: "m22j", nomVendeur: "Mme Petit", type: "simple" },
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
        { id: "m3j", nomVendeur: "M. Duval", type: "exclusif" },
        { id: "m4j", nomVendeur: "Mme Roux", type: "exclusif" },
        { id: "m5j", nomVendeur: "M. Noel", type: "simple" },
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
        { id: "m1j", nomVendeur: "M. Fernandez", type: "exclusif" },
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
        { id: "ms1j", nomVendeur: "Mme Boucher", type: "exclusif" },
        { id: "ms2j", nomVendeur: "M. Picard", type: "simple" },
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
      mandats: [{ id: "mb1j", nomVendeur: "M. Mercier", type: "exclusif" }],
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
        { id: "mb3j", nomVendeur: "M. Laurent", type: "exclusif" },
        { id: "mb4j", nomVendeur: "Mme Roussel", type: "exclusif" },
        { id: "mb5j", nomVendeur: "M. Henry", type: "exclusif" },
        { id: "mb6j", nomVendeur: "Mme David", type: "simple" },
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
      mandats: [{ id: "mt1j", nomVendeur: "Mme Morin", type: "simple" }],
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
        { id: "mf1j", nomVendeur: "Mme Fournier", type: "exclusif" },
        { id: "mf2j", nomVendeur: "M. Masson", type: "exclusif" },
        { id: "mf3j", nomVendeur: "Mme Clement", type: "simple" },
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
        { id: "mg1j", nomVendeur: "M. Bonnet", type: "exclusif" },
        { id: "mg2j", nomVendeur: "Mme Marchand", type: "simple" },
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
        { id: "mg4j", nomVendeur: "Mme Lopez", type: "exclusif" },
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
      { id: "m-y1", nomVendeur: "Mme Dubois", type: "exclusif" },
      { id: "m-y2", nomVendeur: "M. Garcia", type: "simple" },
      { id: "m-y3", nomVendeur: "Famille Petit", type: "exclusif" },
      { id: "m-y4", nomVendeur: "M. Renaud", type: "exclusif" },
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
