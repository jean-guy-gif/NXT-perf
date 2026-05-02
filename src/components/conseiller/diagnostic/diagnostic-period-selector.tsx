"use client";

import { cn } from "@/lib/utils";

export type DiagnosticPeriod =
  | "semaine"
  | "mois"
  | "trimestre"
  | "annee"
  | "depuis_debut"
  | "personnalise";

const OPTIONS: {
  id: DiagnosticPeriod;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}[] = [
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "trimestre", label: "Trimestre" },
  { id: "annee", label: "Année" },
  { id: "depuis_debut", label: "Depuis début" },
  {
    id: "personnalise",
    label: "Personnalisé",
    disabled: true,
    tooltip: "Sélecteur de plage personnalisée bientôt disponible",
  },
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
      {OPTIONS.map((opt) => {
        const isActive = value === opt.id;
        if (opt.disabled) {
          return (
            <span
              key={opt.id}
              role="tab"
              aria-disabled="true"
              aria-selected={false}
              title={opt.tooltip}
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground/60"
            >
              {opt.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                À venir
              </span>
            </span>
          );
        }
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
