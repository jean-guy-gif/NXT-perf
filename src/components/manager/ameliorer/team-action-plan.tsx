"use client";

import { useState } from "react";
import { CheckCircle2, ListChecks, Rocket } from "lucide-react";
import { getTeamActions } from "@/lib/coaching/coach-brain";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface TeamActionPlanProps {
  expertiseId: ExpertiseRatioId;
  leverLabel: string;
  /** Nombre max d'actions affichées (default 3). */
  max?: number;
  /**
   * Callback déclenché au clic "Lancer ce plan avec mon équipe". Permet à
   * la page d'activer l'affichage du bloc "Tout est prêt pour animer..."
   * (PR3.8 follow-up — gating supports d'animation).
   */
  onPlanStarted?: () => void;
}

/**
 * Bloc "Plan d'action équipe" (PR3.8.4 — Manager Collectif).
 *
 * Source : `getTeamActions` (coach-brain) — fallback automatique sur
 * `getTopPractices` si pas d'entrée TEAM_ACTIONS.
 *
 * CTA "Lancer ce plan avec mon équipe" : V1 toast/log placeholder. Le vrai
 * système (création d'un plan partagé, distribution aux conseillers, suivi
 * hebdo) sera livré plus tard.
 */
export function TeamActionPlan({
  expertiseId,
  leverLabel,
  max = 3,
  onPlanStarted,
}: TeamActionPlanProps) {
  const actions = getTeamActions(expertiseId, max);
  const [launched, setLaunched] = useState(false);

  const handleLaunch = () => {
    // V1 placeholder — log + feedback visuel. Le vrai système (plan partagé
    // en BDD, distribution aux conseillers, suivi hebdo) viendra plus tard.
    console.info("[manager/ameliorer] launch team plan", {
      expertiseId,
      leverLabel,
      actions,
    });
    setLaunched(true);
    window.setTimeout(() => setLaunched(false), 4000);
    onPlanStarted?.();
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">
            Plan d&apos;action pour votre équipe
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Objectif : améliorer{" "}
            <span className="font-semibold text-foreground">{leverLabel}</span>{" "}
            sur l&apos;ensemble de l&apos;équipe.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {actions.map((action, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-lg border border-border bg-background px-4 py-3"
          >
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-foreground">
              {action}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleLaunch}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Rocket className="h-4 w-4" />
          Lancer ce plan avec mon équipe
        </button>

        {launched && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-500"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Plan envoyé à votre équipe (V1 — démo)
          </span>
        )}
      </div>
    </div>
  );
}
