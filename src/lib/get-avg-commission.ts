import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";
import type { ProfileLevel } from "@/data/ratio-expertise";

const FALLBACK_AVG_COMMISSION = 8000;

export function getAvgCommissionEur(
  agencyObjectiveAvgActValue: number | null | undefined,
  userResults: PeriodResults[]
): number {
  if (agencyObjectiveAvgActValue && agencyObjectiveAvgActValue > 0) {
    return agencyObjectiveAvgActValue;
  }
  const last12 = [...userResults]
    .sort((a, b) => (b.periodEnd ?? b.periodStart).localeCompare(a.periodEnd ?? a.periodStart))
    .slice(0, 12);
  const sumCA = last12.reduce((s, p) => s + (p.ventes?.chiffreAffaires ?? 0), 0);
  const sumActes = last12.reduce((s, p) => s + (p.ventes?.actesSignes ?? 0), 0);
  if (sumCA > 0 && sumActes > 0) return sumCA / sumActes;
  return FALLBACK_AVG_COMMISSION;
}

export function deriveProfileLevel(category: UserCategory): ProfileLevel {
  if (category === "debutant") return "junior";
  if (category === "expert") return "expert";
  return "confirme";
}
