"use client";

import { cn } from "@/lib/utils";

export type DiagnosticPeriod =
  | "semaine"
  | "mois"
  | "trimestre"
  | "annee"
  | "depuis_debut"
  | "personnalise";

const OPTIONS: { id: DiagnosticPeriod; label: string }[] = [
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "trimestre", label: "Trimestre" },
  { id: "annee", label: "Année" },
  { id: "depuis_debut", label: "Depuis début" },
  { id: "personnalise", label: "Personnalisé" },
];

interface Props {
  value: DiagnosticPeriod;
  onChange: (next: DiagnosticPeriod) => void;
}

export function DiagnosticPeriodSelector({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Période d'analyse"
      className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
