"use client";

import { useState } from "react";
import { useRatios } from "@/hooks/use-ratios";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { ProgressBar } from "@/components/charts/progress-bar";
import { RatioDrillDownModal } from "@/components/dashboard/ratio-drill-down-modal";
import type { RatioId } from "@/types/ratios";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const statusConfig = {
  ok: {
    icon: CheckCircle,
    label: "Conforme",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
    dot: "bg-green-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    dot: "bg-orange-500",
  },
  danger: {
    icon: XCircle,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    dot: "bg-red-500",
  },
};

export default function PerformancePage() {
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const results = useResults();
  const [selectedRatioId, setSelectedRatioId] = useState<RatioId | null>(null);

  const overallPerformance =
    computedRatios.length > 0
      ? Math.round(
          computedRatios.reduce((acc, r) => acc + r.percentageOfTarget, 0) /
            computedRatios.length
        )
      : 0;

  const statusCounts = computedRatios.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { ok: 0, warning: 0, danger: 0 } as Record<string, number>
  );

  const overallStatus =
    overallPerformance >= 80
      ? "ok"
      : overallPerformance >= 60
        ? "warning"
        : ("danger" as const);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ma Performance
            </h1>
            <p className="text-sm text-muted-foreground">
              Ratios calculés automatiquement selon votre niveau
            </p>
          </div>
        </div>
        {user && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              CATEGORY_COLORS[user.category]
            )}
          >
            {CATEGORY_LABELS[user.category]}
          </span>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Overall Score */}
        <div
          className={cn(
            "rounded-xl border p-5",
            statusConfig[overallStatus].border,
            statusConfig[overallStatus].bg
          )}
        >
          <p className="text-sm font-medium text-muted-foreground">
            Score global
          </p>
          <p
            className={cn(
              "mt-2 text-4xl font-bold",
              statusConfig[overallStatus].color
            )}
          >
            {overallPerformance}%
          </p>
          <ProgressBar
            value={overallPerformance}
            status={overallStatus}
            showValue={false}
            className="mt-3"
          />
        </div>

        {/* Status counts */}
        <div className="rounded-xl border border-green-500/25 bg-card p-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-sm font-medium text-muted-foreground">
              Conformes
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-500">
            {statusCounts.ok}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ratio(s) dans l&apos;objectif
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/25 bg-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-medium text-muted-foreground">
              Vigilance
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-orange-500">
            {statusCounts.warning}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ratio(s) en vigilance
          </p>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-card p-5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-medium text-muted-foreground">
              Sous-perf.
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-500">
            {statusCounts.danger}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ratio(s) en alerte
          </p>
        </div>
      </div>

      {/* Ratios Detail Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Détail des 7 ratios métier
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {computedRatios.map((ratio) => {
            const config = ratioConfigs[ratio.ratioId as RatioId];
            if (!config) return null;
            const sc = statusConfig[ratio.status];
            const StatusIcon = sc.icon;

            return (
              <div
                key={ratio.ratioId}
                onClick={() => setSelectedRatioId(ratio.ratioId as RatioId)}
                className={cn(
                  "cursor-pointer rounded-xl border bg-card p-5 transition-colors hover:shadow-md",
                  sc.border
                )}
              >
                {/* Header with status */}
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {config.name}
                  </p>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      sc.bg,
                      sc.color
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {sc.label}
                  </div>
                </div>

                {/* Current Value */}
                <p className={cn("mt-3 text-3xl font-bold", sc.color)}>
                  {config.isPercentage
                    ? `${Math.round(ratio.value)}%`
                    : ratio.value.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">{config.unit}</p>

                {/* Progress */}
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
                      Objectif {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {config.isPercentage
                      ? `${ratio.thresholdForCategory}%`
                      : `${ratio.thresholdForCategory} ${config.unit}`}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drill-down modal */}
      {selectedRatioId && results && (
        <RatioDrillDownModal
          ratioId={selectedRatioId}
          computedRatio={
            computedRatios.find((r) => r.ratioId === selectedRatioId)!
          }
          ratioConfig={ratioConfigs[selectedRatioId]}
          results={results}
          onClose={() => setSelectedRatioId(null)}
        />
      )}
    </div>
  );
}
