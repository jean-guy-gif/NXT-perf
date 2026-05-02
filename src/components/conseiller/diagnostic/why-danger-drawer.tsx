"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  X,
  ArrowRight,
  AlertTriangle,
  Calculator,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { CriticitePoint, VolumeKey } from "@/lib/diagnostic-criticite";
import {
  getTopPractices,
  volumeToRelatedRatio,
} from "@/lib/coaching/coach-brain";

type DrawerMode = "single" | "list";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: DrawerMode;
  /** Requis si mode === "single" */
  verdict?: CriticitePoint | null;
  /** Requis si mode === "list" — ratios + volumes (top exclu) */
  otherPainPoints?: CriticitePoint[];
}

// ─── Helpers partagés ────────────────────────────────────────────────────

function pointHref(p: CriticitePoint): string {
  if (p.type === "ratio") {
    return `/conseiller/diagnostic?view=ratios&highlight=${encodeURIComponent(p.id)}`;
  }
  return `/conseiller/diagnostic?view=volumes&highlight=${encodeURIComponent(p.id)}`;
}

function pointLabel(p: CriticitePoint): string {
  if (p.type === "ratio") {
    return RATIO_EXPERTISE[p.id as ExpertiseRatioId]?.label ?? p.label;
  }
  return p.label;
}

function pointGap(p: CriticitePoint): number {
  if (p.type === "ratio") {
    return Math.round((p._ratio.normalizedGap || 0) * 100);
  }
  if (p.target <= 0) return 0;
  return Math.round(Math.max(0, ((p.target - p.current) / p.target) * 100));
}

// ─── Component principal ─────────────────────────────────────────────────

