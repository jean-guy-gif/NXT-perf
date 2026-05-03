/**
 * Types partagés client/serveur pour la génération Gamma (PR3.8.6 follow-up #3).
 *
 * Note sécurité : ce module est importable côté client. Aucun secret ne doit
 * y figurer. La clé `GAMMA_API_KEY` reste en `process.env` serveur uniquement.
 */

import type { KitKind } from "@/lib/coaching/team-activation-kit";

/**
 * Contexte de génération transmis par le client. Le serveur peut s'en servir
 * pour personnaliser le prompt (chiffres équipe, conseiller référent…), mais
 * il NE DOIT PAS faire confiance aveuglément au texte. Tout ce qui peut être
 * reconstruit côté serveur (label du levier, causes, actions, pratiques) est
 * recalculé via `coach-brain` côté serveur.
 */
export interface TeamKitContext {
  /** Réalisé équipe (volume ou CA) sur la période. */
  realised?: number;
  /** Objectif à date (proraté). */
  toDate?: number;
  /** Objectif mensuel équipe. */
  monthly?: number;
  /** Écart en % vs objectif à date (signé). */
  gapPct?: number;
  /** Statut rythme dérivé. */
  rhythmStatus?: "behind" | "on_track" | "ahead";
  /** Indicateur (volume principal ou ratio) ciblé sur ce levier. */
  indicatorLabel?: string;
  /** Ratio de référence du levier — moyenne équipe + cible. */
  ratio?: {
    label: string;
    teamAvg: number;
    target: number;
    isPercentage?: boolean;
  };
  /**
   * Conseiller référent identifié comme bon pratiquant ce levier.
   * Le serveur valide que les valeurs sont des nombres avant de les inclure
   * dans le prompt.
   */
  refAdvisor?: {
    name: string;
    levelLabel?: string;
    ratioValue?: number;
    gapVsAvgPct?: number;
  };
}

export type GammaGenerationStatus = "pending" | "completed" | "failed";

export interface GammaGenerationResult {
  generationId: string;
  status: GammaGenerationStatus;
  /** URL Gamma à ouvrir dans un nouvel onglet (présent quand status = completed). */
  gammaUrl?: string;
  /** URL d'export téléchargeable si Gamma la fournit. */
  exportUrl?: string;
  /** Crédits consommés si Gamma les renvoie. */
  credits?: number;
  /** Message d'erreur lisible (si status = failed). */
  errorMessage?: string;
}

export interface GammaGenerateRequestBody {
  kitKind: KitKind;
  expertiseId: string;
  context?: TeamKitContext;
}
