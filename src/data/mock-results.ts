import type { PeriodResults } from "@/types/results";

export const mockResults: PeriodResults[] = [
  // Agent 1 (Alice Martin - confirmé)
  {
    id: "r1",
    userId: "u-demo-1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 28,
      contactsTotaux: 45,
      rdvEstimation: 3,
      informationsVente: [
        { id: "iv1", nom: "Mme Dubois", commentaire: "Départ retraite, vente maison principale" },
        { id: "iv2", nom: "M. Garcia", commentaire: "Succession, appartement T3 centre-ville" },
        { id: "iv3", nom: "Famille Petit", commentaire: "Mutation professionnelle Lyon" },
      ],
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
      requalificationSimpleExclusif: 1,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac1", nom: "M. et Mme Laurent", commentaire: "Budget 350k, recherche T4 avec jardin" },
        { id: "ac2", nom: "Mlle Roux", commentaire: "Premier achat, studio/T2 max 180k" },
      ],
      acheteursSortisVisite: 4,
      nombreVisites: 8,
      offresRecues: 2,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 8500,
      delaiMoyenVente: 78,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 2 (Bob Bernard - confirmé)
  {
    id: "r2",
    userId: "u-demo-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 35,
      contactsTotaux: 52,
      rdvEstimation: 5,
      informationsVente: [
        { id: "iv4", nom: "M. Moreau", commentaire: "Divorce, vente rapide souhaitée" },
        { id: "iv5", nom: "Mme Leroy", commentaire: "Investisseur, revente T2 locatif" },
      ],
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
      acheteursChauds: [
        { id: "ac3", nom: "M. Bertrand", commentaire: "Cadre sup, budget 500k+" },
        { id: "ac4", nom: "Couple Fontaine", commentaire: "Famille 2 enfants, maison 4ch" },
        { id: "ac5", nom: "M. Girard", commentaire: "Investisseur, rentabilité >5%" },
      ],
      acheteursSortisVisite: 7,
      nombreVisites: 14,
      offresRecues: 4,
      compromisSignes: 2,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 22000,
      delaiMoyenVente: 65,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 3 (Catherine Durand - expert)
  {
    id: "r3",
    userId: "u-demo-3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 40,
      contactsTotaux: 60,
      rdvEstimation: 6,
      informationsVente: [
        { id: "iv6", nom: "M. Lambert", commentaire: "Héritage, maison ancienne à rénover" },
        { id: "iv6b", nom: "Mme Perrin", commentaire: "Résidence secondaire Côte d'Azur" },
        { id: "iv6c", nom: "SCI Patrimoine+", commentaire: "Lot de 2 T2 investissement" },
      ],
    },
    vendeurs: {
      rdvEstimation: 6,
      estimationsRealisees: 6,
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
      acheteursChauds: [
        { id: "ac6", nom: "Mlle Thomas", commentaire: "Cadre dirigeant, budget 600k" },
        { id: "ac6b", nom: "M. et Mme Fabre", commentaire: "Famille recomposée, maison 5p" },
        { id: "ac6c", nom: "Investisseur Groupe B", commentaire: "Portefeuille locatif" },
      ],
      acheteursSortisVisite: 8,
      nombreVisites: 16,
      offresRecues: 4,
      compromisSignes: 3,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 35000,
      delaiMoyenVente: 55,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 4 (David Dubois - junior)
  {
    id: "r4",
    userId: "u-demo-4",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 22,
      contactsTotaux: 38,
      rdvEstimation: 2,
      informationsVente: [
        { id: "iv7", nom: "M. Blanc", commentaire: "Retraite anticipée, villa bord de mer" },
        { id: "iv8", nom: "Mme Chevalier", commentaire: "Déménagement, appart T4" },
      ],
    },
    vendeurs: {
      rdvEstimation: 2,
      estimationsRealisees: 2,
      mandatsSignes: 1,
      mandats: [
        { id: "m7", nomVendeur: "M. Blanc", type: "simple" },
      ],
      rdvSuivi: 4,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac7", nom: "M. et Mme Duval", commentaire: "Famille, maison 3 chambres" },
      ],
      acheteursSortisVisite: 3,
      nombreVisites: 6,
      offresRecues: 1,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 7200,
      delaiMoyenVente: 92,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 5 (Émilie Petit - confirmé)
  {
    id: "r5",
    userId: "u-demo-5",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 32,
      contactsTotaux: 48,
      rdvEstimation: 4,
      informationsVente: [
        { id: "iv9", nom: "Mme Rousseau", commentaire: "Succession, villa avec terrain" },
        { id: "iv10", nom: "Couple Martin", commentaire: "Mutation, maison 4 chambres" },
      ],
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "m8", nomVendeur: "Mme Rousseau", type: "exclusif" },
        { id: "m9", nomVendeur: "Couple Martin", type: "exclusif" },
        { id: "m10", nomVendeur: "M. Leclerc", type: "simple" },
      ],
      rdvSuivi: 6,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac8", nom: "M. Schmitt", commentaire: "Cadre, budget 400k" },
        { id: "ac9", nom: "Couple Lefebvre", commentaire: "Famille, T4 avec jardin" },
      ],
      acheteursSortisVisite: 5,
      nombreVisites: 10,
      offresRecues: 2,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 12500,
      delaiMoyenVente: 70,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 6 (Franck Girard - expert)
  {
    id: "r6",
    userId: "u-demo-6",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 45,
      contactsTotaux: 68,
      rdvEstimation: 7,
      informationsVente: [
        { id: "iv11", nom: "M. Richard", commentaire: "Vente portefeuille immobilier" },
        { id: "iv12", nom: "Mme Bonnet", commentaire: "Portfolio de 3 biens" },
        { id: "iv13", nom: "SCI Immobilien", commentaire: "Vente de patrimoine" },
      ],
    },
    vendeurs: {
      rdvEstimation: 7,
      estimationsRealisees: 7,
      mandatsSignes: 6,
      mandats: [
        { id: "m11", nomVendeur: "M. Richard", type: "exclusif" },
        { id: "m12", nomVendeur: "Mme Bonnet", type: "exclusif" },
        { id: "m13", nomVendeur: "SCI Immobilien", type: "exclusif" },
        { id: "m14", nomVendeur: "M. Arnould", type: "exclusif" },
        { id: "m15", nomVendeur: "Mme Henry", type: "exclusif" },
        { id: "m16", nomVendeur: "M. Vidal", type: "simple" },
      ],
      rdvSuivi: 11,
      requalificationSimpleExclusif: 3,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac10", nom: "Investisseur Groupe A", commentaire: "Portefeuille premium" },
        { id: "ac11", nom: "M. Tessier", commentaire: "Acquisition multi-biens" },
        { id: "ac12", nom: "Couple Renaud", commentaire: "Villégiature côte azur" },
      ],
      acheteursSortisVisite: 9,
      nombreVisites: 18,
      offresRecues: 5,
      compromisSignes: 3,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 58000,
      delaiMoyenVente: 55,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 7 (Géraldine Laurent - confirmé)
  {
    id: "r7",
    userId: "u-demo-7",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 26,
      contactsTotaux: 42,
      rdvEstimation: 3,
      informationsVente: [
        { id: "iv14", nom: "Mme Collet", commentaire: "Veuvage, petit appartement" },
        { id: "iv15", nom: "M. Maury", commentaire: "Relocalisation, studio" },
      ],
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 3,
      mandatsSignes: 2,
      mandats: [
        { id: "m17", nomVendeur: "Mme Collet", type: "exclusif" },
        { id: "m18", nomVendeur: "M. Maury", type: "simple" },
      ],
      rdvSuivi: 4,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac13", nom: "M. Olivier", commentaire: "Achat premier bien" },
        { id: "ac14", nom: "Couple Dupre", commentaire: "Petit budget accession" },
      ],
      acheteursSortisVisite: 4,
      nombreVisites: 7,
      offresRecues: 1,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 4800,
      delaiMoyenVente: 85,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // Agent 8 (Hervé Fournier - junior)
  {
    id: "r8",
    userId: "u-demo-8",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 15,
      contactsTotaux: 24,
      rdvEstimation: 1,
      informationsVente: [
        { id: "iv16", nom: "M. Gérard", commentaire: "Studio à vendre, petit prix" },
      ],
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 1,
      mandatsSignes: 0,
      mandats: [],
      rdvSuivi: 1,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac15", nom: "Mlle Pasquier", commentaire: "Petit budget location-accession" },
      ],
      acheteursSortisVisite: 1,
      nombreVisites: 2,
      offresRecues: 0,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-10T10:00:00Z",
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
    contactsEntrants: 7,
    contactsTotaux: 12,
    rdvEstimation: 1,
    informationsVente: [
      { id: "iv-w1", nom: "M. Renaud", commentaire: "Vente pavillon suite divorce" },
    ],
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
    acheteursChauds: [
      { id: "ac-w1", nom: "Mlle Carpentier", commentaire: "Budget 220k, T3 centre" },
    ],
    acheteursSortisVisite: 1,
    nombreVisites: 3,
    offresRecues: 0,
    compromisSignes: 0,
  },
  ventes: {
    actesSignes: 0,
    chiffreAffaires: 0,
    delaiMoyenVente: 0,
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
    contactsEntrants: 310,
    contactsTotaux: 520,
    rdvEstimation: 34,
    informationsVente: [
      { id: "iv-y1", nom: "Mme Dubois", commentaire: "Départ retraite, vente maison principale" },
      { id: "iv-y2", nom: "M. Garcia", commentaire: "Succession, appartement T3 centre-ville" },
      { id: "iv-y3", nom: "Famille Petit", commentaire: "Mutation professionnelle Lyon" },
      { id: "iv-y4", nom: "M. Renaud", commentaire: "Vente pavillon suite divorce" },
      { id: "iv-y5", nom: "Mme Lefèvre", commentaire: "Investisseur, revente locatif" },
    ],
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
    acheteursChauds: [
      { id: "ac-y1", nom: "M. et Mme Laurent", commentaire: "Budget 350k, recherche T4 avec jardin" },
      { id: "ac-y2", nom: "Mlle Roux", commentaire: "Premier achat, studio/T2 max 180k" },
      { id: "ac-y3", nom: "Mlle Carpentier", commentaire: "Budget 220k, T3 centre" },
    ],
    acheteursSortisVisite: 42,
    nombreVisites: 88,
    offresRecues: 22,
    compromisSignes: 10,
  },
  ventes: {
    actesSignes: 8,
    chiffreAffaires: 95000,
    delaiMoyenVente: 82,
  },
  createdAt: "2026-01-01T08:00:00Z",
  updatedAt: "2026-02-24T10:00:00Z",
};

