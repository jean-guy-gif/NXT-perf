"use client";

import { useMemo } from "react";
import { Sparkles, Send, Eye } from "lucide-react";
import { getTopPractices } from "@/lib/coaching/coach-brain";
import type { DirectionPainPoint } from "@/lib/director/aggregate-pain-points-direction";

interface TopPracticesDirectionProps {
  pain: DirectionPainPoint;
}

export function TopPracticesDirection({ pain }: TopPracticesDirectionProps) {
  // Hybride coach_brain + fallback (Q-D1.7) — façade getTopPractices cascade
  // TOP_PRACTICES → split bestPractices narratif → paragraphe brut.
  const practices = useMemo(
    () => getTopPractices(pain.expertiseId, 3),
    [pain.expertiseId],
  );

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        <Sparkles className="h-3.5 w-3.5" />
        Ce que font les meilleures équipes du réseau
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Sur le levier{" "}
        <span className="font-semibold text-foreground">
          {pain.expertise.label}
        </span>
      </p>

      {practices.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucune pratique catalogue pour ce levier. Contactez votre Coach NXT.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {practices.map((practice, idx) => (
            <li
              key={idx}
              className="flex gap-3 rounded-lg border border-indigo-200/60 bg-card p-3 text-sm text-foreground dark:border-indigo-900/40"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {idx + 1}
              </span>
              <span>{practice}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <Send className="h-3.5 w-3.5" />
          Diffuser à mes managers
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir l&apos;équipe modèle
        </button>
      </div>
    </section>
  );
}
