/**
 * Types partagés du pipeline d'ingestion coach brain (PR-C).
 */

export type ExpertiseRatioId =
  | "contacts_estimations"
  | "estimations_mandats"
  | "pct_exclusivite"
  | "acheteurs_tournee"
  | "visites_par_acheteur"
  | "visites_offres"
  | "offres_compromis"
  | "compromis_actes";

export const ALL_EXPERTISE_IDS: ExpertiseRatioId[] = [
  "contacts_estimations",
  "estimations_mandats",
  "pct_exclusivite",
  "acheteurs_tournee",
  "visites_par_acheteur",
  "visites_offres",
  "offres_compromis",
  "compromis_actes",
];

export type Axis = "behavior" | "mistake" | "question" | "angle";
export const ALL_AXES: Axis[] = ["behavior", "mistake", "question", "angle"];

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

export interface ExtractedPattern {
  expertiseId: ExpertiseRatioId;
  axis: Axis;
  text: string;
}

/**
 * Résultat global d'extraction LLM pour un document. Si le LLM ne trouve
 * aucun pattern actionnable, on log + skip côté run.ts (rejection policy).
 */
export interface ExtractionResult {
  patterns: ExtractedPattern[];
  /** Méta facultative pour debug / log. */
  notes?: string;
}

export interface IngestState {
  /** ID Drive des fichiers déjà ingérés (pour idempotence). */
  ingestedFileIds: string[];
  lastRunAt: string | null;
  stats: {
    totalRuns: number;
    totalFilesProcessed: number;
    totalPatternsUpserted: number;
  };
}
