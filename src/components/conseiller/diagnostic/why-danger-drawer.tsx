"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Liste des autres points en danger (top exclu) */
  otherPainPoints: PainPointResult[];
}

export function WhyDangerDrawer({ open, onClose, otherPainPoints }: Props) {
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
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label="Autres points en danger"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Autres leviers
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-foreground">
              Points en danger
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {otherPainPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun autre point en danger détecté.
            </p>
          ) : (
            <ul className="space-y-2">
              {otherPainPoints.map((p) => {
                const expertise = RATIO_EXPERTISE[p.expertiseId];
                const gapPct = Math.round((p.normalizedGap || 0) * 100);
                return (
                  <li key={p.expertiseId}>
                    <Link
                      href={`/conseiller/ameliorer?levier=${p.expertiseId}`}
                      onClick={onClose}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {expertise.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Écart : -{gapPct}% · Gain potentiel ~
                          {Math.round(p.estimatedCaLossEur).toLocaleString("fr-FR")} €
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
