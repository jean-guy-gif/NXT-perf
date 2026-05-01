"use client";

import { Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import type { DiagnosticView } from "./diagnostic-toggle";

type Status = "ok" | "warning" | "danger";

const STATUS_STYLE: Record<
  Status,
  { bg: string; text: string; ring: string; icon: typeof Check; label: string }
> = {
  ok: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "border-emerald-500/30",
    icon: Check,
    label: "Surperf",
  },
  warning: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    ring: "border-orange-500/30",
    icon: AlertTriangle,
    label: "À surveiller",
  },
  danger: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    ring: "border-red-500/30",
    icon: X,
    label: "Sous-perf",
  },
};

function volumeStatus(actual: number, target: number): Status {
  if (target === 0) return "warning";
  const pct = actual / target;
  if (pct >= 1.0) return "ok";
  if (pct >= 0.8) return "warning";
  return "danger";
}

interface Props {
  view: DiagnosticView;
  results: PeriodResults | null;
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  category: UserCategory;
  /** Échelle d'objectif (1 = mois, 12 = année…) */
  periodMonths: number;
}

export function DiagnosticKeyFigures({
  view,
  results,
  computedRatios,
  ratioConfigs,
  category,
  periodMonths,
}: Props) {
  if (!results) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Aucune donnée pour cette période.
      </div>
    );
  }

  const obj = CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  const m = Math.max(1, periodMonths);

  const volumes = [
    {
      label: "Estimations",
      actual: results.vendeurs.estimationsRealisees,
      target: obj.estimations * m,
      unit: "",
    },
    {
      label: "Mandats signés",
      actual: results.vendeurs.mandatsSignes,
      target: obj.mandats * m,
      unit: "",
    },
    {
      label: "Visites",
      actual: results.acheteurs.nombreVisites,
      target: obj.visites * m,
      unit: "",
    },
    {
      label: "Compromis",
      actual: results.acheteurs.compromisSignes,
      target: obj.compromis * m,
      unit: "",
    },
  ];

  // Map les 4 ratios prioritaires affichés sur la diagnostic
  const RATIO_PRIORITY: RatioId[] = [
    "rdv_mandats",
    "pct_mandats_exclusifs",
    "visites_offre",
    "offres_compromis",
  ];
  const ratios = RATIO_PRIORITY.map((id) => {
    const c = computedRatios.find((r) => r.ratioId === id);
    const cfg = ratioConfigs[id];
    if (!c || !cfg) return null;
    return { id, computed: c, config: cfg };
  }).filter(Boolean) as Array<{
    id: RatioId;
    computed: ComputedRatio;
    config: RatioConfig;
  }>;

  const showVolumes = view === "volumes" || view === "both";
  const showRatios = view === "ratios" || view === "both";

  return (
    <div className="space-y-6">
      {showVolumes && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Volumes
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {volumes.map((v) => {
              const s = volumeStatus(v.actual, v.target);
              const style = STATUS_STYLE[s];
              const Icon = style.icon;
              const pct =
                v.target > 0 ? Math.round((v.actual / v.target) * 100) : 0;
              return (
                <div
                  key={v.label}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-colors",
                    style.ring
                  )}
                >
                  <p className="text-xs text-muted-foreground">{v.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {v.actual}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / {v.target}
                    </span>
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      style.bg,
                      style.text
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {pct}% — {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRatios && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ratios</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ratios.map(({ id, computed, config }) => {
              const style = STATUS_STYLE[computed.status];
              const Icon = style.icon;
              return (
                <div
                  key={id}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-colors",
                    style.ring
                  )}
                >
                  <p className="text-xs text-muted-foreground">{config.name}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {config.isPercentage
                      ? `${Math.round(computed.value)}%`
                      : computed.value.toFixed(1)}
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      style.bg,
                      style.text
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    Cible {computed.thresholdForCategory}
                    {config.isPercentage ? "%" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
