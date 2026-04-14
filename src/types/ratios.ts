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

// Canonical ratio IDs used across the app (7 core ratios + honoraires moyens).
export type RatioId =
  | "contacts_rdv"
  | "rdv_mandats"
  | "pct_mandats_exclusifs"
  | "acheteurs_visites"
  | "visites_offre"
  | "offres_compromis"
  | "compromis_actes"
  | "honoraires_moyens";
