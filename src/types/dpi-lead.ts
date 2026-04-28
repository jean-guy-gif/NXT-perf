import type { DPIScores } from "@/lib/dpi-scoring";

/**
 * Statut d'un lead DPI tracké côté Directeur (PR2j).
 *
 * Mapping aligné sur les colonnes que la migration PR2k ajoutera à dpi_results :
 * - sent           : lien envoyé par le Directeur, jamais ouvert
 * - opened         : lien ouvert mais questionnaire pas démarré (last_opened_at)
 * - in_progress    : questionnaire commencé (progress_pct ∈ [1, 99])
 * - completed      : questionnaire terminé (completed_at)
 * - pdf_downloaded : rapport PDF téléchargé (pdf_downloaded_at)
 * - restarted      : utilisateur a recommencé un test après completion (restarted_at)
 */
export type DpiLeadStatus =
  | "sent"
  | "opened"
  | "in_progress"
  | "completed"
  | "pdf_downloaded"
  | "restarted";

export interface DpiLead {
  id: string;
  /** Référent — le directeur qui a partagé le lien (uuid). */
  referrerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: DpiLeadStatus;
  /** Progression questionnaire 0-100 (in_progress). */
  progressPct?: number;
  scores?: DPIScores;
  sentAt: string;
  lastOpenedAt?: string;
  completedAt?: string;
  pdfDownloadedAt?: string;
  restartedAt?: string;
}
