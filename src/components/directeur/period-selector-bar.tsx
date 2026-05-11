"use client";

import { PeriodSelector } from "@/components/ui/period-selector";
import { useDirecteurPeriod, type DirecteurPeriod } from "@/hooks/use-directeur-period";

const OPTIONS: Array<{ value: DirecteurPeriod; label: string }> = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

export function PeriodSelectorBar() {
  const { period, setPeriod } = useDirecteurPeriod();
  return <PeriodSelector options={OPTIONS} value={period} onChange={setPeriod} />;
}
