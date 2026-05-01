"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  X,
  AlertTriangle,
  Calculator,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Source de vérité — fournie depuis la page Diagnostic */
  verdict: PainPointResult | null;
  /** Liste des autres points (pour le mode "Voir les autres points") */
  otherPainPoints?: PainPointResult[];
  /** Mode d'ouverture : "single" (verdict seul) ou "list" (liste autres points) */
  mode?: "single" | "list";
}

type Section = "why" | "how" | "best";

export function WhyDangerDrawer({
  open,
  onClose,
  verdict,
  otherPainPoints = [],
  mode = "single",
}: Props) {
  const [active, setActive] = useState<Section | null>("why");

  // Lock body scroll
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
        aria-label="Détail du point critique"
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {mode === "list" ? "Autres points en danger" : "Point critique"}
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-foreground">
              {mode === "list" || !verdict
                ? "Liste des leviers"
                : RATIO_EXPERTISE[verdict.expertiseId]?.label}
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
          {mode === "list" ? (
            <OtherPainPointsList items={otherPainPoints} onClose={onClose} />
          ) : verdict ? (
            <SinglePanels
              expertiseId={verdict.expertiseId}
              active={active}
              setActive={setActive}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun point critique détecté ce mois-ci.
            </p>
          )}
        </div>

        {mode === "single" && verdict && (
          <footer className="border-t border-border px-5 py-4">
            <Link
              href={`/conseiller/ameliorer?levier=${verdict.expertiseId}`}
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Améliorer ce point
              <ArrowRight className="h-4 w-4" />
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}

function SinglePanels({
  expertiseId,
  active,
  setActive,
}: {
  expertiseId: ExpertiseRatioId;
  active: Section | null;
  setActive: (s: Section | null) => void;
}) {
  const expertise = RATIO_EXPERTISE[expertiseId];

  return (
    <div className="space-y-2">
      <Panel
        id="why"
        active={active === "why"}
        onToggle={() => setActive(active === "why" ? null : "why")}
        icon={AlertTriangle}
        iconClass="text-red-500"
        title="Pourquoi c'est en danger"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {expertise.diagnosis}
        </p>
        {expertise.commonCauses.length > 0 && (
          <ul className="mt-3 space-y-2">
            {expertise.commonCauses.map((cause, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500/60" />
                {cause}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        id="how"
        active={active === "how"}
        onToggle={() => setActive(active === "how" ? null : "how")}
        icon={Calculator}
        iconClass="text-blue-500"
        title="Comment c'est calculé"
      >
        <p className="text-sm font-mono text-foreground">
          {expertise.formula}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Direction :{" "}
          {expertise.direction === "less_is_better"
            ? "plus c'est bas, mieux c'est"
            : "plus c'est haut, mieux c'est"}
        </p>
      </Panel>

      <Panel
        id="best"
        active={active === "best"}
        onToggle={() => setActive(active === "best" ? null : "best")}
        icon={Sparkles}
        iconClass="text-emerald-500"
        title="Ce que font les meilleurs"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {expertise.bestPractices}
        </p>
      </Panel>
    </div>
  );
}

function Panel({
  active,
  onToggle,
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  id: Section;
  active: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={active}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            active && "rotate-180"
          )}
        />
      </button>
      {active && (
        <div className="border-t border-border px-4 py-4">{children}</div>
      )}
    </div>
  );
}

function OtherPainPointsList({
  items,
  onClose,
}: {
  items: PainPointResult[];
  onClose: () => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun autre point en danger détecté.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((p) => {
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
  );
}

// Map a RatioId (legacy) to an ExpertiseRatioId for callers who already have a RatioId.
export function ratioIdToExpertiseId(
  ratioId: keyof typeof RATIO_ID_TO_EXPERTISE_ID
): ExpertiseRatioId | null {
  return RATIO_ID_TO_EXPERTISE_ID[ratioId];
}
