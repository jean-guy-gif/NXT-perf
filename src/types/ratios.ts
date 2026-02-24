export interface RatioThresholds {
  debutant: number;
  confirme: number;
  expert: number;
}

export interface RatioConfig {
  id: string;
  name: string;
  description: string;
  unit: string;
  thresholds: RatioThresholds;
  isPercentage: boolean;
  isLowerBetter: boolean;
}

export interface ComputedRatio {
  ratioId: string;
  value: number;
  thresholdForCategory: number;
  status: "ok" | "warning" | "danger";
  percentageOfTarget: number;
}

export type RatioId =
  | "contacts_rdv"
  | "estimations_mandats"
  | "pct_mandats_exclusifs"
  | "visites_offre"
  | "offres_compromis"
  | "mandats_simples_vente"
  | "mandats_exclusifs_vente";
