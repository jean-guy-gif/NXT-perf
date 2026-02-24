import type { PeriodResults } from "@/types/results";

export const mockResults: PeriodResults[] = [
  {
    id: "r1",
    userId: "u1",
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
  {
    id: "r2",
    userId: "u2",
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
  {
    id: "r3",
    userId: "u3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 18,
      contactsTotaux: 30,
      rdvEstimation: 1,
      informationsVente: [
        { id: "iv6", nom: "M. Lambert", commentaire: "Héritage, maison ancienne" },
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
        { id: "ac6", nom: "Mlle Thomas", commentaire: "Étudiante, petit budget studio" },
      ],
      acheteursSortisVisite: 2,
      nombreVisites: 5,
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
  {
    id: "r4",
    userId: "u4",
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
];

// Weekly results for u1 (current week)
export const mockWeeklyResults: PeriodResults = {
  id: "r1-week",
  userId: "u1",
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

// Yearly results for u1
export const mockYearlyResults: PeriodResults = {
  id: "r1-year",
  userId: "u1",
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
    userId: "u1",
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
