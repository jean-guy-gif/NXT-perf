"use client";

import { useMemo } from "react";
import { X, Check, AlertTriangle, X as XIcon, Users, ArrowRight } from "lucide-react";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import { computeAllRatios } from "@/lib/ratios";
import {
  RATIO_PERCENT_LABELS,
  formatRatioObjectiveValue,
} from "@/lib/ratio-labels";
import type {
  ComputedRatio,
  RatioConfig,
  RatioId,
} from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

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
    icon: XIcon,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

const statusPriority: Record<"ok" | "warning" | "danger", number> = {
  danger: 0,
  warning: 1,
  ok: 2,
};

interface ManagerRatioDrillDownProps {
  ratioId: RatioId;
  config: RatioConfig;
  /** Ratio agrégé équipe (pool concaténé) */
  aggregateRatio: ComputedRatio;
  /** Liste des conseillers de l'équipe */
  conseillers: User[];
  /** Map userId → results agrégés du conseiller */
  perConseillerResults: Map<string, PeriodResults | null>;
  ratioConfigs: Record<RatioId, RatioConfig>;
  onClose: () => void;
  /** Bascule sur la vue Individuel + sélection du conseiller */
  onDiscuterAvec: (conseillerId: string) => void;
}

export function ManagerRatioDrillDown({
  ratioId,
  config,
  aggregateRatio,
  conseillers,
  perConseillerResults,
  ratioConfigs,
  onClose,
  onDiscuterAvec,
}: ManagerRatioDrillDownProps) {
  // Ranking conseillers — tri par status (danger → ok) puis par percentageOfTarget
  const sortedConseillers = useMemo(() => {
    const isLowerBetter = config.isLowerBetter;

    return conseillers
      .map((c) => {
        const cResults = perConseillerResults.get(c.id);
        if (!cResults) return null;
        const cRatios = computeAllRatios(cResults, c.category, ratioConfigs);
        const ratio = cRatios.find((r) => r.ratioId === ratioId);
        if (!ratio) return null;
        return { conseiller: c, ratio };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        const statusDiff =
          statusPriority[a.ratio.status] - statusPriority[b.ratio.status];
        if (statusDiff !== 0) return statusDiff;
        return isLowerBetter
          ? b.ratio.percentageOfTarget - a.ratio.percentageOfTarget
          : a.ratio.percentageOfTarget - b.ratio.percentageOfTarget;
      });
  }, [conseillers, perConseillerResults, ratioId, ratioConfigs, config.isLowerBetter]);

  const aggregateSc = statusConfig[aggregateRatio.status];
  const AggregateStatusIcon = aggregateSc.icon;

  const ratioLabel =
    RATIO_PERCENT_LABELS[ratioId] ?? config.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex-1">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Users className="h-3.5 w-3.5" />
              Performance équipe
            </div>
            <h2 className="text-2xl font-bold text-foreground">{ratioLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {config.description}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {config.isPercentage
                  ? `${Math.round(aggregateRatio.value)}%`
                  : aggregateRatio.value.toFixed(1)}
                {!config.isPercentage && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {config.unit}
                  </span>
                )}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                  aggregateSc.bg,
                  aggregateSc.color,
                )}
              >
                <AggregateStatusIcon className="h-3.5 w-3.5" />
                {aggregateSc.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Benchmark profil Confirmé (référence équipe) :{" "}
              {formatRatioObjectiveValue(ratioId, aggregateRatio.thresholdForCategory)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ranking */}
        <div className="p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Ranking par conseiller — du moins performant au plus performant
          </h3>

          {sortedConseillers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune donnée disponible pour les conseillers de cette équipe sur ce ratio.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedConseillers.map(({ conseiller, ratio }) => {
                const sc = statusConfig[ratio.status];
                const Icon = sc.icon;
                const initials = `${conseiller.firstName[0]}${conseiller.lastName[0]}`.toUpperCase();

                return (
                  <div
                    key={conseiller.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {initials}
                    </div>
                    <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
                      {conseiller.firstName} {conseiller.lastName}
                    </p>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {config.isPercentage
                        ? `${Math.round(ratio.value)}%`
                        : ratio.value.toFixed(1)}
                      {!config.isPercentage && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {config.unit}
                        </span>
                      )}
                    </span>
                    <div className="w-24">
                      <ProgressBar
                        value={ratio.percentageOfTarget}
                        status={ratio.status}
                        showValue={false}
                        size="sm"
                      />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        sc.bg,
                        sc.color,
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {sc.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDiscuterAvec(conseiller.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Discuter avec {conseiller.firstName}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
