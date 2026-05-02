"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  archiving?: boolean;
}

/**
 * ChangeLeverConfirm — modal de confirmation pour le bouton "Changer de levier"
 * en mode plan-actif (PR3.7 Q3=A).
 *
 * Le plan en cours est archivé proprement (status=expired, archived_at=now)
 * et reste consultable dans Ma Progression.
 */
export function ChangeLeverConfirm({
  open,
  onCancel,
  onConfirm,
  archiving = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !archiving) onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, archiving, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!archiving) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Changer de levier ?
            </h2>
          </div>
          {!archiving && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Fermer"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Tu as déjà un plan en cours. Si tu changes de levier, ce plan sera{" "}
          <span className="font-semibold text-foreground">
            archivé et remplacé
          </span>{" "}
          par un nouveau. Tu pourras le retrouver dans Ma progression.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={archiving}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
              archiving && "cursor-not-allowed opacity-60"
            )}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={archiving}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600",
              archiving && "cursor-wait"
            )}
          >
            {archiving ? "Archivage…" : "Archiver et changer de levier"}
          </button>
        </div>
      </div>
    </div>
  );
}
