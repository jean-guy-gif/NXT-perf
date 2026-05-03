"use client";

import { Lightbulb } from "lucide-react";
import { getTopPractices } from "@/lib/coaching/coach-brain";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface BestPracticesBlockProps {
  /** Levier prioritaire équipe — null si aucun. */
  expertiseId: ExpertiseRatioId | null;
  /** Label lisible du levier (utilisé en sous-titre). */
  leverLabel?: string;
  /** Nombre max de pratiques (default 3). */
  max?: number;
}

/**
 * Bloc "Ce que font les meilleurs" (PR3.8.3 — Manager Collectif).
 *
 * Réutilise `getTopPractices` (coach-brain) — déjà 3 bullets terrain par
 * levier dans `top-practices.ts`. Aucune duplication du contenu pédagogique.
 *
 * Côté Manager, le framing change (équipe, transmission, coaching) mais le
 * contenu des bullets reste le même : les pratiques terrain sont les mêmes
 * pour un conseiller que pour un manager qui veut les transmettre.
 */
export function BestPracticesBlock({
  expertiseId,
  leverLabel,
  max = 3,
}: BestPracticesBlockProps) {
  if (!expertiseId) return null;

  const practices = getTopPractices(expertiseId, max);
  if (practices.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Ce que font les meilleurs
          </h3>
          {leverLabel && (
            <p className="text-xs text-muted-foreground">
              À transmettre à votre équipe sur {leverLabel.toLowerCase()}
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {practices.map((practice, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:text-amber-400"
              aria-hidden
            >
              {i + 1}
            </span>
            <span>{practice}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
