"use client";

import { Target, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

type LeverHeaderMode = "plan-active" | "no-plan-preselected";

interface Props {
  expertiseId: ExpertiseRatioId;
  currentValue: number | null;
  targetValue: number;
  estimatedGainEur: number;
  onChangeLever?: () => void;
  /** "plan-active" (default) ou "no-plan-preselected" : adapte le libellé */
  mode?: LeverHeaderMode;
}

export function LeverHeader({
  expertiseId,
  currentValue,
  targetValue,
  estimatedGainEur,
  onChangeLever,
  mode = "plan-active",
}: Props) {
  const expertise = RATIO_EXPERTISE[expertiseId];
  const isPercent = expertiseId === "pct_exclusivite";
  const fmt = (v: number | null) =>
    v == null ? "—" : isPercent ? `${Math.round(v)} %` : v.toFixed(1);

  const headerLabel =
    mode === "no-plan-preselected" ? "Levier sélectionné" : "Levier ciblé";
  const gainLabel =
    mode === "no-plan-preselected"
      ? "Gain estimé sur 30j"
      : "Gain estimé sur 30j";
  const gainValue =
    mode === "no-plan-preselected"
      ? "Gain à confirmer après lancement du plan"
      : estimatedGainEur > 0
        ? `+${formatCurrency(Math.round(estimatedGainEur))}`
        : "—";

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Target className="h-3.5 w-3.5" />
        {headerLabel}
      </div>
      <h2 className="mt-2 text-2xl font-bold text-foreground">
        {expertise.label}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Ratio actuel" value={fmt(currentValue)} />
        <Stat label="Cible" value={fmt(targetValue)} />
        <Stat
          label={gainLabel}
          value={gainValue}
          tone={mode === "no-plan-preselected" ? "muted" : "success"}
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
  tone?: "success" | "muted";
}) {
  const valueClass =
    tone === "success"
      ? "mt-1 text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500"
      : tone === "muted"
        ? "mt-1 text-sm font-medium leading-snug text-muted-foreground"
        : "mt-1 text-xl font-bold tabular-nums text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}
