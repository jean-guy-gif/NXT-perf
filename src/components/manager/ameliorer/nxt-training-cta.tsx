"use client";

import { useEffect, useState } from "react";
import { GraduationCap, X } from "lucide-react";

/**
 * NxtTrainingCta — bouton + popup placeholder (PR3.8 follow-up).
 *
 * V1 : la route NXT Training n'existe pas encore. Ce CTA ouvre un message
 * "Module bientôt disponible" plutôt que de naviguer vers une 404.
 */
export function NxtTrainingCta() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Entraîner vos équipes sur NXT Training
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Module NXT Training"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Module NXT Training bientôt disponible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Vos équipes pourront s&apos;entraîner sur des parcours
              interactifs ciblés sur le levier prioritaire — modules
              progressifs, cas réels, jeux de rôle. Disponible dans une
              prochaine livraison.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Compris
            </button>
          </div>
        </>
      )}
    </>
  );
}