export function WhyDangerDrawer({
  open,
  onClose,
  mode,
  verdict,
  otherPainPoints = [],
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
        aria-label={mode === "single" ? "Détail du point critique" : "Autres points en danger"}
        aria-hidden={!open}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <DrawerHeader mode={mode} verdict={verdict ?? null} onClose={onClose} />

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {mode === "single" ? (
            verdict ? (
              <SingleContent verdict={verdict} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun point critique détecté.
              </p>
            )
          ) : (
            <OtherPainPointsList
              items={otherPainPoints}
              onClose={onClose}
            />
          )}
        </div>

        {mode === "single" && verdict && (
          <SingleFooter verdict={verdict} onClose={onClose} />
        )}
      </aside>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function DrawerHeader({
  mode,
  verdict,
  onClose,
}: {
  mode: DrawerMode;
  verdict: CriticitePoint | null;
  onClose: () => void;
}) {
  if (mode === "list" || !verdict) {
    return (
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Autres leviers
          </p>
          <h2 className="mt-1 truncate text-lg font-bold text-foreground">
            Points en danger
          </h2>
        </div>
        <CloseBtn onClose={onClose} />
      </header>
    );
  }

  const kind = verdict.type === "ratio" ? "Ratio" : "Volume";
  const isPercent = verdict.type === "ratio" && verdict.id === "pct_exclusivite";
  const formatVal = (v: number) =>
    verdict.type === "ratio"
      ? isPercent
        ? `${Math.round(v)} %`
        : v.toFixed(1)
      : Math.round(v).toString();
  const currentVal =
    verdict.type === "ratio" ? verdict.currentValue : verdict.current;
  const targetVal =
    verdict.type === "ratio" ? verdict.targetValue : verdict.target;

  return (
    <header className="border-b border-border px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {kind} en danger
          </p>
          <h2 className="mt-1 truncate text-lg font-bold text-foreground">
            {pointLabel(verdict)}
          </h2>
        </div>
        <CloseBtn onClose={onClose} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-muted-foreground">{verdict.type === "ratio" ? "Ratio" : "Réalisé"}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
            {formatVal(currentVal)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-muted-foreground">Cible</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
            {formatVal(targetVal)}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2">
          <p className="text-emerald-600 dark:text-emerald-500">Gain potentiel</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
            +{formatCurrency(Math.round(verdict.gainEur))}
          </p>
        </div>
      </div>
    </header>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fermer"
      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

// ─── Single content (3 panneaux pédagogiques pour ratios) ───────────────

type Section = "why" | "how" | "best";

function SingleContent({ verdict }: { verdict: CriticitePoint }) {
  const [active, setActive] = useState<Section | null>("why");

  // PR3.7.5 — Volumes : on dérive le ratio le plus pertinent via
  // volumeToRelatedRatio et on affiche les 3 panneaux pédagogiques de ce
  // ratio (au lieu du placeholder V1). Cohérent avec le levier recommandé
  // qui sera proposé sur /conseiller/ameliorer.
  let resolvedExpertiseId: ExpertiseRatioId;
  let volumeContext: { gap: number } | null = null;
  if (verdict.type === "volume") {
    const mapped = volumeToRelatedRatio(verdict.id as VolumeKey);
    if (!mapped) {
      const gap = pointGap(verdict);
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Volume sous l'objectif
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              Vous êtes <span className="font-bold text-red-500">{gap}%</span>{" "}
              sous l'objectif sur ce volume.
            </p>
          </div>
        </div>
      );
    }
    resolvedExpertiseId = mapped;
    volumeContext = { gap: pointGap(verdict) };
  } else {
    resolvedExpertiseId = verdict.id as ExpertiseRatioId;
  }

  const expertise = RATIO_EXPERTISE[resolvedExpertiseId];
  if (!expertise) {
    return (
      <p className="text-sm text-muted-foreground">
        Détails non disponibles pour ce ratio.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {volumeContext && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
            Volume sous l'objectif — levier d'action
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Tu es <span className="font-bold text-red-500">{volumeContext.gap}%</span>{" "}
            sous l'objectif sur ce volume. Le levier{" "}
            <span className="font-semibold text-foreground">
              {expertise.label}
            </span>{" "}
            est le plus directement actionnable pour le faire bouger.
          </p>
        </div>
      )}

      <Panel
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
        {expertise.caImpactNote && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Impact CA : </span>
            {expertise.caImpactNote}
          </p>
        )}
      </Panel>

      <Panel
        active={active === "best"}
        onToggle={() => setActive(active === "best" ? null : "best")}
        icon={Sparkles}
        iconClass="text-emerald-500"
        title="Ce que font les meilleurs"
      >
        <BestPracticesContent expertiseId={resolvedExpertiseId} />
      </Panel>
    </div>
  );
}

/**
 * Affiche les top pratiques d'un levier via le coach-brain.
 * - 1 seul item retourné → rendu en paragraphe (cas fallback narratif).
 * - 2-3 items → rendu en liste à puces.
 * - 0 item → message neutre (cas extrême, ne devrait jamais arriver).
 */
function BestPracticesContent({ expertiseId }: { expertiseId: ExpertiseRatioId }) {
  const practices = getTopPractices(expertiseId, 3);

  if (practices.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Pratiques terrain non disponibles pour ce levier.
      </p>
    );
  }

  if (practices.length === 1) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {practices[0]}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {practices.map((p, i) => (
        <li
          key={i}
          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
          {p}
        </li>
      ))}
    </ul>
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

// ─── Single footer (2 boutons) ───────────────────────────────────────────

function SingleFooter({
  verdict,
  onClose,
}: {
  verdict: CriticitePoint;
  onClose: () => void;
}) {
  const ameliorerHref = `/conseiller/ameliorer?levier=${encodeURIComponent(verdict.id)}`;
  const seeAllHref =
    verdict.type === "ratio"
      ? `/conseiller/diagnostic?view=ratios&highlight=${encodeURIComponent(verdict.id)}`
      : `/conseiller/diagnostic?view=volumes&highlight=${encodeURIComponent(verdict.id)}`;
  const seeAllLabel =
    verdict.type === "ratio" ? "Voir tous mes ratios" : "Voir tous mes volumes";

  return (
    <footer className="space-y-2 border-t border-border px-5 py-4">
      <Link
        href={ameliorerHref}
        onClick={onClose}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Améliorer ce point
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href={seeAllHref}
        onClick={onClose}
        className="inline-flex w-full items-center justify-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {seeAllLabel} →
      </Link>
    </footer>
  );
}

// ─── Liste des autres points (mode list — PR3.5 préservé exact) ─────────

function OtherPainPointsList({
  items,
  onClose,
}: {
  items: CriticitePoint[];
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
        const gap = pointGap(p);
        const kind = p.type === "ratio" ? "Ratio" : "Volume";
        return (
          <li key={`${p.type}:${p.id}`}>
            <Link
              href={pointHref(p)}
              onClick={onClose}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {kind}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {pointLabel(p)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Écart : -{gap}% · Gain potentiel ~
                  {Math.round(p.gainEur).toLocaleString("fr-FR")} €
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
