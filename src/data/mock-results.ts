import type { PeriodResults } from "@/types/results";

export const mockResults: PeriodResults[] = [
  // Manager (Jean-Guy Dupont - expert, aussi producteur)
  {
    id: "r-manager",
    userId: "m-demo",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 38,
      contactsTotaux: 55,
      rdvEstimation: 5,
      informationsVente: [
        { id: "iv-m1", nom: "M. Delacroix", commentaire: "Patrimoine familial, 2 biens", statut: "deale" },
        { id: "iv-m2", nom: "Mme Vasseur", commentaire: "Résidence principale, départ étranger", statut: "deale" },
        { id: "iv-m3", nom: "SCI Horizon", commentaire: "Lot commercial centre-ville", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 5,
      estimationsRealisees: 5,
      mandatsSignes: 4,
      mandats: [
        { id: "mm1", nomVendeur: "M. Delacroix", type: "exclusif" },
        { id: "mm2", nomVendeur: "Mme Vasseur", type: "exclusif" },
        { id: "mm3", nomVendeur: "SCI Horizon", type: "exclusif" },
        { id: "mm4", nomVendeur: "M. Prat", type: "simple" },
      ],
      rdvSuivi: 8,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acm1", nom: "Groupe Invest+", commentaire: "Portefeuille 800k, multi-lots", statut: "deale" },
        { id: "acm2", nom: "M. et Mme Château", commentaire: "Résidence principale haut de gamme", statut: "deale" },
        { id: "acm3", nom: "M. Ferreira", commentaire: "Investisseur, rendement locatif", statut: "en_cours" },
      ],
      acheteursSortisVisite: 7,
      nombreVisites: 12,
      offresRecues: 3,
      compromisSignes: 2,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 32000,
      delaiMoyenVente: 60,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-23T10:00:00Z",
  },
  // =====================================================================
  // AGENT 6 — Franck Girard (expert) — TRÈS EN RÉUSSITE
  // contacts/rdv=8 (seuil 10), estim/mandat=1.14 (seuil 1.5), exclu=87% (seuil 70%)
  // visites/offre=3 (seuil 8), offres/compromis=1.2 (seuil 1.5), CA=72k
  // =====================================================================
  {
    id: "r6",
    userId: "u-demo-6",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 52,
      contactsTotaux: 72,
      rdvEstimation: 9,
      informationsVente: [
        { id: "iv11", nom: "M. Richard", commentaire: "Vente portefeuille immobilier, 3 lots", statut: "deale" },
        { id: "iv12", nom: "Mme Bonnet", commentaire: "Résidence principale + secondaire", statut: "deale" },
        { id: "iv13", nom: "SCI Immobilien", commentaire: "Patrimoine commercial à céder", statut: "deale" },
        { id: "iv14f", nom: "M. Castellano", commentaire: "Villa prestige littoral", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 9,
      estimationsRealisees: 8,
      mandatsSignes: 7,
      mandats: [
        { id: "m11", nomVendeur: "M. Richard", type: "exclusif" },
        { id: "m12", nomVendeur: "Mme Bonnet", type: "exclusif" },
        { id: "m13", nomVendeur: "SCI Immobilien", type: "exclusif" },
        { id: "m14", nomVendeur: "M. Castellano", type: "exclusif" },
        { id: "m15", nomVendeur: "Mme Henry", type: "exclusif" },
        { id: "m16f", nomVendeur: "M. Arnould", type: "exclusif" },
        { id: "m17f", nomVendeur: "M. Vidal", type: "simple" },
      ],
      rdvSuivi: 14,
      requalificationSimpleExclusif: 3,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac10", nom: "Investisseur Groupe A", commentaire: "Portefeuille 1.2M", statut: "deale" },
        { id: "ac11", nom: "M. Tessier", commentaire: "Acquisition multi-biens premium", statut: "deale" },
        { id: "ac12", nom: "Couple Renaud", commentaire: "Villégiature côte azur 600k", statut: "deale" },
        { id: "ac12b", nom: "SCI Atlas", commentaire: "Recherche immeuble rapport", statut: "en_cours" },
      ],
      acheteursSortisVisite: 11,
      nombreVisites: 18,
      offresRecues: 6,
      compromisSignes: 5,
    },
    ventes: {
      actesSignes: 4,
      chiffreAffaires: 72000,
      delaiMoyenVente: 42,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-27T10:00:00Z",
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
      contactsEntrants: 42,
      contactsTotaux: 65,
      rdvEstimation: 7,
      informationsVente: [
        { id: "iv6", nom: "M. Lambert", commentaire: "Héritage, maison ancienne à rénover", statut: "deale" },
        { id: "iv6b", nom: "Mme Perrin", commentaire: "Résidence secondaire Côte d'Azur", statut: "deale" },
        { id: "iv6c", nom: "SCI Patrimoine+", commentaire: "Lot de 2 T2 investissement", statut: "en_cours" },
      ],
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
      acheteursChauds: [
        { id: "ac6", nom: "Mlle Thomas", commentaire: "Cadre dirigeant, budget 600k", statut: "deale" },
        { id: "ac6b", nom: "M. et Mme Fabre", commentaire: "Famille recomposée, maison 5p", statut: "deale" },
        { id: "ac6c", nom: "Investisseur Groupe B", commentaire: "Portefeuille locatif", statut: "en_cours" },
      ],
      acheteursSortisVisite: 8,
      nombreVisites: 16,
      offresRecues: 4,
      compromisSignes: 3,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 42000,
      delaiMoyenVente: 52,
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
      contactsEntrants: 36,
      contactsTotaux: 52,
      rdvEstimation: 5,
      informationsVente: [
        { id: "iv4", nom: "M. Moreau", commentaire: "Divorce, vente rapide souhaitée", statut: "deale" },
        { id: "iv5", nom: "Mme Leroy", commentaire: "Investisseur, revente T2 locatif", statut: "en_cours" },
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
        { id: "ac3", nom: "M. Bertrand", commentaire: "Cadre sup, budget 500k+", statut: "deale" },
        { id: "ac4", nom: "Couple Fontaine", commentaire: "Famille 2 enfants, maison 4ch", statut: "en_cours" },
        { id: "ac5", nom: "M. Girard", commentaire: "Investisseur, rentabilité >5%", statut: "en_cours" },
      ],
      acheteursSortisVisite: 7,
      nombreVisites: 14,
      offresRecues: 4,
      compromisSignes: 2,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 28000,
      delaiMoyenVente: 58,
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
      contactsEntrants: 30,
      contactsTotaux: 50,
      rdvEstimation: 3,
      informationsVente: [
        { id: "iv1", nom: "Mme Dubois", commentaire: "Départ retraite, vente maison principale", statut: "deale" },
        { id: "iv2", nom: "M. Garcia", commentaire: "Succession, appartement T3 centre-ville", statut: "en_cours" },
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
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac1", nom: "M. et Mme Laurent", commentaire: "Budget 350k, recherche T4 avec jardin", statut: "en_cours" },
        { id: "ac2", nom: "Mlle Roux", commentaire: "Premier achat, studio/T2 max 180k", statut: "abandonne" },
      ],
      acheteursSortisVisite: 4,
      nombreVisites: 12,
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
  // =====================================================================
  // AGENT 5 — Émilie Petit (confirmé) — MOYEN-BAS
  // contacts/rdv=18 (seuil 15 → danger), estim/mandat=2.5 (seuil 2 → warning)
  // exclu=50% (seuil 50% → pile), visites/offre=10 (seuil 10 → ok pile)
  // offres/compromis=2 (seuil 2 → ok), mais 0 acte donc mandats/vente = 0
  // =====================================================================
  {
    id: "r5",
    userId: "u-demo-5",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 25,
      contactsTotaux: 54,
      rdvEstimation: 3,
      informationsVente: [
        { id: "iv9", nom: "Mme Rousseau", commentaire: "Succession, villa avec terrain", statut: "en_cours" },
        { id: "iv10", nom: "Couple Martin", commentaire: "Mutation, maison 4 chambres", statut: "abandonne" },
      ],
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 5,
      mandatsSignes: 2,
      mandats: [
        { id: "m8", nomVendeur: "Mme Rousseau", type: "exclusif" },
        { id: "m10", nomVendeur: "M. Leclerc", type: "simple" },
      ],
      rdvSuivi: 5,
      requalificationSimpleExclusif: 0,
      baissePrix: 2,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac8", nom: "M. Schmitt", commentaire: "Cadre, budget 400k", statut: "en_cours" },
      ],
      acheteursSortisVisite: 3,
      nombreVisites: 10,
      offresRecues: 2,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-20T10:00:00Z",
  },
  // =====================================================================
  // AGENT 4 — David Dubois (junior) — EN ÉCHEC
  // contacts/rdv=30 (seuil 20 → danger), estim/mandat=2 (seuil 4 → ok mais peu de volume)
  // exclu=0% (seuil 30% → danger), visites/offre=15 (seuil 12 → warning)
  // offres/compromis=0 (0 compromis → danger), CA=0, beaucoup d'effort peu de résultat
  // =====================================================================
  {
    id: "r4",
    userId: "u-demo-4",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 20,
      contactsTotaux: 60,
      rdvEstimation: 2,
      informationsVente: [
        { id: "iv7", nom: "M. Blanc", commentaire: "Retraite anticipée, villa bord de mer", statut: "abandonne" },
      ],
    },
    vendeurs: {
      rdvEstimation: 2,
      estimationsRealisees: 2,
      mandatsSignes: 1,
      mandats: [
        { id: "m7", nomVendeur: "M. Blanc", type: "simple" },
      ],
      rdvSuivi: 2,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac7", nom: "M. et Mme Duval", commentaire: "Famille, maison 3 chambres", statut: "abandonne" },
      ],
      acheteursSortisVisite: 2,
      nombreVisites: 15,
      offresRecues: 1,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-18T10:00:00Z",
  },
  // =====================================================================
  // AGENT 7 — Géraldine Laurent (confirmé) — EN ÉCHEC
  // contacts/rdv=25 (seuil 15 → danger), estim/mandat=3 (seuil 2 → danger)
  // exclu=0% (seuil 50% → danger), visites/offre=7 (seuil 10 → ok)
  // mais 0 compromis → danger, CA=0, profil découragé
  // =====================================================================
  {
    id: "r7",
    userId: "u-demo-7",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 18,
      contactsTotaux: 50,
      rdvEstimation: 2,
      informationsVente: [
        { id: "iv14", nom: "Mme Collet", commentaire: "Veuvage, petit appartement", statut: "abandonne" },
      ],
    },
    vendeurs: {
      rdvEstimation: 2,
      estimationsRealisees: 3,
      mandatsSignes: 1,
      mandats: [
        { id: "m17", nomVendeur: "M. Maury", type: "simple" },
      ],
      rdvSuivi: 3,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "ac13", nom: "M. Olivier", commentaire: "Achat premier bien", statut: "abandonne" },
      ],
      acheteursSortisVisite: 2,
      nombreVisites: 7,
      offresRecues: 1,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  // =====================================================================
  // AGENT 8 — Hervé Fournier (junior) — SUPER ÉCHEC
  // contacts/rdv=0 (0 rdv sur 40 contacts → danger total)
  // 0 estimation, 0 mandat, 0 visite, 0 offre, 0 compromis, 0 CA
  // Énorme volume de pige téléphonique mais zéro conversion
  // =====================================================================
  {
    id: "r8",
    userId: "u-demo-8",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 8,
      contactsTotaux: 42,
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
      nombreVisites: 3,
      offresRecues: 0,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-08T10:00:00Z",
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
      { id: "iv-w1", nom: "M. Renaud", commentaire: "Vente pavillon suite divorce", statut: "en_cours" },
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
      { id: "ac-w1", nom: "Mlle Carpentier", commentaire: "Budget 220k, T3 centre", statut: "en_cours" },
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
      { id: "iv-y1", nom: "Mme Dubois", commentaire: "Départ retraite, vente maison principale", statut: "deale" },
      { id: "iv-y2", nom: "M. Garcia", commentaire: "Succession, appartement T3 centre-ville", statut: "deale" },
      { id: "iv-y3", nom: "Famille Petit", commentaire: "Mutation professionnelle Lyon", statut: "deale" },
      { id: "iv-y4", nom: "M. Renaud", commentaire: "Vente pavillon suite divorce", statut: "en_cours" },
      { id: "iv-y5", nom: "Mme Lefèvre", commentaire: "Investisseur, revente locatif", statut: "abandonne" },
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
      { id: "ac-y1", nom: "M. et Mme Laurent", commentaire: "Budget 350k, recherche T4 avec jardin", statut: "deale" },
      { id: "ac-y2", nom: "Mlle Roux", commentaire: "Premier achat, studio/T2 max 180k", statut: "abandonne" },
      { id: "ac-y3", nom: "Mlle Carpentier", commentaire: "Budget 220k, T3 centre", statut: "en_cours" },
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
