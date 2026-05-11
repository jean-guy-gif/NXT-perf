"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyBrief } from "@/data/weekly-briefs";

interface Props {
  open: boolean;
  onClose: () => void;
  weekNumber: 1 | 2 | 3 | 4;
  weekFocus: string;
  /** Fiche pédagogique pour ce (ratio, semaine). `null` → empty state. */
  brief: WeeklyBrief | null;
}

/**
 * WeeklyBriefDrawer — sous-PR 1 refonte plan 30j.
 *
 * Drawer slide-in droite (max-w-md) ouvert au click du badge "Voir la
 * fiche" du header `<WeekCard>`. Affiche la fiche pédagogique de la
 * SEMAINE (pas de l'action).
 *
 * 3 panneaux :
 *   1. "Pourquoi ces 3 actions" — paragraphe `why3Actions`
 *   2. "Ce que font les meilleurs" — liste bullets `bestPractices`
 *   3. "L'erreur à éviter" — liste bullets `errorsToAvoid`
 *
 * Empty state gracieux si `brief === null` (fiche pas encore rédigée —
 * la sous-PR 2 enrichira les 32 fiches).
 *
 * Pattern visuel inspiré d'`ActionObjectiveDrawer` (chantier B) mais avec
 * sémantique semaine (et plus action). `ActionObjectiveDrawer` reste
 * vivant dans le repo mais n'est plus consommé par cette page.
 */
export function WeeklyBriefDrawer({
  open,
  onClose,
  weekNumber,
  weekFocus,
  brief,
}: Props) {
  // Body scroll lock + Esc to close
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche pédagogique semaine ${weekNumber} : ${weekFocus}`}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Fiche semaine {weekNumber}
            </p>
            <h2 className="mt-1 text-base font-bold text-foreground">
              {weekFocus}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {brief ? (
            <div className="space-y-6">
              {/* Panneau 1 — Pourquoi ces 3 actions */}
              <section>
                <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Pourquoi ces 3 actions
                </h3>
                <p className="text-sm leading-relaxed text-foreground">
                  {brief.why3Actions}
                </p>
              </section>

              {/* Panneau 2 — Ce que font les meilleurs */}
              <section>
                <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Ce que font les meilleurs
                </h3>
                <ul className="space-y-2 text-sm text-foreground">
                  {brief.bestPractices.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Panneau 3 — L'erreur à éviter */}
              <section>
                <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  L&apos;erreur à éviter
                </h3>
                <ul className="space-y-2 text-sm text-foreground">
                  {brief.errorsToAvoid.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                        aria-hidden
                      />
                      <span className="leading-relaxed">{e}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            // Empty state — fiche pas encore rédigée (sous-PR 2 enrichira)
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Fiche pédagogique en cours de rédaction
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Le contenu pédagogique de cette semaine pour ce levier sera
                disponible prochainement.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
