"use client";

import { Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAIN_LEVERS,
  CHAIN_LEVER_LABELS,
  type HeatmapColor,
  type HeatmapRow,
} from "@/lib/director/aggregate-team-ratio-per-lever";

interface ManagersHeatmapProps {
  rows: HeatmapRow[];
}

const COLOR_TONE: Record<HeatmapColor, string> = {
  green: "bg-emerald-100 text-emerald-900 border-emerald-300",
  orange: "bg-amber-100 text-amber-900 border-amber-300",
  red: "bg-red-100 text-red-900 border-red-300",
  neutral: "bg-muted/40 text-muted-foreground border-border",
};

const DPI_TONE = (dpi: number): string => {
  if (dpi >= 80) return "text-emerald-600";
  if (dpi >= 60) return "text-amber-600";
  return "text-red-600";
};

export function ManagersHeatmap({ rows }: ManagersHeatmapProps) {
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Grid3x3 className="h-3.5 w-3.5" />
          Heatmap Managers × Leviers
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune équipe rattachée à votre direction.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Grid3x3 className="h-3.5 w-3.5" />
        Heatmap Managers × Leviers
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Performance par équipe sur les 4 leviers clés de la chaîne immobilière.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Manager / Équipe</th>
              {CHAIN_LEVERS.map((leverId) => (
                <th key={leverId} className="px-2 py-2 text-center">
                  {CHAIN_LEVER_LABELS[leverId]}
                </th>
              ))}
              <th className="px-3 py-2 text-center">DPI moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">
                    {row.managerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.teamName} · {row.agentCount} conseiller
                    {row.agentCount > 1 ? "s" : ""}
                  </p>
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.expertiseId} className="px-2 py-2 text-center">
                    <div
                      className={cn(
                        "mx-auto inline-flex min-w-[3.5rem] items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold tabular-nums",
                        COLOR_TONE[cell.color],
                      )}
                      title={
                        cell.currentAvg !== null && cell.targetAvg !== null
                          ? `${cell.currentAvg} vs cible ${cell.targetAvg} (${cell.conseillerCount} mesure${cell.conseillerCount > 1 ? "s" : ""})`
                          : "Aucune donnée"
                      }
                    >
                      {cell.deltaPct === null
                        ? "—"
                        : `${cell.deltaPct > 0 ? "+" : ""}${cell.deltaPct}%`}
                    </div>
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      DPI_TONE(row.dpiAvg),
                    )}
                  >
                    {row.dpiAvg}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" />
          ≥ 0% vs cible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
          -15% à 0%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
          &lt; -15%
        </span>
      </div>
    </section>
  );
}
