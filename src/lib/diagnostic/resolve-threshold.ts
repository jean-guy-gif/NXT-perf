/**
 * resolveThreshold — résolution du seuil contextuel d'un ratio (chantier A.3).
 *
 * Module pur, isolé pour testabilité future. Convertit la matrice contextuelle
 * 4 axes (séniorité + statut juridique + taille équipe + commission moyenne)
 * en un seuil unique applicable au ratio.
 *
 * FORMULE :
 *   exigence    = statusMod × teamSizeMod × commissionMod   (∈ [0.857, 1.331])
 *   thresholdF  = direction === "more_is_better"
 *                   ? thresholdBase × exigence              (seuil min plus haut → exigeant)
 *                   : thresholdBase / exigence              (seuil max plus bas → exigeant)
 *
 * SÉMANTIQUE des modifiers : "exigence multiplier" — m=1 neutre, m>1 plus
 * exigeant, m<1 moins exigeant. L'application sur le seuil dépend de la
 * direction du ratio (asymétrie expliquée dans l'audit A.3 §6).
 *
 * Exemple :
 *   mandataire (1.10) sur `pct_exclusivite` (more_is_better) seuil 50% :
 *     → 50 × 1.10 = 55%  (plus exigeant ✓)
 *   mandataire (1.10) sur `contacts_estimations` (less_is_better) seuil 15 :
 *     → 15 / 1.10 = 13.6 (plus exigeant ✓)
 *
 * Calibration V1 "à la louche métier" — ajustable post-MVP.
 */

import type { RatioExpertise } from "@/data/ratio-expertise";
import type { AgentStatus } from "@/types/user";

export type TeamSizeBucket = "solo" | "small" | "medium" | "large";
export type CommissionBucket = "low" | "mid" | "high" | "premium";

/**
 * Contexte minimal nécessaire pour `resolveThreshold`. Sous-ensemble de
 * `UserContext` (cf. `src/hooks/use-user-context.ts`) — gardé séparé pour
 * que la lib reste agnostique du hook (pure function).
 */
export interface ThresholdContext {
  seniority: "junior" | "confirme" | "expert";
  agentStatus: AgentStatus | null;
  teamSizeBucket: TeamSizeBucket;
  avgCommissionEur: number;
}

// ─── Calibration V1 ──────────────────────────────────────────────────────

/**
 * Modifier d'exigence par statut juridique. `null` (profil pré-A.2) → neutre.
 * - salarie : 0.95 (sécurité contractuelle, exigence naturellement plus basse)
 * - agent_commercial : 1.00 (référence)
 * - mandataire : 1.10 (indépendant payé au résultat, exigence plus haute)
 */
export const STATUS_EXIGENCE: Record<AgentStatus | "default", number> = {
  salarie: 0.95,
  agent_commercial: 1.0,
  mandataire: 1.1,
  default: 1.0,
};

/**
 * Modifier d'exigence par bucket taille équipe.
 * - solo (1) : 0.95 (pas de soutien équipe)
 * - small (2-5) : 1.00 (référence)
 * - medium (6-15) : 1.05 (plus de ressources collectives)
 * - large (16+) : 1.10 (réseau d'entraide + outils + manager)
 */
export const TEAM_SIZE_EXIGENCE: Record<TeamSizeBucket, number> = {
  solo: 0.95,
  small: 1.0,
  medium: 1.05,
  large: 1.1,
};

/**
 * Modifier d'exigence par bucket commission moyenne (€).
 * - low (<5000) : 0.95 (volumes serrés, pression marge plus basse)
 * - mid (5000-10000) : 1.00 (référence)
 * - high (10000-15000) : 1.05 (pression qualité plus haute)
 * - premium (>15000) : 1.10 (segment haut de gamme)
 */
export const COMMISSION_EXIGENCE: Record<CommissionBucket, number> = {
  low: 0.95,
  mid: 1.0,
  high: 1.05,
  premium: 1.1,
};

// ─── Bucketers ──────────────────────────────────────────────────────────

export function bucketTeamSize(memberCount: number): TeamSizeBucket {
  if (memberCount <= 1) return "solo";
  if (memberCount <= 5) return "small";
  if (memberCount <= 15) return "medium";
  return "large";
}

export function bucketCommission(avgCommissionEur: number): CommissionBucket {
  if (avgCommissionEur < 5000) return "low";
  if (avgCommissionEur < 10000) return "mid";
  if (avgCommissionEur < 15000) return "high";
  return "premium";
}

// ─── API publique ────────────────────────────────────────────────────────

/**
 * Calcule le multiplicateur d'exigence cumulé à partir du contexte.
 * Range théorique : [0.95³ = 0.857, 1.10³ = 1.331].
 */
export function computeExigence(ctx: ThresholdContext): number {
  const statusMod = STATUS_EXIGENCE[ctx.agentStatus ?? "default"];
  const teamMod = TEAM_SIZE_EXIGENCE[ctx.teamSizeBucket];
  const commMod = COMMISSION_EXIGENCE[bucketCommission(ctx.avgCommissionEur)];
  return statusMod * teamMod * commMod;
}

/**
 * Résout le seuil contextuel d'un ratio pour le user donné.
 * Direction-aware : `more_is_better` multiplie, `less_is_better` divise.
 */
export function resolveThreshold(
  expertise: RatioExpertise,
  ctx: ThresholdContext,
): number {
  const base = expertise.thresholds[ctx.seniority];
  const exigence = computeExigence(ctx);
  return expertise.direction === "more_is_better"
    ? base * exigence
    : base / exigence;
}
