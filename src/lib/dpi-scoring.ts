import { DPI_QUESTIONS } from "./dpi-questions";

export interface DPIAxisScore {
  id: string;
  label: string;
  score: number;
  potential: number;
  projection3m: number;
  projection6m: number;
  projection9m: number;
}

export interface DPIScores {
  axes: DPIAxisScore[];
  globalScore: number;
  potentialScore: number;
  estimatedCAGain: { min: number; max: number };
  topPerformer: Record<string, number>;
  level: string;
  percentile: number;
  percentileLabel: string;
  percentileRegion?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  categoryLabel?: string;
  topPercentage?: number;
  topPercentageZone?: string;
  caAdditionnel?: { bas: number; haut: number };
  caBase?: number;
  caRange?: string;
}

export const TOP_PERFORMER: Record<string, number> = {
  intensite_commerciale: 70,
  generation_opportunites: 90,
  solidite_portefeuille: 85,
  maitrise_ratios: 95,
  valorisation_economique: 85,
  pilotage_strategique: 90,
};

const AXIS_WEIGHTS: Record<string, number> = {
  intensite_commerciale: 0.10,
  generation_opportunites: 0.20,
  solidite_portefeuille: 0.15,
  maitrise_ratios: 0.25,
  valorisation_economique: 0.15,
  pilotage_strategique: 0.15,
};

const AXIS_LABELS: Record<string, string> = {
  intensite_commerciale: "Intensité commerciale",
  generation_opportunites: "Génération d'opportunités",
  solidite_portefeuille: "Solidité du portefeuille",
  maitrise_ratios: "Maîtrise des ratios",
  valorisation_economique: "Valorisation économique",
  pilotage_strategique: "Pilotage stratégique",
};

const AXIS_IDS = Object.keys(AXIS_LABELS);

function computeAxisRawScore(
  axisId: string,
  performanceAnswers: Record<string, number>
): number {
  const questions = DPI_QUESTIONS.filter(
    (q) => q.bloc === "performance" && q.axis === axisId
  );
  if (questions.length === 0) return 0;

  const values = questions.map((q) => performanceAnswers[q.id] ?? 1);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 25);
}

function computePotential(
  axisId: string,
  rawScore: number,
  contextAnswers: Record<string, number>,
  performanceAnswers: Record<string, number>
): number {
  let bonus = 0;

  // Experience bonus (applies to all axes)
  const exp = contextAnswers.ctx_experience ?? 2;
  if (exp <= 2) bonus += 20;
  else if (exp === 3) bonus += 15;
  else bonus += 10;

  // Axis-specific bonuses
  if (axisId === "pilotage_strategique") {
    const suivi = performanceAnswers.perf_suivi ?? 1;
    if (suivi <= 2) bonus += 25;
  }

  if (axisId === "maitrise_ratios") {
    const exclu = performanceAnswers.perf_exclusivite ?? 1;
    if (exclu <= 2) bonus += 20;
  }

  return Math.min(100, rawScore + bonus);
}

function computeCAGain(
  caLevel: number,
  globalScore: number,
  potentialScore: number
): { min: number; max: number } {
  const gap = potentialScore - globalScore;
  if (gap < 5) return { min: 0, max: 0 };

  const factor = gap / 15;

  switch (caLevel) {
    case 1: // <100k
      return { min: Math.round(15000 * factor), max: Math.round(25000 * factor) };
    case 2: // 100-250k
      return { min: Math.round(25000 * factor), max: Math.round(45000 * factor) };
    case 3: // 250-500k
      return { min: Math.round(40000 * factor), max: Math.round(80000 * factor) };
    case 4: // >500k
      return { min: Math.round(60000 * factor), max: Math.round(120000 * factor) };
    default:
      return { min: Math.round(15000 * factor), max: Math.round(25000 * factor) };
  }
}

function getLevel(score: number): string {
  if (score < 30) return "Débutant";
  if (score < 50) return "En progression";
  if (score < 70) return "Confirmé";
  if (score < 85) return "Expert";
  return "Top Performer";
}

export function computeDPIScores(
  contextAnswers: Record<string, number>,
  performanceAnswers: Record<string, number>
): DPIScores {
  const axes: DPIAxisScore[] = AXIS_IDS.map((axisId) => {
    const score = computeAxisRawScore(axisId, performanceAnswers);
    const potential = computePotential(axisId, score, contextAnswers, performanceAnswers);

    return {
      id: axisId,
      label: AXIS_LABELS[axisId],
      score,
      potential,
      projection3m: Math.round(score + (potential - score) * 0.3),
      projection6m: Math.round(score + (potential - score) * 0.6),
      projection9m: Math.round(score + (potential - score) * 0.9),
    };
  });

  const globalScore = Math.round(
    axes.reduce((sum, a) => sum + a.score * (AXIS_WEIGHTS[a.id] ?? 0), 0)
  );

  const potentialScore = Math.round(
    axes.reduce((sum, a) => sum + a.potential * (AXIS_WEIGHTS[a.id] ?? 0), 0)
  );

  const caLevel = contextAnswers.ctx_ca ?? 1;
  const estimatedCAGain = computeCAGain(caLevel, globalScore, potentialScore);

  const percentile = Math.min(99, Math.max(1, 100 - globalScore));

  const zoneBonus: Record<number, number> = { 1: -8, 2: -4, 3: 2, 4: -2 };
  const zone = contextAnswers.ctx_zone ?? 2;
  const regionPercentile = Math.min(99, Math.max(1, percentile + (zoneBonus[zone] ?? 0)));

  const zoneLabels: Record<number, string> = {
    1: "en zone rurale",
    2: "en ville moyenne",
    3: "en grande métropole",
    4: "en zone touristique",
  };

  let percentileLabel: string;
  if (percentile <= 5) percentileLabel = "Vous faites partie du top 5% des professionnels de l'immobilier en France";
  else if (percentile <= 10) percentileLabel = "Vous faites partie du top 10% des professionnels de l'immobilier en France";
  else if (percentile <= 20) percentileLabel = "Vous faites partie du top 20% des professionnels de l'immobilier en France";
  else percentileLabel = `Vous faites partie du top ${percentile}% des professionnels de l'immobilier en France`;

  const percentileRegion = `Top ${regionPercentile}% ${zoneLabels[zone] ?? "dans votre région"}`;

  return {
    axes,
    globalScore,
    potentialScore,
    estimatedCAGain,
    topPerformer: TOP_PERFORMER,
    level: getLevel(globalScore),
    percentile,
    percentileLabel,
    percentileRegion,
  };
}
