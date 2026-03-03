export type ContactStatut = "en_cours" | "deale" | "abandonne";

export interface VenteInfo {
  id: string;
  nom: string;
  commentaire: string;
  statut: ContactStatut;
  profiled?: boolean;
}

export interface ProspectionData {
  contactsEntrants: number;
  contactsTotaux: number;
  rdvEstimation: number;
  informationsVente: VenteInfo[];
}

export interface MandatEntry {
  id: string;
  nomVendeur: string;
  type: "simple" | "exclusif";
  profiled?: boolean;
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

export interface AcheteurChaud {
  id: string;
  nom: string;
  commentaire: string;
  statut: ContactStatut;
  profiled?: boolean;
}

export interface AcheteursData {
  acheteursChauds: AcheteurChaud[];
  acheteursSortisVisite: number;
  nombreVisites: number;
  offresRecues: number;
  compromisSignes: number;
}

export interface VentesData {
  actesSignes: number;
  chiffreAffaires: number;
  delaiMoyenVente: number;
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
