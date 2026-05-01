"use client";

import { CalendarCheck, Dumbbell, GraduationCap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** "plan" si plan actif, "none" si aucun plan */
  state: "plan" | "none";
}

export function ModalitesTuiles({ state }: Props) {
  const tiles = [
    {
      id: "plan",
      icon: CalendarCheck,
      title: "Plan 30 jours",
      desc:
        state === "plan"
          ? "Plan en cours, voir vos actions ci-dessous"
          : "Choisissez un levier pour lancer un plan ciblé",
      active: state === "plan",
      disabled: false,
    },
    {
      id: "entrainer",
      icon: Dumbbell,
      title: "M'entraîner",
      desc: "Exercices guidés pour ancrer les bonnes pratiques",
      active: false,
      disabled: true,
    },
    {
      id: "former",
      icon: GraduationCap,
      title: "Me former",
      desc: "Modules longs et certifiants à votre rythme",
      active: false,
      disabled: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              t.active
                ? "border-primary/40 bg-primary/5"
                : t.disabled
                  ? "border-border bg-muted/30 opacity-60"
                  : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  t.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {t.title}
                  {t.disabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" /> À venir
                    </span>
                  )}
                  {t.active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      En cours
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
