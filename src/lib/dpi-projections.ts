import type { DPIAxis } from "@/lib/dpi-axes";

export interface NXTTool {
  id: "nxt_data" | "nxt_profiling" | "nxt_training" | "nxt_finance";
  label: string;
  prix: string;
  disponible: boolean;
}

export const NXT_TOOLS: Record<string, NXTTool> = {
  nxt_data:      { id: "nxt_data",      label: "NXT Data",      prix: "9\u20AC/mois",    disponible: true },
  nxt_profiling: { id: "nxt_profiling", label: "NXT Profiling", prix: "pay-per-use", disponible: true },
  nxt_training:  { id: "nxt_training",  label: "NXT Training",  prix: "+10\u20AC/mois",  disponible: true },
  nxt_finance:   { id: "nxt_finance",   label: "NXT Finance",   prix: "+10\u20AC/mois",  disponible: false },
};

const TOOL_AXIS_IMPACT: Record<string, Partial<Record<string, number>>> = {
  nxt_data: {
    intensite_commerciale: 8, generation_opportunites: 6, solidite_portefeuille: 5,
    maitrise_ratios: 14, valorisation_economique: 4, pilotage_strategique: 12,
  },
  nxt_profiling: {
    intensite_commerciale: 5, generation_opportunites: 12, solidite_portefeuille: 10,
    maitrise_ratios: 0, valorisation_economique: 10, pilotage_strategique: 0,
  },
  nxt_training: {
    intensite_commerciale: 14, generation_opportunites: 8, solidite_portefeuille: 12,
    maitrise_ratios: 10, valorisation_economique: 8, pilotage_strategique: 6,
  },
  nxt_finance: {
    intensite_commerciale: 0, generation_opportunites: 0, solidite_portefeuille: 0,
    maitrise_ratios: 0, valorisation_economique: 12, pilotage_strategique: 10,
  },
};

const AXIS_CA_IMPACT_PER_10PTS: Record<string, number> = {
  intensite_commerciale: 0.03,
  generation_opportunites: 0.04,
  solidite_portefeuille: 0.025,
  maitrise_ratios: 0.03,
  valorisation_economique: 0.045,
  pilotage_strategique: 0.02,
};

const CA_MAX_GAIN_RATIO = 0.20;

const CA_BASE_BY_RANGE: Record<string, number> = {
  moins_100k: 65000,
  "100_250k": 175000,
  "250_500k": 375000,
  plus_500k: 600000,
};

export interface CAAdditionnel {
  bas: number;
  haut: number;
}

export interface DPIProjection {
  palier: "3m" | "6m" | "9m";
  label: string;
  tools: NXTTool[];
  axes: DPIAxis[];
  globalScore: number;
  deltaGlobal: number;
  primaryTool: NXTTool;
  caAdditionnel: CAAdditionnel;
}

export function computeCAAdditionnel(
  caBase: number,
  currentAxes: DPIAxis[],
  projectedAxes: DPIAxis[]
): CAAdditionnel {
  let totalImpact = 0;
  for (const projected of projectedAxes) {
    const current = currentAxes.find((a) => a.id === projected.id);
    if (!current) continue;
    const delta = projected.score - current.score;
    if (delta <= 0) continue;
    const coeff = AXIS_CA_IMPACT_PER_10PTS[projected.id] ?? 0.02;
    const diminishedDelta = delta > 20 ? 20 + (delta - 20) * 0.4 : delta;
    totalImpact += (diminishedDelta / 10) * coeff;
  }
  const maxGain = caBase * CA_MAX_GAIN_RATIO;
  const caEstime = Math.min(caBase * totalImpact, maxGain);
  return {
    bas: Math.round(caEstime * 0.65 / 1000) * 1000,
    haut: Math.round(caEstime / 1000) * 1000,
  };
}

export function caBaseFromRange(caRange?: string): number {
  return CA_BASE_BY_RANGE[caRange ?? "100_250k"] ?? 175000;
}

function getPriorityTool(weakestAxisId: string): string {
  const map: Record<string, string> = {
    intensite_commerciale: "nxt_training",
    generation_opportunites: "nxt_profiling",
    solidite_portefeuille: "nxt_profiling",
    maitrise_ratios: "nxt_data",
    valorisation_economique: "nxt_training",
    pilotage_strategique: "nxt_data",
  };
  return map[weakestAxisId] ?? "nxt_data";
}

function applyToolsImpact(axes: DPIAxis[], toolIds: string[], months: number): DPIAxis[] {
  return axes.map((axis) => {
    let totalDelta = 0;
    for (const toolId of toolIds) {
      const impact = TOOL_AXIS_IMPACT[toolId]?.[axis.id] ?? 0;
      totalDelta += impact * (months / 3);
    }
    totalDelta = Math.min(totalDelta, 30);
    return { ...axis, score: Math.min(100, Math.round(axis.score + totalDelta)) };
  });
}

export function computeDPIProjections(currentAxes: DPIAxis[], caBase?: number): DPIProjection[] {
  if (!currentAxes.length) return [];

  const ca = caBase ?? 175000;
  const weakestAxisId = currentAxes.reduce(
    (prev, curr) => curr.score < prev.score ? curr : prev
  ).id;
  const priorityToolId = getPriorityTool(weakestAxisId);
  const currentGlobal = Math.round(
    currentAxes.reduce((a, b) => a + b.score, 0) / currentAxes.length
  );

  const tools3m = [...new Set([priorityToolId, "nxt_data"])];
  const axes3m = applyToolsImpact(currentAxes, tools3m, 3);
  const score3m = Math.round(axes3m.reduce((a, b) => a + b.score, 0) / axes3m.length);

  const tools6m = [...new Set([...tools3m, "nxt_training"])];
  const axes6m = applyToolsImpact(currentAxes, tools6m, 6);
  const score6m = Math.round(axes6m.reduce((a, b) => a + b.score, 0) / axes6m.length);

  const tools9m = ["nxt_data", "nxt_profiling", "nxt_training", "nxt_finance"];
  const axes9m = applyToolsImpact(currentAxes, tools9m, 9);
  const score9m = Math.round(axes9m.reduce((a, b) => a + b.score, 0) / axes9m.length);

  function applyMaturity(raw: CAAdditionnel, factor: number): CAAdditionnel {
    return {
      bas: Math.round(raw.bas * factor / 1000) * 1000,
      haut: Math.round(raw.haut * factor / 1000) * 1000,
    };
  }

  return [
    { palier: "3m", label: "+3 mois", tools: tools3m.map((id) => NXT_TOOLS[id]), axes: axes3m, globalScore: score3m, deltaGlobal: score3m - currentGlobal, primaryTool: NXT_TOOLS[priorityToolId], caAdditionnel: applyMaturity(computeCAAdditionnel(ca, currentAxes, axes3m), 0.30) },
    { palier: "6m", label: "+6 mois", tools: tools6m.map((id) => NXT_TOOLS[id]), axes: axes6m, globalScore: score6m, deltaGlobal: score6m - currentGlobal, primaryTool: NXT_TOOLS["nxt_training"], caAdditionnel: applyMaturity(computeCAAdditionnel(ca, currentAxes, axes6m), 0.65) },
    { palier: "9m", label: "+9 mois", tools: tools9m.map((id) => NXT_TOOLS[id]), axes: axes9m, globalScore: score9m, deltaGlobal: score9m - currentGlobal, primaryTool: NXT_TOOLS["nxt_finance"], caAdditionnel: computeCAAdditionnel(ca, currentAxes, axes9m) },
  ];
}
