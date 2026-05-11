"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  HelpCircle,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyBrief } from "@/data/weekly-briefs";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  open: boolean;
  onClose: () => void;
  weekNumber: 1 | 2 | 3 | 4;
  weekFocus: string;
  /** Levier (ratio) — sert au fetch RAG /api/weekly-brief. */
  expertiseId: ExpertiseRatioId;
  /** Fiche fallback (hardcoded) — utilisée si fetch RAG échoue. */
  fallbackBrief?: WeeklyBrief | null;
}

/**
 * WeeklyBriefDrawer — fiche pédagogique de la semaine.
 *
 * Sous-PR Coach-1 : fetch lazy via /api/weekly-brief (RAG corpus NXT-Coach +
 * Claude Sonnet 4.5) au premier open, avec cache local par instance.
 * Fallback silencieux sur `fallbackBrief` si le RAG fail. Empty state
 * gracieux si tout fail.
 *
 * 3 panneaux :
 *   1. "Pourquoi ces 3 actions" — paragraphe `why3Actions`
 *   2. "Ce que font les meilleurs" — liste bullets `bestPractices`
 *   3. "L'erreur à éviter" — liste bullets `errorsToAvoid`
 */
export function WeeklyBriefDrawer({
  open,
  onClose,
  weekNumber,
  weekFocus,
  expertiseId,
  fallbackBrief,
}: Props) {
  const [brief, setBrief] = useState<WeeklyBrief | null>(fallbackBrief ?? null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

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

  // Fetch RAG lazy à l'ouverture (1 seule fois par instance)
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    setLoading(true);
    fetch("/api/weekly-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expertiseId,
        weekNumber,
        weekTheme: weekFocus,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { brief: WeeklyBrief | null };
        if (!cancelled && data.brief) {
          setBrief(data.brief);
        }
      })
      .catch((err) => {
        console.error("[weekly-brief-drawer] fetch failed", err);
        // fallbackBrief déjà dans le state — on garde
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, expertiseId, weekNumber, weekFocus]);

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
          {loading && !brief ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Le coach NXT prépare ta fiche...
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Génération en cours via le corpus NXT-Coach (méthode + livre Tedesco + sessions réelles).
              </p>
            </div>
          ) : brief ? (
            <div className="space-y-6">
              {/* Panneau 1 — Pourquoi ces 3 actions */}
              <section>
                <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Pourquoi ces 3 actions
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
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
            // Empty state — RAG fail + pas de fallback
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Fiche pédagogique indisponible
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Le coach NXT n&apos;a pas pu générer la fiche. Réessaie dans
                quelques instants.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
