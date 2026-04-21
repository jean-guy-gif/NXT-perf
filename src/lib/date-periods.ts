export type ComparisonPeriod = "mois" | "trimestre" | "semestre" | "annee";

export const COMPARISON_PERIOD_OPTIONS: Array<{
  value: ComparisonPeriod;
  label: string;
}> = [
  { value: "mois", label: "Mois" },
  { value: "trimestre", label: "Trimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "annee", label: "Année" },
];

export interface PeriodBounds {
  start: Date;
  end: Date;
  monthsInPeriod: number;
}

export function getPeriodBounds(
  period: ComparisonPeriod,
  now: Date = new Date()
): PeriodBounds {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  switch (period) {
    case "mois": {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, monthsInPeriod: 1 };
    }
    case "trimestre": {
      const quarterStart = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStart, 1, 0, 0, 0, 0);
      const end = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999);
      return { start, end, monthsInPeriod: 3 };
    }
    case "semestre": {
      const semesterStart = month < 6 ? 0 : 6;
      const start = new Date(year, semesterStart, 1, 0, 0, 0, 0);
      const end = new Date(year, semesterStart + 6, 0, 23, 59, 59, 999);
      return { start, end, monthsInPeriod: 6 };
    }
    case "annee": {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end, monthsInPeriod: 12 };
    }
  }
}

export function formatPeriodRange(bounds: PeriodBounds): string {
  const dayMonth = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  });
  const yearOnly = new Intl.DateTimeFormat("fr-FR", { year: "numeric" });
  return `${dayMonth.format(bounds.start)} → ${dayMonth.format(bounds.end)} ${yearOnly.format(bounds.end)}`;
}
