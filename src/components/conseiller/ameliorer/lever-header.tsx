"use client";

import { Target, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  expertiseId: ExpertiseRatioId;
  currentValue: number | null;
  targetValue: number;
  estimatedGainEur: number;
  onChangeLever?: () => void;
}

export function LeverHeader({
  expertiseId,
  currentValue,
  targetValue,
  estimatedGainEur,
  onChangeLever,
}: Props) {
  const expertise = RATIO_EXPERTISE[expertiseId];
  const isPercent = expertiseId === "pct_exclusivite";
  const fmt = (v: number | null) =>
    v == null ? "—" : isPercent ? `${Math.round(v)} %` : v.toFixed(1);

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Target className="h-3.5 w-3.5" />
        Levier ciblé
      </div>
      <h2 className="mt-2 text-2xl font-bold text-foreground">
        {expertise.label}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Ratio actuel" value={fmt(currentValue)} />
        <Stat label="Cible" value={fmt(targetValue)} />
        <Stat
          label="Gain estimé sur 30j"
          value={
            estimatedGainEur > 0
              ? `+${formatCurrency(Math.round(estimatedGainEur))}`
              : "—"
          }
          tone="success"
        />
      </div>

      {onChangeLever && (
        <button
          type="button"
          onClick={onChangeLever}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Changer de levier
        </button>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "success"
            ? "mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500"
            : "mt-1 text-xl font-bold tabular-nums text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
