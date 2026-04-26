"use client";

import { Info, Target, Check, AlertTriangle, X, Hourglass } from "lucide-react";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import {
  RATIO_PERCENT_LABELS,
  formatRatioObjectiveValue,
  formatRatioCurrentValue,
} from "@/lib/ratio-labels";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";

const statusConfig = {
  ok: {
    icon: Check,
    label: "Conforme",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  danger: {
    icon: X,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

interface ManagerRatioCardProps {
  ratio: ComputedRatio;
  config: RatioConfig;
  viewMode: "chiffres" | "pourcentages";
  isTeamMode: boolean;
  /** Label affiché pour le seuil (ex: "Confirmé" pour conseiller, "Confirmé (référence équipe)" en mode team) */
  thresholdLabel: string;
  onSelect: () => void;
  /** Bouton "Améliorer ce ratio" + bloc expandable, fourni par le parent en mode individual uniquement */
  improveSection?: React.ReactNode;
}

export function ManagerRatioCard({
  ratio,
  config,
  viewMode,
  isTeamMode,
  thresholdLabel,
  onSelect,
  improveSection,
}: ManagerRatioCardProps) {
  const sc = statusConfig[ratio.status];
  const StatusIcon = sc.icon;

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      {/* Performance badge — placeholder mode individuel uniquement */}
      {!isTeamMode && (
        <div
          className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground/60"
          title="Badge — bientôt disponible"
        >
          <Hourglass className="h-3 w-3" />
          Badge bientôt
        </div>
      )}

      {/* Header: name + tooltip + status badge top-right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {viewMode === "pourcentages"
              ? RATIO_PERCENT_LABELS[ratio.ratioId as RatioId] ?? config.name
              : config.name}
          </p>
          <span
            data-tooltip-id="manager-ratio-tooltip"
            data-tooltip-content={config.description}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
          </span>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            sc.bg,
            sc.color,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {sc.label}
        </span>
      </div>

      {/* Current Value */}
      <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">
        {viewMode === "pourcentages"
          ? formatRatioCurrentValue(ratio.ratioId as RatioId, ratio.value)
          : config.isPercentage
            ? `${Math.round(ratio.value)}%`
            : ratio.value.toFixed(1)}
      </p>
      {viewMode !== "pourcentages" && (
        <p className="text-xs text-muted-foreground">{config.unit}</p>
      )}

      <ProgressBar
        value={ratio.percentageOfTarget}
        status={ratio.status}
        showValue={false}
        size="sm"
        className="mt-3"
      />

      {/* Threshold info */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Objectif {thresholdLabel}
          </span>
        </div>
        <span className="text-xs font-bold text-foreground">
          {viewMode === "pourcentages"
            ? formatRatioObjectiveValue(
                ratio.ratioId as RatioId,
                ratio.thresholdForCategory,
              )
            : config.isPercentage
              ? `${ratio.thresholdForCategory}%`
              : `${ratio.thresholdForCategory} ${config.unit}`}
        </span>
      </div>

      {/* Improve section — fournie par le parent en mode individual seulement */}
      {!isTeamMode && improveSection}
    </div>
  );
}
