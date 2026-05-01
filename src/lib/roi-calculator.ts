/**
 * ROI calculator — V1 placeholder
 *
 * Calcule un ROI cumulé à partir des plans 30j archivés.
 *
 * Logique V1 (heuristique) :
 *   - Plan "termine" (100% des actions cochées) : gain = avgCommission × 1.5
 *     (≈ 1,5 acte supplémentaire généré sur 30 jours)
 *   - Plan "expire" mais ≥ 70% : gain = avgCommission × 0.8
 *   - Plan "expire" ≥ 40% : gain = avgCommission × 0.4
 *   - Plan "expire" < 40% : gain = 0
 *
 * Le coût mensuel d'abonnement (constante) sert de base au ROI multiplier.
 * À calibrer avec les vraies mesures pré/post saisie quand le pipeline sera en place.
 */

import type { PlanWithMeta } from "@/hooks/use-plans";

export const NXT_MONTHLY_PRICE_EUR = 9;

export interface RoiBreakdownEntry {
  ratioId: string;
  label: string;
  gainEur: number;
  status: "termine" | "expire" | "actif";
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

function estimateGainPerPlan(meta: PlanWithMeta, avgCommissionEur: number): number {
  if (avgCommissionEur <= 0) return 0;
  if (meta.status === "termine") return Math.round(avgCommissionEur * 1.5);
  if (meta.status === "expire") {
    if (meta.progressPct >= 70) return Math.round(avgCommissionEur * 0.8);
    if (meta.progressPct >= 40) return Math.round(avgCommissionEur * 0.4);
  }
  return 0;
}

export function calculateCumulativeROI(
  plans: PlanWithMeta[],
  avgCommissionEur: number,
  monthlyPriceEur: number = NXT_MONTHLY_PRICE_EUR
): RoiSummary {
  // Ne garder que les plans terminés ou expirés (archivés)
  const archived = plans.filter(
    (p) => p.status === "termine" || p.status === "expire"
  );

  const breakdown: RoiBreakdownEntry[] = archived
    .map((p) => ({
      ratioId: p.ratioId,
      label: p.plan.priorities[0]?.label ?? p.ratioId,
      gainEur: estimateGainPerPlan(p, avgCommissionEur),
      status: p.status as "termine" | "expire" | "actif",
      createdAt: p.createdAt,
      pct: p.progressPct,
    }))
    .filter((e) => e.gainEur > 0)
    .sort((a, b) => b.gainEur - a.gainEur);

  const totalEuros = breakdown.reduce((s, e) => s + e.gainEur, 0);

  const firstDate =
    archived.length > 0
      ? archived.reduce(
          (min, p) => (p.createdAt < min ? p.createdAt : min),
          archived[0].createdAt
        )
      : new Date();
  const monthsSinceFirstPlan = Math.max(
    1,
    Math.ceil(
      (Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
  );
  const totalCostEur = monthsSinceFirstPlan * monthlyPriceEur;
  const roiMultiplier =
    totalCostEur > 0 ? Math.round((totalEuros / totalCostEur) * 10) / 10 : 0;

  return {
    totalEuros,
    monthsSinceFirstPlan,
    totalCostEur,
    roiMultiplier,
    breakdown,
  };
}
