"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDpiSnapshotHistory } from "@/hooks/use-dpi-snapshot-history";
import {
  computeAxisDeltas,
  type AxisDelta,
  type AxisScoreInput,
} from "@/lib/dpi/compute-axis-deltas";

interface Props {
  userId: string;
  /** DPI courant calculé live via `useDPIEvolution` (passé en prop). */
  currentAxes: AxisScoreInput[];
  /** Score global courant — affiché dans la légende. */
  currentGlobalScore: number;
}

/**
 * DpiDeltasView — vue cards par axe DPI avec delta vs un snapshot historique.
 *
 * - Dropdown native `<select>` Tailwind-stylé pour choisir le snapshot de
 *   référence parmi les `dpi_snapshots` du user (lus via
 *   `useDpiSnapshotHistory`)
 * - Default value : le **plus ancien** (= "DPI initial")
 * - Grid 6 `<AxisDeltaCard>` (1 par axe DPI)
 * - Empty states gracieux : 0 snapshot (impossible si trigger ensure marche,
 *   mais safety), 1 snapshot seulement (mois courant uniquement — message
 *   d'incitation à revenir)
 */
export function DpiDeltasView({
  userId,
  currentAxes,
  currentGlobalScore,
}: Props) {
  const { snapshots, loading } = useDpiSnapshotHistory(userId);

  // Default : le plus ancien (dernier élément du tableau snapshots DESC).
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Initialisation déférée : tant que les snapshots ne sont pas chargés,
  // on attend pour fixer la default value sur le plus ancien.
  useEffect(() => {
    if (snapshots.length === 0) return;
    if (selectedMonth) return;
    const oldest = snapshots[snapshots.length - 1];
    setSelectedMonth(oldest.snapshotMonth);
  }, [snapshots, selectedMonth]);

  const referenceSnapshot = useMemo(() => {
    if (!selectedMonth) return null;
    return snapshots.find((s) => s.snapshotMonth === selectedMonth) ?? null;
  }, [selectedMonth, snapshots]);

  const deltas = useMemo<AxisDelta[]>(() => {
    if (!referenceSnapshot) return [];
    return computeAxisDeltas(referenceSnapshot.axes, currentAxes);
  }, [referenceSnapshot, currentAxes]);

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Chargement de votre historique…
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">
          Aucun snapshot DPI disponible
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connectez-vous le mois prochain pour voir votre première évolution.
        </p>
      </div>
    );
  }

  if (snapshots.length === 1) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-foreground">
          Un seul DPI disponible pour le moment
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Revenez le mois prochain pour comparer votre progression.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-semibold text-muted-foreground">
          Comparer avec
        </label>
        <select
          value={selectedMonth ?? ""}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {snapshots.map((s, idx) => {
            const isOldest = idx === snapshots.length - 1;
            const label = formatMonthLabel(s.snapshotMonth);
            return (
              <option key={s.id} value={s.snapshotMonth}>
                {isOldest ? `DPI initial (${label})` : `DPI de ${label}`}
              </option>
            );
          })}
        </select>
      </div>

      {referenceSnapshot && (
        <p className="text-xs text-muted-foreground">
          Référence :{" "}
          <span className="font-medium text-foreground">
            {referenceSnapshot.globalScore}/100
          </span>{" "}
          → Actuel :{" "}
          <span className="font-medium text-foreground">
            {currentGlobalScore}/100
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {deltas.map((d) => (
          <AxisDeltaCard key={d.axisId} delta={d} />
        ))}
      </div>
    </div>
  );
}

// ─── AxisDeltaCard ────────────────────────────────────────────────────────

function AxisDeltaCard({ delta }: { delta: AxisDelta }) {
  const Icon =
    delta.direction === "up"
      ? ArrowUp
      : delta.direction === "down"
        ? ArrowDown
        : Minus;
  const colorClass =
    delta.direction === "up"
      ? "text-emerald-500"
      : delta.direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";
  const barClass =
    delta.direction === "up"
      ? "bg-emerald-500"
      : delta.direction === "down"
        ? "bg-red-500"
        : "bg-muted-foreground/40";
  const barWidth = Math.min(Math.abs(delta.deltaPct ?? 0), 100);
  const sign = delta.deltaPts > 0 ? "+" : "";
  const signPct = delta.deltaPct !== null && delta.deltaPct > 0 ? "+" : "";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="line-clamp-1 text-xs font-medium text-muted-foreground">
          {delta.axisLabel}
        </span>
        <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums",
            colorClass,
          )}
        >
          {sign}
          {delta.deltaPts} pts
        </span>
        {delta.deltaPct !== null && (
          <span className={cn("text-xs font-medium", colorClass)}>
            ({signPct}
            {delta.deltaPct}%)
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {delta.currentScore} vs {delta.referenceScore}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", barClass)}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Convertit "YYYY-MM" en libellé FR "MMM YYYY" (ex "Mai 2026").
 * Pure, testable. Fallback sur la string brute si parsing échoue.
 */
function formatMonthLabel(snapshotMonth: string): string {
  const [yearStr, monthStr] = snapshotMonth.split("-");
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIdx) ||
    monthIdx < 0 ||
    monthIdx > 11
  ) {
    return snapshotMonth;
  }
  const d = new Date(year, monthIdx, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
