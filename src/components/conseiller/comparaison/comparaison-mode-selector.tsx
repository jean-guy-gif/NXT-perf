"use client";

import { Users, Award, Trophy, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompareMode = "confrere" | "profil" | "classement" | "dpi";

const MODES: {
  id: CompareMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "confrere", label: "Vs un confrère", icon: Users },
  { id: "profil", label: "Vs un profil expert", icon: Award },
  { id: "classement", label: "Classement NXT", icon: Trophy },
  { id: "dpi", label: "Vs un DPI", icon: Activity },
];

interface Props {
  value: CompareMode;
  onChange: (next: CompareMode) => void;
}

export function ComparaisonModeSelector({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Mode de comparaison"
      className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
