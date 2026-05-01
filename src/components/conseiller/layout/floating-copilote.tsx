"use client";

import { useState, useEffect } from "react";
import { Bot, X, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingCopilote() {
  const [open, setOpen] = useState(false);
  const [alertRequested, setAlertRequested] = useState(false);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le Copilote"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      >
        <Bot className="h-6 w-6" />
      </button>

      {/* Drawer overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Copilote ambiant"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Copilote ambiant
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Bientôt disponible
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              Le Copilote pré-remplira votre saisie hebdomadaire et répondra à
              vos questions sur vos données en langage naturel.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Phase 4 du roadmap NXT Performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAlertRequested(true)}
            disabled={alertRequested}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              alertRequested
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <BellRing className="h-4 w-4" />
            {alertRequested
              ? "Vous serez prévenu·e"
              : "M'alerter quand c'est prêt"}
          </button>
        </div>
      </aside>
    </>
  );
}
