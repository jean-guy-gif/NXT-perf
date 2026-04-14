export type ContactStatut = "en_cours" | "deale" | "abandonne";

export interface VenteInfo {
  id: string;
  nom: string;
  commentaire: string;
  statut: ContactStatut;
  profiled?: boolean;
}

export interface AcheteurChaud {
  id: string;
  nom: string;
  commentaire: string;
  statut: ContactStatut;
  profiled?: boolean;
}

export interface ProspectionData {
  contactsTotaux: number;
  rdvEstimation: number;
  /** Extended: nombre de contacts entrants (subset de contactsTotaux) */
  contactsEntrants?: number;
  /** Extended: informations de vente en cours */
  informationsVente?: VenteInfo[];
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

export interface AcheteursData {
  acheteursSortisVisite: number;
  nombreVisites: number;
  offresRecues: number;
  compromisSignes: number;
  chiffreAffairesCompromis: number;
  /** Extended: acheteurs chauds en suivi */
  acheteursChauds?: AcheteurChaud[];
}

export interface VentesData {
  actesSignes: number;
  chiffreAffaires: number;
  /** Extended: délai moyen de vente en jours */
  delaiMoyenVente?: number;
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
