import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";

/**
 * Calculate dynamic profile (Junior/Confirmé/Expert) based on 3 rolling months.
 * Compares average ratios against category thresholds.
 */
export function calculateDynamicProfile(
  results: PeriodResults[],
  fallback: UserCategory = "debutant",
): UserCategory {
  // Need at least 1 month of data
  if (results.length === 0) return fallback;

  // Filter to last 3 complete months
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recent = results.filter((r) => new Date(r.periodStart) >= threeMonthsAgo);
  if (recent.length === 0) return fallback;

  // Average metrics across recent results
  const count = recent.length;
  const avgEstimations = recent.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0) / count;
  const avgMandats = recent.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0) / count;
  const avgVisites = recent.reduce((s, r) => s + r.acheteurs.nombreVisites, 0) / count;
  const avgOffres = recent.reduce((s, r) => s + r.acheteurs.offresRecues, 0) / count;
  const avgCompromis = recent.reduce((s, r) => s + r.acheteurs.compromisSignes, 0) / count;
  const avgActes = recent.reduce((s, r) => s + r.ventes.actesSignes, 0) / count;
  const avgCA = recent.reduce((s, r) => s + r.ventes.chiffreAffaires, 0) / count;

  // Calculate exclusivité
  const totalMandats = recent.reduce((s, r) => s + r.vendeurs.mandats.length, 0);
  const totalExclu = recent.reduce((s, r) => s + r.vendeurs.mandats.filter((m) => m.type === "exclusif").length, 0);
  const avgExclu = totalMandats > 0 ? (totalExclu / totalMandats) * 100 : 0;

  // Score each category: how many thresholds are met
  function scoreCategory(cat: UserCategory): number {
    const obj = CATEGORY_OBJECTIVES[cat];
    let met = 0;
    if (avgEstimations >= obj.estimations) met++;
    if (avgMandats >= obj.mandats) met++;
    if (avgExclu >= obj.exclusivite) met++;
    if (avgVisites >= obj.visites) met++;
    if (avgOffres >= obj.offres) met++;
    if (avgCompromis >= obj.compromis) met++;
    if (avgActes >= obj.actes) met++;
    if (avgCA >= obj.ca) met++;
    return met;
  }

  const scores: [UserCategory, number][] = [
    ["expert", scoreCategory("expert")],
    ["confirme", scoreCategory("confirme")],
    ["debutant", scoreCategory("debutant")],
  ];

  // Expert if ≥5/8 expert thresholds met
  if (scores[0][1] >= 5) return "expert";
  // Confirmé if ≥5/8 confirmé thresholds met
  if (scores[1][1] >= 5) return "confirme";
  // Otherwise junior
  return "debutant";
}
