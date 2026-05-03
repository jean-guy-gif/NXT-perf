"use client";

import { Calendar, Dumbbell, LineChart, PlayCircle } from "lucide-react";

interface Step {
  icon: typeof Calendar;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Calendar,
    title: "Réunion équipe",
    description: "Expliquer le levier prioritaire et pourquoi il fait perdre du CA.",
  },
  {
    icon: Dumbbell,
    title: "Mise en pratique",
    description: "Jeu de rôle ou mise en situation terrain sur les actions clés.",
  },
  {
    icon: LineChart,
    title: "Suivi hebdo",
    description: "Point hebdomadaire rapide pour suivre la progression et débriefer.",
  },
];

/**
 * Bloc "Comment l'activer concrètement" (PR3.8.4 — Manager Collectif).
 *
 * 3 étapes génériques d'activation d'un plan d'équipe — indépendantes du
 * levier sélectionné. Lisible en 5 secondes.
 */
export function TeamActivationSteps() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <PlayCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Comment l&apos;activer concrètement
        </h3>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
