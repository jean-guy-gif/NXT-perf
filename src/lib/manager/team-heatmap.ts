/**
 * team-heatmap — sous-PR Coach-22.
 *
 * Logique pure de construction de la matrice "conseillers × leviers"
 * pour le manager (mode collectif). Une cellule = statut du conseiller
 * sur ce levier (ratio) + valeur courante et cible.
 *
 * Pas de fetch dans cette lib — elle est appelée par `useTeamHeatmap` qui
 * fournit les ComputedRatio par conseiller (déjà calculés par
 * `useTeamRatios`).
 */

import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { User } from "@/types/user";

/** Sous-ensemble des RatioId affichés dans la heatmap (honoraires exclu). */
export const HEATMAP_RATIO_IDS: RatioId[] = [
  "contacts_rdv",
  "rdv_mandats",
  "pct_mandats_exclusifs",
  "acheteurs_visites",
  "visites_offre",
  "offres_compromis",
  "compromis_actes",
];

export interface HeatmapCell {
  ratioId: RatioId;
  /** Valeur observée pour ce conseiller sur ce ratio. null si pas de data. */
  value: number | null;
  /** Cible attendue pour la catégorie du conseiller. null si pas de data. */
  target: number | null;
  /** Statut OK / warning / danger. null si pas de data. */
  status: "ok" | "warning" | "danger" | null;
  /** % d'atteinte de la cible. null si pas de data. */
  percentageOfTarget: number | null;
}

export interface HeatmapRow {
  advisor: User;
  cells: HeatmapCell[];
  /**
   * Nombre de cellules en danger sur ce conseiller — sert au tri secondaire
   * quand on n'a pas de painScore exploitable.
   */
  dangerCount: number;
}

export interface HeatmapColumn {
  ratioId: RatioId;
  label: string;
  /** Statut moyen équipe sur ce ratio (status le plus dégradé l'emporte). */
  teamStatus: "ok" | "warning" | "danger" | "no_data";
  /** Nombre de conseillers en danger sur ce levier (alimente le ranking). */
  dangerCount: number;
}

export interface TeamHeatmap {
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
}

/**
 * Construit la matrice. L'ordre des `advisors` fourni en entrée est
 * conservé pour les lignes (le caller peut donc trier comme il veut —
 * typiquement par pain score décroissant via `useAdvisorsByPain`).
 */
export function buildTeamHeatmap(
  advisors: User[],
  perConseillerRatios: Map<string, ComputedRatio[]>,
  ratioConfigs: Record<RatioId, RatioConfig>,
): TeamHeatmap {
  const rows: HeatmapRow[] = advisors.map((advisor) => {
    const ratios = perConseillerRatios.get(advisor.id) ?? [];
    const byRatioId = new Map<string, ComputedRatio>();
    for (const r of ratios) byRatioId.set(r.ratioId, r);

    let dangerCount = 0;
    const cells: HeatmapCell[] = HEATMAP_RATIO_IDS.map((ratioId) => {
      const r = byRatioId.get(ratioId);
      if (!r) {
        return {
          ratioId,
          value: null,
          target: null,
          status: null,
          percentageOfTarget: null,
        };
      }
      if (r.status === "danger") dangerCount += 1;
      return {
        ratioId,
        value: r.value,
        target: r.thresholdForCategory,
        status: r.status,
        percentageOfTarget: r.percentageOfTarget,
      };
    });

    return { advisor, cells, dangerCount };
  });

  const columns: HeatmapColumn[] = HEATMAP_RATIO_IDS.map((ratioId) => {
    const config = ratioConfigs[ratioId];
    let dangerCount = 0;
    let warningCount = 0;
    let okCount = 0;
    let total = 0;
    for (const row of rows) {
      const cell = row.cells.find((c) => c.ratioId === ratioId);
      if (!cell || !cell.status) continue;
      total += 1;
      if (cell.status === "danger") dangerCount += 1;
      else if (cell.status === "warning") warningCount += 1;
      else okCount += 1;
    }
    const teamStatus: HeatmapColumn["teamStatus"] =
      total === 0
        ? "no_data"
        : dangerCount >= Math.ceil(total / 2)
          ? "danger"
          : dangerCount + warningCount >= Math.ceil(total / 2)
            ? "warning"
            : "ok";

    return {
      ratioId,
      label: config?.name ?? ratioId,
      teamStatus,
      dangerCount,
      // okCount/warningCount left local — caller doesn't need them today
      // (and we keep the public type minimal).
    };
  });

  return { columns, rows };
}
