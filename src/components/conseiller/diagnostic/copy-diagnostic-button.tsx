"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useAppStore } from "@/stores/app-store";
import { buildDiagnosticText } from "@/lib/diagnostic-export";

/**
 * Bouton « Copier mon diagnostic » — pièce centrale de l'option A.
 *
 * L'outil calcule le diagnostic (déterministe, aucune IA), le stagiaire colle
 * le texte dans son Claude / ChatGPT. Visible quel que soit l'état des flags
 * IA : c'est précisément le remplaçant de l'IA embarquée.
 */
export function CopyDiagnosticButton() {
  const { user, category } = useUser();
  const results = useResults();
  const { computedRatios, ratioConfigs } = useRatios();
  const agencyObjective = useAppStore((s) => s.agencyObjective);

  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  // Sans données de période, il n'y a rien à copier.
  if (!user || !results) return null;

  const buildText = () =>
    buildDiagnosticText({
      firstName: user.firstName,
      category,
      periodStart: results.periodStart,
      results,
      computedRatios,
      ratioConfigs,
      objective: agencyObjective,
    });

  const handleCopy = async () => {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission refusée…)
      // → on ouvre une modale avec le texte sélectionnable manuellement.
      setFallbackText(text);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copié ! Colle-le dans Claude ou ChatGPT
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copier mon diagnostic
          </>
        )}
      </button>

      {fallbackText !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setFallbackText(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Copier mon diagnostic"
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Copier mon diagnostic</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sélectionne tout le texte ci-dessous et colle-le dans Claude ou ChatGPT.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFallbackText(null)}
                aria-label="Fermer"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              readOnly
              value={fallbackText}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-[50vh] w-full flex-1 resize-none rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}
    </>
  );
}
