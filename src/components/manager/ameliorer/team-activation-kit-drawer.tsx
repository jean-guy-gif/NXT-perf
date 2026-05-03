"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildKit,
  serializeKitToMarkdown,
  type KitKind,
} from "@/lib/coaching/team-activation-kit";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Kit à afficher. `null` = drawer fermé (mais on garde l'unmount-friendly). */
  kind: KitKind | null;
  expertiseId: ExpertiseRatioId | null;
}

/**
 * TeamActivationKitDrawer (PR3.8.6 follow-up).
 *
 * Drawer de droite affichant un des 3 kits prêts-à-utiliser pour le manager
 * (Réunion équipe / Mise en pratique / 4 points hebdo). Boutons :
 *   - "Copier le contenu" → navigator.clipboard
 *   - "Télécharger" → blob `.md` avec un nom de fichier slugifié
 *
 * Pattern d'overlay aligné sur `WhyDangerDrawer` (lock body scroll +
 * panneau slide-in, sans dépendance dialog tierce).
 */
export function TeamActivationKitDrawer({
  open,
  onClose,
  kind,
  expertiseId,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Reset copied feedback on kit change
  useEffect(() => {
    setCopied(false);
  }, [kind, expertiseId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const kit = useMemo(() => {
    if (!kind || !expertiseId) return null;
    return buildKit(kind, expertiseId);
  }, [kind, expertiseId]);

  const markdown = useMemo(() => (kit ? serializeKitToMarkdown(kit) : ""), [kit]);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Pas d'erreur visible : best-effort. Le bouton télécharger reste
      // disponible en fallback.
    }
  };

  const handleDownload = () => {
    if (!markdown || !kit) return;
    const slug = slugify(kit.title);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke après le tick courant pour laisser le browser écrire le fichier
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (!open || !kit) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={kit.title}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-dvh w-full flex-col bg-card shadow-2xl",
          "max-w-xl border-l border-border",
        )}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground">{kit.title}</h2>
            {kit.subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {kit.subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {kit.sections.map((section, i) => (
              <section key={i} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {section.heading}
                </h3>
                {section.paragraph && (
                  <p className="text-sm leading-relaxed text-foreground">
                    {section.paragraph}
                  </p>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-1.5">
                    {section.bullets.map((b, j) => (
                      <li
                        key={j}
                        className="flex gap-2 text-sm leading-relaxed text-foreground"
                      >
                        <span
                          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copier le contenu
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            Télécharger (.md)
          </button>
        </footer>
      </aside>
    </>
  );
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "kit";
}
