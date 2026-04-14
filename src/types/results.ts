// ─────────────────────────────────────────────────────────────────────────────
// Modèle métier KPI conseiller — source de vérité unique.
//
// ⚠️ NE JAMAIS RÉINTRODUIRE les champs / types suivants (supprimés du socle) :
//   - VenteInfo, AcheteurChaud, ContactStatut
//   - ProspectionData.contactsEntrants
//   - ProspectionData.informationsVente
//   - AcheteursData.acheteursChauds
//   - VentesData.delaiMoyenVente
//   - MandatEntry.nomVendeur (saisie sans nom — uniquement type)
//   - MandatEntry.profiled (fonctionnalité retirée)
//
// Toute réintroduction (même optionnelle, même commentée) constitue une
// régression de la refonte KPI v2 — voir docs/TECH_DEBT.md.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProspectionData {
  contactsTotaux: number;
  rdvEstimation: number;
}

export interface MandatEntry {
  id: string;
  type: "simple" | "exclusif";
}

export interface VendeursData {
  rdvEstimation: number;
  estimationsRealisees: number;
  mandatsSignes: number;
  mandats: MandatEntry[];
  rdvSuivi: number;
  requalificationSimpleExclusif: number;
  baissePrix: number;
}

export interface AcheteursData {
  acheteursSortisVisite: number;
  nombreVisites: number;
  offresRecues: number;
  compromisSignes: number;
  chiffreAffairesCompromis: number;
}

export interface VentesData {
  actesSignes: number;
  chiffreAffaires: number;
}

export interface PeriodResults {
  id: string;
  userId: string;
  periodType: "day" | "week" | "month";
  periodStart: string;
  periodEnd: string;
  prospection: ProspectionData;
  vendeurs: VendeursData;
  acheteurs: AcheteursData;
  ventes: VentesData;
  createdAt: string;
  updatedAt: string;
}
