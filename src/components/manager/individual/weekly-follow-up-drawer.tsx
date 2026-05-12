"use client";

import { useEffect, useState } from "react";
import {
  X,
  Eye,
  HelpCircle,
  Target,
  MessageCircle,
  Loader2,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

/** Sous-PR Coach-9 : 4 points hebdo générés via RAG. */
interface WeeklyFollowUp {
  constat: string;
  difficulte: string;
  engagement: string;
  question: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Conseiller observé — au moins le prénom est requis. */
  advisor: {
    firstName: string;
    lastName?: string;
    level?: string;
  };
  /** Levier prioritaire détecté. Null si aucun. */
  expertiseId: ExpertiseRatioId | null;
  /** Métriques plan 30j actif — optionnel. */
  planMetrics?: {
    dayOfPlan: number;
    totalDays: number;
    donePct: number;
    doneActions: number;
    totalActions: number;
  };
  /** Date ISO dernière saisie — optionnel. */
  lastSaisieIso?: string | null;
  /** Ratio actuel sur le levier — optionnel. */
  ratioCurrent?: number | null;
  /** Ratio cible — optionnel. */
  ratioTarget?: number | null;
}

/**
 * WeeklyFollowUpDrawer — sous-PR Coach-9.
 *
 * Drawer affichant les 4 points hebdo générés via RAG pour le suivi
 * manager → conseiller. Voix Tedesco contextualisée au conseiller observé.
 *
 * 4 sections :
 *   1. Constat (factuel)
 *   2. Difficulté (hypothèse ouverte)
 *   3. Engagement (action proposée)
 *   4. Question ouverte (méthode NXT 71% Q ouvertes)
 *
 * Fetch lazy au premier open, cache local par instance.
 */
export function WeeklyFollowUpDrawer({
  open,
  onClose,
  advisor,
  expertiseId,
  planMetrics,
  lastSaisieIso,
  ratioCurrent,
  ratioTarget,
}: Props) {
  const [followUp, setFollowUp] = useState<WeeklyFollowUp | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

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

  // Fetch lazy au premier open
  useEffect(() => {
    if (!open || hasFetched) return;
    setHasFetched(true);
    let cancelled = false;
    setLoading(true);
    setFollowUp(null);
    fetch("/api/team-weekly-follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: advisor.firstName,
        level: advisor.level,
        expertiseId,
        planMetrics,
        lastSaisieIso,
        ratioCurrent,
        ratioTarget,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { followUp: WeeklyFollowUp | null };
        if (!cancelled) setFollowUp(data.followUp);
      })
      .catch((err) => {
        console.error("[weekly-follow-up-drawer] fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    hasFetched,
    advisor.firstName,
    advisor.level,
    expertiseId,
    planMetrics,
    lastSaisieIso,
    ratioCurrent,
    ratioTarget,
  ]);

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
        aria-label={`Suivi hebdo de ${advisor.firstName}`}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              <CalendarClock className="h-3.5 w-3.5" />
              Suivi hebdo
            </p>
            <h2 className="mt-1 text-base font-bold text-foreground">
              Avec {advisor.firstName}
              {advisor.lastName ? ` ${advisor.lastName}` : ""}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              4 points pour structurer votre face-à-face cette semaine
            </p>
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
          {loading && !followUp ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Le coach NXT prépare ton suivi...
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Génération contextualisée avec les ratios + plan + corpus NXT.
              </p>
            </div>
          ) : followUp ? (
            <div className="space-y-4">
              <FollowUpSection
                icon={Eye}
                iconClass="text-blue-600 dark:text-blue-400"
                title="1. Constat"
                content={followUp.constat}
              />
              <FollowUpSection
                icon={HelpCircle}
                iconClass="text-orange-600 dark:text-orange-400"
                title="2. Difficulté"
                content={followUp.difficulte}
              />
              <FollowUpSection
                icon={Target}
                iconClass="text-emerald-600 dark:text-emerald-400"
                title="3. Engagement"
                content={followUp.engagement}
                highlight
              />
              <FollowUpSection
                icon={MessageCircle}
                iconClass="text-indigo-600 dark:text-indigo-400"
                title="4. Question ouverte"
                content={followUp.question}
                italic
              />

              <div className="rounded-lg border border-indigo-200/50 bg-indigo-50/30 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Généré par le Coach NXT — méthode 71% questions ouvertes
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Suivi hebdo indisponible
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Le coach NXT n&apos;a pas pu générer le suivi. Réessaie dans
                quelques instants.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function FollowUpSection({
  icon: Icon,
  iconClass,
  title,
  content,
  highlight = false,
  italic = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  content: string;
  highlight?: boolean;
  italic?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        highlight
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-border bg-background",
      )}
    >
      <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
        {title}
      </h3>
      <p
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed text-foreground",
          italic && "italic",
        )}
      >
        {content}
      </p>
    </section>
  );
}
