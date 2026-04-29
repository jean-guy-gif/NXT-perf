"use client";

import { useState } from "react";
import { CheckCircle2, Minus, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVal } from "@/components/dashboard/production-chain";
import type {
  ChainStep,
  ChainStepData,
  ChainRatioData,
} from "@/hooks/use-network-production-chain";
import type { Status, ViewMode } from "@/components/dashboard/production-chain";

/**
 * <NetworkProductionChain> — composant de PRÉSENTATION pur pour la chaîne de
 * production réseau (Vue Réseau v2.0 Phase 1 Task 4.1).
 *
 * Reçoit ses données EN PROPS (pas de hook interne sauf useState pour le
 * popover tooltip). Rend visuellement les 12 cartes (volumes) et/ou les
 * 7 ratios alignés sur le rendu du directeur <ProductionChain>.
 *
 * Contrairement au composant directeur, ne contient pas les panneaux
 * d'amélioration / plans 30j / drill-down (out-of-scope Phase 1).
 *
 * Couleurs de section :
 * - PROSPECTION    : bleu  (steps 1-4)
 * - TRANSFORMATION : violet (steps 5-9)
 * - RÉSULTAT       : vert  (steps 10-12)
 */

interface NetworkProductionChainProps {
  steps: ChainStepData[];
  ratios: ChainRatioData[];
  displayMode: ViewMode;
  /** Drill-down vers /reseau/volume-activite?step=... (Phase 2). */
  onStepClick?: (stepId: ChainStep) => void;
}

interface StatusConfig {
  borderClass: string;
  badgeBg: string;
  text: string;
  label: string;
  icon: typeof CheckCircle2;
  /** Tailwind class for progress bar fill (explicit, not CSS variable). */
  progressBg: string;
}

// Aligné avec STATUS_CONFIG de production-chain.tsx (dupliqué localement
// pour éviter de l'exporter et créer un couplage avec les imports lucide
// du composant directeur).
//
// Note : le directeur utilise CSS variables (`var(--success)` etc.). On
// préfère ici des classes Tailwind explicites pour éviter toute ambiguité
// de résolution des tokens et garantir des couleurs surperf=vert /
// stable=orange / sousperf=rouge cohérentes (Vue Réseau v2.0 fix 3).
const STATUS_CONFIG: Record<Status, StatusConfig> = {
  surperf: {
    borderClass: "border-2 border-green-500/40 hover:border-green-500/70",
    badgeBg: "bg-green-500/10",
    text: "text-green-500",
    label: "Surperf",
    icon: CheckCircle2,
    progressBg: "bg-green-500",
  },
  stable: {
    borderClass: "border-2 border-orange-500/40 hover:border-orange-500/70",
    badgeBg: "bg-orange-500/10",
    text: "text-orange-500",
    label: "Stable",
    icon: Minus,
    progressBg: "bg-orange-500",
  },
  sousperf: {
    borderClass: "border-2 border-red-500/40 hover:border-red-500/70",
    badgeBg: "bg-red-500/10",
    text: "text-red-500",
    label: "Sous-perf",
    icon: AlertTriangle,
    progressBg: "bg-red-500",
  },
};

interface SectionConfig {
  category: ChainStepData["category"];
  label: string;
  accentColor: string; // tailwind class, used on label
}

const SECTIONS: SectionConfig[] = [
  { category: "prospection",    label: "Prospection",    accentColor: "text-blue-500" },
  { category: "transformation", label: "Transformation", accentColor: "text-violet-500" },
  { category: "resultat",       label: "Résultat",       accentColor: "text-green-500" },
];

// Détermine l'unité d'affichage d'une étape pour formatVal.
function unitForStep(stepId: ChainStep): string | undefined {
  if (stepId === "exclusivite") return "%";
  if (stepId === "caCompromis" || stepId === "caActe") return "€";
  return undefined;
}

