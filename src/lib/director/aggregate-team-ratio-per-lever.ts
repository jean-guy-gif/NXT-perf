/**
 * aggregate-team-ratio-per-lever — calcule pour chaque équipe le ratio moyen
 * sur 4 leviers chaîne fixes (Q-D1.4) pour la heatmap Directeur.
 *
 * 4 leviers : contacts_estimations, estimations_mandats,
 *             visites_par_acheteur, compromis_actes.
 *
 * Palette Q-D1.2 (3 couleurs strict) :
 *   - 🟢 deltaPct >= 0   : équipe au niveau ou meilleure que la cible
 *   - 🟠 -15 <= deltaPct < 0
 *   - 🔴 deltaPct < -15
 *
 * Définition de deltaPct (direction-aware, positif = bon) :
 *   - less_is_better : ((target - current) / target) × 100
 *   - more_is_better : ((current - target) / target) × 100
 *
 * Cellule sans data (aucun conseiller mesuré pour ce levier) : `color = "neutral"`.
 */

import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";

export const CHAIN_LEVERS: ExpertiseRatioId[] = [
  "contacts_estimations",
  "estimations_mandats",
  "visites_par_acheteur",
  "compromis_actes",
];

export const CHAIN_LEVER_LABELS: Record<ExpertiseRatioId, string> = {
  contacts_estimations: "Contact → Estim.",
  estimations_mandats: "Estim. → Mandat",
  pct_exclusivite: "% Exclusivité",
  acheteurs_tournee: "Acheteurs tournée",
  visites_par_acheteur: "Acheteur → Visite",
  visites_offres: "Visite → Offre",
  offres_compromis: "Offre → Compromis",
  compromis_actes: "Compromis → Acte",
};

export type HeatmapColor = "green" | "orange" | "red" | "neutral";

export interface HeatmapCell {
  expertiseId: ExpertiseRatioId;
  currentAvg: number | null;
  targetAvg: number | null;
  deltaPct: number | null;
  color: HeatmapColor;
  conseillerCount: number;
}

export interface HeatmapRow {
  teamId: string;
  teamName: string;
  managerName: string;
  agentCount: number;
  dpiAvg: number;
  cells: HeatmapCell[];
}

export interface ConseillerLeverInput {
  conseillerId: string;
  teamId: string | null;
  /** Mesures conseiller-level (currentValue + target par expertiseId). */
  measures: Array<{
    expertiseId: ExpertiseRatioId;
    currentValue: number;
    targetValue: number;
  }>;
}

export interface TeamMeta {
  teamId: string;
  teamName: string;
  managerName: string;
  agentCount: number;
  dpiAvg: number;
}

function classify(deltaPct: number | null): HeatmapColor {
  if (deltaPct === null) return "neutral";
  if (deltaPct >= 0) return "green";
  if (deltaPct >= -15) return "orange";
  return "red";
}

export function computeDeltaPct(
  currentValue: number,
  targetValue: number,
  direction: "less_is_better" | "more_is_better",
): number | null {
  if (targetValue === 0) return null;
  const raw =
    direction === "less_is_better"
      ? (targetValue - currentValue) / targetValue
      : (currentValue - targetValue) / targetValue;
  return Math.round(raw * 100);
}

export function buildHeatmapRows(
  teams: TeamMeta[],
  conseillerInputs: ConseillerLeverInput[],
): HeatmapRow[] {
  const inputsByTeam = new Map<string, ConseillerLeverInput[]>();
  for (const input of conseillerInputs) {
    if (!input.teamId) continue;
    if (!inputsByTeam.has(input.teamId)) inputsByTeam.set(input.teamId, []);
    inputsByTeam.get(input.teamId)!.push(input);
  }

  return teams.map((team) => {
    const conseillers = inputsByTeam.get(team.teamId) ?? [];
    const cells: HeatmapCell[] = CHAIN_LEVERS.map((leverId) => {
      const samples = conseillers
        .map((c) => c.measures.find((m) => m.expertiseId === leverId))
        .filter((m): m is NonNullable<typeof m> => m !== undefined);

      if (samples.length === 0) {
        return {
          expertiseId: leverId,
          currentAvg: null,
          targetAvg: null,
          deltaPct: null,
          color: "neutral",
          conseillerCount: 0,
        };
      }

      const currentAvg =
        samples.reduce((s, m) => s + m.currentValue, 0) / samples.length;
      const targetAvg =
        samples.reduce((s, m) => s + m.targetValue, 0) / samples.length;
      const direction = RATIO_EXPERTISE[leverId].direction;
      const deltaPct = computeDeltaPct(currentAvg, targetAvg, direction);

      return {
        expertiseId: leverId,
        currentAvg: Math.round(currentAvg * 10) / 10,
        targetAvg: Math.round(targetAvg * 10) / 10,
        deltaPct,
        color: classify(deltaPct),
        conseillerCount: samples.length,
      };
    });

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      managerName: team.managerName,
      agentCount: team.agentCount,
      dpiAvg: team.dpiAvg,
      cells,
    };
  });
}

/** Adapter utilitaire pour extraire les inputs d'un PainPointResult global. */
export function painPointsToMeasures(
  conseillerId: string,
  teamId: string | null,
  allRatios: Array<{
    expertiseId: ExpertiseRatioId;
    currentValue: number;
    targetValue: number;
  }>,
): ConseillerLeverInput {
  return { conseillerId, teamId, measures: allRatios };
}

export type { PainPointResult };