// Mock data for year N-1 comparison
export const mockResultsLastYear: PeriodResults[] = [
  {
    id: "r1-ly",
    userId: "u-demo-1",
    periodType: "month",
    periodStart: "2025-02-01",
    periodEnd: "2025-02-28",
    prospection: {
      contactsEntrants: 20,
      contactsTotaux: 35,
      rdvEstimation: 2,
      informationsVente: [
        { id: "iv-ly1", nom: "Ancien client", commentaire: "Données année précédente" },
      ],
    },
    vendeurs: {
      rdvEstimation: 2,
      estimationsRealisees: 2,
      mandatsSignes: 1,
      mandats: [
        { id: "m-ly1", nomVendeur: "Client N-1", type: "simple" },
      ],
      rdvSuivi: 3,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac-ly1", nom: "Acheteur N-1", commentaire: "Données précédentes" },
      ],
      acheteursSortisVisite: 3,
      nombreVisites: 6,
      offresRecues: 1,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2025-02-01T08:00:00Z",
    updatedAt: "2025-02-28T10:00:00Z",
  },
];

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
      contactsEntrants: 0,
      contactsTotaux: 0,
      rdvEstimation: 0,
      informationsVente: [],
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
      acheteursChauds: [],
      acheteursSortisVisite: 0,
      nombreVisites: 0,
      offresRecues: 0,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
