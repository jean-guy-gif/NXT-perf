"use client";

import { useEffect } from "react";
import {
  X,
  Target,
  HelpCircle,
  Sparkles,
  ArrowRightCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionContent } from "@/lib/coaching/action-brain";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * Contenu structuré (PR3.7.8) — prime sur `content` markdown si fourni.
   * Permet d'afficher 4 sections distinctes : Pourquoi / Best practices /
   * Action concrète / Erreur à éviter.
   */
  actionContent?: ActionContent | null;
  /**
   * Contenu markdown legacy (PR3.7.2) — fallback si actionContent absent.
   * Conservé pour backward compat (call-sites historiques).
   */
  content?: string;
  isPlaceholder?: boolean;
}

/**
 * ActionObjectiveDrawer — drawer slide-in droite (PR3.7 Q2=B).
 *
 * 2 modes d'affichage :
 *   - Si `actionContent` fourni → 4 sections structurées (Pourquoi /
 *     Ce que font les meilleurs / Action concrète / Erreur à éviter).
 *     Spécifique par action via action-brain (PR3.7.8).
 *   - Sinon → rendu markdown legacy (`content`) ou placeholder.
 *
 * Préserve le contexte de la page : l'utilisateur peut continuer à voir les
 * actions du plan derrière l'overlay.
 */
export function ActionObjectiveDrawer({
  open,
  onClose,
  title,
  actionContent,
  content,
  isPlaceholder = false,
}: Props) {
  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

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
        aria-label="Pourquoi cette action"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pourquoi cette action
              </p>
              <h2 className="mt-0.5 truncate text-lg font-bold text-foreground">
                {actionContent?.title ?? title}
              </h2>
            </div>
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
          {actionContent ? (
            <StructuredContent content={actionContent} />
          ) : isPlaceholder ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Cette fiche sera disponible prochainement.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Un script détaillé, un argumentaire type et des exemples
                concrets seront ajoutés ici pour t&apos;accompagner dans cette
                action.
              </p>
            </div>
          ) : content ? (
            <div
              className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Détails non disponibles pour cette action.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Rendu structuré 4 sections (PR3.7.8) ────────────────────────────────

function StructuredContent({ content }: { content: ActionContent }) {
  return (
    <div className="space-y-5">
      <Section icon={HelpCircle} iconClass="text-blue-500" title="Pourquoi cette action">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.why}
        </p>
      </Section>

      {content.bestPractices.length > 0 && (
        <Section
          icon={Sparkles}
          iconClass="text-emerald-500"
          title="Ce que font les meilleurs"
        >
          <ul className="space-y-2">
            {content.bestPractices.slice(0, 3).map((p, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {content.concreteStep && (
        <Section
          icon={ArrowRightCircle}
          iconClass="text-primary"
          title="Première action concrète"
        >
          <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {content.concreteStep}
          </p>
        </Section>
      )}

      {content.mistake && (
        <Section
          icon={AlertTriangle}
          iconClass="text-orange-500"
          title="L'erreur à éviter"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            {content.mistake}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </section>
  );
}

// Mini-rendu markdown simple (pas de lib externe) — préservé de ResourceModal
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, "<br /><br />");
}
