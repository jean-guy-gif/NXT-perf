"use client";

import { Grid3x3 } from "lucide-react";
import { useTeamHeatmap } from "@/hooks/team/use-team-heatmap";
import { useManagerView } from "@/hooks/use-manager-view";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { RatioInfoBadge } from "@/components/coaching/ratio-info-tooltip";
import type { HeatmapCell, HeatmapColumn } from "@/lib/manager/team-heatmap";

/**
 * TeamHeatmap — sous-PR Coach-22.
 *
 * Matrice conseillers × leviers visible d'un coup d'œil. Lignes triées
 * par pain score décroissant (le conseiller le plus en difficulté en
 * haut). Cellules colorées par statut.
 *
 * Click sur une cellule → bascule vers la vue individuelle du conseiller
 * (mode "individual" + advisor sélectionné). Aligné sur la règle des
 * 3 clics : 1 clic depuis le diagnostic équipe = zoom direct.
 *
 * Responsive : scroll horizontal sur mobile, colonne avatar conseiller
 * sticky à gauche pour rester lisible.
 */
export function TeamHeatmap() {
  const { columns, rows } = useTeamHeatmap();
  const { setMode, selectAdvisor } = useManagerView();
  const isDemo = useAppStore((s) => s.isDemo);

  if (rows.length === 0) return null;

  const handleZoomAdvisor = (advisorId: string) => {
    selectAdvisor(advisorId);
    setMode("individual");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section
      aria-label="Heatmap équipe : conseillers × leviers"
      className="rounded-xl border border-border bg-card p-5 md:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Grid3x3 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            Heatmap équipe — qui coince sur quoi
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conseillers triés par priorité de coaching. Cliquez sur une
            ligne pour zoomer sur la vue individuelle{isDemo ? " (démo)" : ""}.
          </p>
        </div>
      </div>

      <Legend />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 w-44 bg-card px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Conseiller
              </th>
              {columns.map((col) => (
                <ColumnHeader key={col.ratioId} column={col} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.advisor.id}
                className="group transition-colors hover:bg-muted/40"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-44 bg-card px-2 py-2 text-left font-medium group-hover:bg-muted/40"
                >
                  <button
                    type="button"
                    onClick={() => handleZoomAdvisor(row.advisor.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-foreground transition-colors hover:text-primary"
                    title={`Zoomer sur ${row.advisor.firstName} ${row.advisor.lastName}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {row.advisor.firstName[0]}
                      {row.advisor.lastName[0]}
                    </span>
                    <span className="min-w-0 truncate text-sm">
                      {row.advisor.firstName} {row.advisor.lastName}
                    </span>
                  </button>
                </th>
                {row.cells.map((cell) => (
                  <CellTile
                    key={cell.ratioId}
                    cell={cell}
                    advisorLabel={`${row.advisor.firstName} ${row.advisor.lastName}`}
                    onClick={() => handleZoomAdvisor(row.advisor.id)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ColumnHeader({ column }: { column: HeatmapColumn }) {
  const STATUS_DOT: Record<HeatmapColumn["teamStatus"], string> = {
    danger: "bg-red-500",
    warning: "bg-amber-500",
    ok: "bg-emerald-500",
    no_data: "bg-muted-foreground/40",
  };
  return (
    <th
      scope="col"
      className="px-1.5 py-2 text-center align-bottom text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
      title={
        column.teamStatus === "no_data"
          ? "Aucune donnée"
          : `${column.dangerCount} conseiller(s) en danger sur ce levier`
      }
    >
      <div className="flex flex-col items-center gap-1">
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[column.teamStatus])}
        />
        <span className="line-clamp-2 inline-flex max-w-[90px] items-center gap-1 leading-tight">
          {column.label}
          <RatioInfoBadge ratioId={column.ratioId} size="xs" />
        </span>
      </div>
    </th>
  );
}

function CellTile({
  cell,
  advisorLabel,
  onClick,
}: {
  cell: HeatmapCell;
  advisorLabel: string;
  onClick: () => void;
}) {
  const TILE_CLASS: Record<NonNullable<HeatmapCell["status"]> | "no_data", string> = {
    ok: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    warning:
      "bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border-amber-500/30",
    danger:
      "bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-400 border-red-500/30",
    no_data:
      "bg-muted/40 hover:bg-muted/60 text-muted-foreground border-border",
  };
  const key = cell.status ?? "no_data";
  const tileClass = TILE_CLASS[key];

  const display =
    cell.value === null
      ? "—"
      : Number.isInteger(cell.value)
        ? `${cell.value}`
        : cell.value.toFixed(1);
  const pctDisplay =
    cell.percentageOfTarget === null
      ? null
      : `${Math.round(cell.percentageOfTarget)}%`;

  const tooltip =
    cell.value === null
      ? `${advisorLabel} — aucune donnée saisie sur ce levier`
      : `${advisorLabel} — valeur ${display}${
          cell.target !== null ? ` (cible ${cell.target})` : ""
        }${pctDisplay !== null ? ` · ${pctDisplay} de l'objectif` : ""}`;

  return (
    <td className="px-0.5 py-0.5">
      <button
        type="button"
        onClick={onClick}
        title={tooltip}
        aria-label={tooltip}
        className={cn(
          "flex h-12 w-full min-w-[60px] flex-col items-center justify-center rounded-md border px-1 transition-colors",
          tileClass,
        )}
      >
        <span className="text-xs font-bold tabular-nums">{display}</span>
        {pctDisplay && (
          <span className="text-[10px] tabular-nums opacity-70">
            {pctDisplay}
          </span>
        )}
      </button>
    </td>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <LegendItem color="bg-emerald-500/30 border-emerald-500/40" label="Objectif atteint" />
      <LegendItem color="bg-amber-500/30 border-amber-500/40" label="À surveiller" />
      <LegendItem color="bg-red-500/30 border-red-500/40" label="Sous-performance" />
      <LegendItem color="bg-muted border-border" label="Pas de données" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded border", color)} aria-hidden />
      {label}
    </span>
  );
}
