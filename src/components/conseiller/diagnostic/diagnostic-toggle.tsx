"use client";

import { cn } from "@/lib/utils";

export type DiagnosticView = "volumes" | "ratios" | "both";

const OPTIONS: { id: DiagnosticView; label: string }[] = [
  { id: "volumes", label: "Volumes" },
  { id: "ratios", label: "Ratios" },
  { id: "both", label: "Les deux" },
];

interface Props {
  value: DiagnosticView;
  onChange: (next: DiagnosticView) => void;
}

export function DiagnosticToggle({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Affichage volumes et ratios"
      className="flex w-fit gap-1 rounded-lg bg-muted p-1"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
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
