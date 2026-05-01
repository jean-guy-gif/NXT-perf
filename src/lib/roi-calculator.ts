/**
 * ROI calculator — V1 placeholder
 *
 * Calcule un ROI cumulé à partir des plans 30j (Supabase user_improvement_resources).
 *
 * Logique V1 (heuristique, à calibrer post-MVP) :
 *   - Plan "completed" (100% des actions cochées) : gain = avgCommission × 1.5
 *   - Plan "expired" (≥70% des actions) : gain = avgCommission × 0.8
 *   - Plan "expired" (≥40% des actions) : gain = avgCommission × 0.4
 *   - Plan "expired" (<40% des actions) : gain = 0
 *   - Plan "active" : gain projeté linéairement sur le pourcentage actuel
 *
 * Le coût mensuel d'abonnement (constante) sert de base au ROI multiplier.
 */

import type { ImprovementResource } from "@/lib/improvement-resources-adapters";
import type { Plan30jPayload } from "@/config/coaching";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export const NXT_MONTHLY_PRICE_EUR = 9;

export type RoiPlanStatus = "actif" | "termine" | "expire";

export interface RoiBreakdownEntry {
  /** ID stable du plan (UUID Supabase) — utilisé pour les liens "Revoir". */
  planId: string;
  /** ExpertiseRatioId du levier ciblé. */
  ratioId: string;
  label: string;
  gainEur: number;
  status: RoiPlanStatus;
  createdAt: Date;
  pct: number;
}

export interface RoiSummary {
  totalEuros: number;
  monthsSinceFirstPlan: number;
  totalCostEur: number;
  roiMultiplier: number;
  breakdown: RoiBreakdownEntry[];
}

// ─── Helpers internes ────────────────────────────────────────────────────

function planActions(payload: Plan30jPayload | undefined): {
  total: number;
  done: number;
  pct: number;
} {
  if (!payload || !Array.isArray(payload.weeks)) {
    return { total: 0, done: 0, pct: 0 };
  }
  const all = payload.weeks.flatMap((w) => w.actions ?? []);
  const total = all.length;
  const done = all.filter((a) => a.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function mapStatus(status: string): RoiPlanStatus {
  if (status === "active") return "actif";
  if (status === "completed") return "termine";
  // "expired" | "archived" → traités comme expirés pour la couleur/scoring
  return "expire";
}

function expertiseLabel(painRatioId: string | null): string {
  if (!painRatioId) return "Plan ciblé";
  return (
    RATIO_EXPERTISE[painRatioId as ExpertiseRatioId]?.label ?? painRatioId
  );
}

function estimateGain(
  status: RoiPlanStatus,
  pct: number,
  avgCommission: number
): number {
  if (avgCommission <= 0) return 0;
  if (status === "termine") return Math.round(avgCommission * 1.5);
  if (status === "expire") {
    if (pct >= 70) return Math.round(avgCommission * 0.8);
    if (pct >= 40) return Math.round(avgCommission * 0.4);
    return 0;
  }
  // status === "actif" : projection linéaire (placeholder V1)
  // ex: 50% des actions → ~0.75 × avgCommission projeté ; on cap au gain "termine"
  if (pct <= 0) return 0;
  return Math.round(avgCommission * 1.5 * (pct / 100));
}

// ─── API publique ────────────────────────────────────────────────────────

export function calculateCumulativeROI(
  plans: ImprovementResource[],
  avgCommissionEur: number,
  monthlyPriceEur: number = NXT_MONTHLY_PRICE_EUR
): RoiSummary {
  // On considère TOUS les plans (actifs + archivés) pour le breakdown :
  // - actifs : gain projeté linéairement
  // - terminés / expirés : gain selon heuristique
  const entries: RoiBreakdownEntry[] = plans
    .map((p) => {
      const payload = p.payload as unknown as Plan30jPayload;
      const { pct } = planActions(payload);
      const status = mapStatus(p.status);
      const gainEur = estimateGain(status, pct, avgCommissionEur);
      return {
        planId: p.id,
        ratioId: p.pain_ratio_id ?? "",
        label: expertiseLabel(p.pain_ratio_id),
        gainEur,
        status,
        createdAt: new Date(p.created_at),
        pct,
      };
    })
    .filter((e) => e.gainEur > 0)
    .sort((a, b) => b.gainEur - a.gainEur);

  const totalEuros = entries.reduce((s, e) => s + e.gainEur, 0);

  const firstDate =
    plans.length > 0
      ? plans.reduce(
          (min, p) => {
            const d = new Date(p.created_at);
            return d < min ? d : min;
          },
          new Date(plans[0].created_at)
        )
      : new Date();

  const monthsSinceFirstPlan = Math.max(
    1,
    Math.ceil((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  const totalCostEur = monthsSinceFirstPlan * monthlyPriceEur;
  const roiMultiplier =
    totalCostEur > 0 ? Math.round((totalEuros / totalCostEur) * 10) / 10 : 0;

  return {
    totalEuros,
    monthsSinceFirstPlan,
    totalCostEur,
    roiMultiplier,
    breakdown: entries,
  };
}
