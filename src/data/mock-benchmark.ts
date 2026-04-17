import type { RatioId } from "@/types/ratios";

export interface MarketBenchmark {
  marketAverage: number;
  topPerformer: number;
  isLowerBetter: boolean;
  unit: string;
}

// Values are in the SAME unit as ratio values (raw ratio values, not percentages)
// For isLowerBetter ratios: lower = better (fewer contacts per RDV = better)
// Calibrated for French real estate market
export const MARKET_BENCHMARKS: Record<RatioId, MarketBenchmark> = {
  contacts_rdv: {
    marketAverage: 5,
    topPerformer: 2.9,
    isLowerBetter: true,
    unit: "contacts/RDV",
  },
  rdv_mandats: {
    // 50% conversion → 2 RDV/mandat, top 70% → ~1.4
    marketAverage: 2,
    topPerformer: 1.4,
    isLowerBetter: true,
    unit: "RDV/mandat",
  },
  pct_mandats_exclusifs: {
    marketAverage: 25,
    topPerformer: 50,
    isLowerBetter: false,
    unit: "%",
  },
  acheteurs_visites: {
    // Moyenne 2 visites / acheteur, top 3
    marketAverage: 2,
    topPerformer: 3,
    isLowerBetter: false,
    unit: "visites/acheteur",
  },
  visites_offre: {
    marketAverage: 10,
    topPerformer: 5,
    isLowerBetter: true,
    unit: "visites/offre",
  },
  offres_compromis: {
    marketAverage: 2.2,
    topPerformer: 1.5,
    isLowerBetter: true,
    unit: "offres/compromis",
  },
  compromis_actes: {
    // 85% conversion → ~1.18, top 95% → ~1.05
    marketAverage: 1.2,
    topPerformer: 1.05,
    isLowerBetter: true,
    unit: "compromis/acte",
  },
  honoraires_moyens: {
    marketAverage: 9000,
    topPerformer: 13000,
    isLowerBetter: false,
    unit: "€",
  },
};

export function formatBenchmark(ratioId: RatioId): string {
  const b = MARKET_BENCHMARKS[ratioId];
  if (!b) return "";
  if (b.unit === "%") return `Moy. marché : ${b.marketAverage}%`;
  return `Moy. marché : ${Number.isInteger(b.marketAverage) ? b.marketAverage : b.marketAverage.toFixed(1)} ${b.unit}`;
}
