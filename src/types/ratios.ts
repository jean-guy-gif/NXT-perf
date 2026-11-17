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

/**
 * Statut d'un ratio.
 * - `non_mesurable` : dénominateur nul ou échantillon sous le seuil minimum.
 *   Affiché en gris, jamais confondu avec `danger` (un diagnostic qui ne ment pas).
 */
export type RatioStatus = "ok" | "warning" | "danger" | "non_mesurable";

export interface ComputedRatio {
  ratioId: string;
  value: number;
  thresholdForCategory: number;
  status: RatioStatus;
  percentageOfTarget: number;
  /**
   * Message explicatif affiché quand `status === "non_mesurable"` :
   * « Pas encore assez de données » (dénominateur nul) ou
   * « Encore N [unité] pour mesurer » (échantillon insuffisant).
   */
  message?: string;
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