export function NetworkProductionChain({
  steps,
  ratios,
  displayMode,
  onStepClick,
}: NetworkProductionChainProps) {
  const showVolumes = displayMode === "volumes" || displayMode === "both";
  const showRatios = displayMode === "ratios" || displayMode === "both";

  return (
    <div className="space-y-6">
      {showVolumes &&
        SECTIONS.map((section) => {
          const sectionSteps = steps.filter((s) => s.category === section.category);
          if (sectionSteps.length === 0) return null;
          return (
            <section key={section.category}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className={cn("text-xs font-bold uppercase tracking-wider", section.accentColor)}>
                  {section.label}
                </h3>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 px-0.5">
                {sectionSteps.map((step) => (
                  <StepCard key={step.stepId} step={step} onClick={onStepClick} />
                ))}
              </div>
            </section>
          );
        })}

      {showRatios && ratios.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ratios de transformation
            </h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {ratios.map((ratio) => (
              <RatioRow key={ratio.num} ratio={ratio} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step card (12 cartes)
// ─────────────────────────────────────────────────────────────────────────────

interface StepCardProps {
  step: ChainStepData;
  onClick?: (stepId: ChainStep) => void;
}

function StepCard({ step, onClick }: StepCardProps) {
  const sc = STATUS_CONFIG[step.status];
  const StatusIcon = sc.icon;
  const unit = unitForStep(step.stepId);
  const ecartFormatted =
    step.ecart >= 0
      ? `+${formatVal(step.ecart, unit)}`
      : formatVal(step.ecart, unit);
  const progressPct = step.objectif > 0 ? Math.min(100, (step.realise / step.objectif) * 100) : 0;
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={() => onClick?.(step.stepId)}
      disabled={!isClickable}
      className={cn(
        "relative flex h-full w-[180px] shrink-0 flex-col rounded-xl bg-card p-3.5 text-left transition-colors",
        sc.borderClass,
        isClickable && "cursor-pointer hover:bg-muted/30",
        !isClickable && "cursor-default",
      )}
    >
      {/* Numéro + Status pill */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {String(step.stepNumber).padStart(2, "0")}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            sc.badgeBg,
            sc.text,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {sc.label}
        </span>
      </div>

      {/* Label + tooltip icon (caCompromis only) */}
      <div className="mb-2 flex items-start justify-between gap-1">
        <p className="text-xs font-semibold leading-snug text-foreground">{step.label}</p>
        {step.tooltip && <TooltipIcon text={step.tooltip} />}
      </div>

      {/* Valeur réalisée */}
      <span className="text-xl font-extrabold leading-none tracking-tight tabular-nums text-foreground">
        {formatVal(step.realise, unit)}
      </span>

      {/* Objectif + écart */}
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">obj. {formatVal(step.objectif, unit)}</span>
        <span className={cn("font-bold tabular-nums", sc.text)}>{ecartFormatted}</span>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/40">
        <div
          className={cn("h-full rounded-full transition-all duration-500", sc.progressBg)}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip Info icon (popover sur hover/clic) — utilisé sur la carte CA Compromis
// ─────────────────────────────────────────────────────────────────────────────

function TooltipIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation(); // Ne pas déclencher onStepClick de la carte
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }
        }}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Information"
      >
        <Info className="h-3.5 w-3.5" />
      </span>
      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-5 z-50 w-72 rounded-lg border border-border bg-popover p-3 text-[11px] font-normal leading-relaxed text-popover-foreground shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ratio row (7 ratios — affichage compact)
// ─────────────────────────────────────────────────────────────────────────────

interface RatioRowProps {
  ratio: ChainRatioData;
}

function RatioRow({ ratio }: RatioRowProps) {
  const sc = STATUS_CONFIG[ratio.status];
  const StatusIcon = sc.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums text-muted-foreground">
        {ratio.num}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{ratio.label}</p>
      </div>
      <div className="hidden shrink-0 sm:block">
        <p className="text-right text-sm font-bold tabular-nums text-foreground">
          {ratio.isLowerBetter ? ratio.realise.toFixed(1) : `${ratio.realise}%`}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            / {ratio.isLowerBetter ? ratio.objectif : `${ratio.objectif}%`}
          </span>
        </p>
        <p className="text-right text-[10px] text-muted-foreground">
          {ratio.realisePct}% vs objectif {ratio.objectifPct}%
        </p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
          sc.badgeBg,
          sc.text,
        )}
      >
        <StatusIcon className="h-3 w-3" />
        {sc.label}
      </span>
    </div>
  );
}
