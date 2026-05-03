"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildKit,
  buildSlidesFromKit,
  serializeKitToMarkdown,
  type KitKind,
  type Slide,
} from "@/lib/coaching/team-activation-kit";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  open: boolean;
  onClose: () => void;
  kind: KitKind | null;
  expertiseId: ExpertiseRatioId | null;
}

/**
 * TeamActivationSlides (PR3.8.6 follow-up #2).
 *
 * Mode présentation plein écran d'un kit. Remplace le drawer documentaire
 * pour rendre le contenu directement utilisable en réunion.
 *
 * UX :
 *   - Header : titre du kit + badge levier + bouton fermer
 *   - Body   : 1 slide centrée (variant title vs content)
 *   - Footer : prev / 1-N indicator / next + boutons secondaires
 *              (Copier le contenu / Télécharger .md)
 *
 * Navigation :
 *   - flèche droite / Espace → suivant
 *   - flèche gauche → précédent
 *   - Escape → fermer
 *   - clic backdrop → fermer
 */
export function TeamActivationSlides({
  open,
  onClose,
  kind,
  expertiseId,
}: Props) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const kit = useMemo(() => {
    if (!kind || !expertiseId) return null;
    return buildKit(kind, expertiseId);
  }, [kind, expertiseId]);

  const slides = useMemo<Slide[]>(
    () => (kit ? buildSlidesFromKit(kit) : []),
    [kit],
  );

  const leverLabel = useMemo(() => {
    if (!expertiseId) return null;
    return RATIO_EXPERTISE[expertiseId]?.label ?? expertiseId;
  }, [expertiseId]);

  const markdown = useMemo(
    () => (kit ? serializeKitToMarkdown(kit) : ""),
    [kit],
  );

  // Reset state when kit changes / drawer reopens
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setCopied(false);
  }, [open, kind, expertiseId]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const goNext = useCallback(() => {
    setIndex((i) => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goNext, goPrev]);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Best-effort. Fallback : bouton télécharger.
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
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  if (!open || !kit || slides.length === 0) return null;

  const slide = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kit.title}
        className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-4 sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 sm:px-8 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {kit.title}
            </h2>
            {leverLabel && (
              <span className="hidden shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
                {leverLabel}
              </span>
            )}
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

        {/* Slide body */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8 sm:px-12 sm:py-12">
          <SlideContent slide={slide} />
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              aria-label="Slide précédente"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-sm font-medium tabular-nums text-muted-foreground">
              {index + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={isLast}
              aria-label="Slide suivante"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              .md
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

// ─── Slide rendering ──────────────────────────────────────────────────────

function SlideContent({ slide }: { slide: Slide }) {
  if (slide.variant === "title") {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-3xl font-bold text-foreground sm:text-5xl">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="mt-6 text-balance text-lg text-muted-foreground sm:text-xl">
            {slide.subtitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h2 className="mb-6 text-balance text-2xl font-bold text-foreground sm:text-3xl">
        {slide.title}
      </h2>

      {slide.highlight && (
        <blockquote
          className={cn(
            "mb-6 rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3",
            "text-balance text-base italic leading-relaxed text-foreground sm:text-lg",
          )}
        >
          {slide.highlight}
        </blockquote>
      )}

      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="space-y-3">
          {slide.bullets.map((b, i) => (
            <li
              key={i}
              className="flex gap-3 text-base leading-relaxed text-foreground sm:text-lg"
            >
              <span
                className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary sm:mt-2.5 sm:h-2.5 sm:w-2.5"
                aria-hidden
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "kit"
  );
}
