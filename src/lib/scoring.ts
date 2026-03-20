import type { ComputedRatio, RatioId } from "@/types/ratios";
import { MARKET_BENCHMARKS } from "@/data/mock-benchmark";

export type ScoreLevel = "top" | "bon" | "moyen" | "faible" | "critique";

export interface HumanScore {
  level: ScoreLevel;
  label: string;
  color: string;
  bgColor: string;
  vsMarket: "above" | "at" | "below";
  marketAverage: number;
}

const SCORE_CONFIG: Record<ScoreLevel, { label: string; color: string; bgColor: string }> = {
  top:      { label: "Top performer",   color: "text-green-500",  bgColor: "bg-green-500/15" },
  bon:      { label: "Bon niveau",      color: "text-green-500",  bgColor: "bg-green-500/10" },
  moyen:    { label: "Dans la moyenne", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  faible:   { label: "En dessous",      color: "text-orange-500", bgColor: "bg-orange-500/15" },
  critique: { label: "Critique",        color: "text-red-500",    bgColor: "bg-red-500/15" },
};

export function getHumanScore(ratio: ComputedRatio): HumanScore {
  const benchmark = MARKET_BENCHMARKS[ratio.ratioId as RatioId];
  if (!benchmark) {
    return {
      level: "moyen",
      label: "Moyen",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      vsMarket: "at",
      marketAverage: 0,
    };
  }

  const pct = ratio.percentageOfTarget;
  const value = ratio.value;

  let level: ScoreLevel;
  if (pct >= 120 && value >= benchmark.topPerformer) {
    level = "top";
  } else if (pct >= 100) {
    level = "bon";
  } else if (pct >= 80 || value >= benchmark.marketAverage) {
    level = "moyen";
  } else if (pct >= 50) {
    level = "faible";
  } else {
    level = "critique";
  }

  const vsMarket: "above" | "at" | "below" =
    value > benchmark.marketAverage * 1.1 ? "above" :
    value >= benchmark.marketAverage * 0.9 ? "at" : "below";

  return {
    level,
    ...SCORE_CONFIG[level],
    vsMarket,
    marketAverage: benchmark.marketAverage,
  };
}

export function getGlobalScore(ratios: ComputedRatio[]): {
  score: number;
  level: ScoreLevel;
  label: string;
  color: string;
  bgColor: string;
} {
  if (ratios.length === 0) {
    return { score: 0, level: "critique", label: "Aucune donnée", color: "text-red-500", bgColor: "bg-red-500/15" };
  }

  const avg = Math.round(
    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length
  );

  let level: ScoreLevel;
  if (avg >= 120) level = "top";
  else if (avg >= 100) level = "bon";
  else if (avg >= 80) level = "moyen";
  else if (avg >= 50) level = "faible";
  else level = "critique";

  return { score: avg, level, ...SCORE_CONFIG[level] };
}
