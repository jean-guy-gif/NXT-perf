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
    // 20% conversion → 5 contacts/RDV, top 35% → ~2.9
    marketAverage: 5,
    topPerformer: 2.9,
    isLowerBetter: true,
    unit: "contacts/RDV",
  },
  estimations_mandats: {
    // 50% conversion → 2 est/mandat, top 70% → ~1.4
    marketAverage: 2,
    topPerformer: 1.4,
    isLowerBetter: true,
    unit: "estimations/mandat",
  },
  pct_mandats_exclusifs: {
    // Percentage ratio — values stay as %
    marketAverage: 25,
    topPerformer: 50,
    isLowerBetter: false,
    unit: "%",
  },
  visites_offre: {
    // 10% conversion → 10 visites/offre, top 20% → 5
    marketAverage: 10,
    topPerformer: 5,
    isLowerBetter: true,
    unit: "visites/offre",
  },
  offres_compromis: {
    // 45% conversion → ~2.2 offres/compromis, top 65% → ~1.5
    marketAverage: 2.2,
    topPerformer: 1.5,
    isLowerBetter: true,
    unit: "offres/compromis",
  },
  mandats_simples_vente: {
    // 15% conversion → ~6.7 mandats/vente, top 30% → ~3.3
    marketAverage: 6.7,
    topPerformer: 3.3,
    isLowerBetter: true,
    unit: "mandats/vente",
  },
  mandats_exclusifs_vente: {
    // 40% conversion → 2.5 mandats/vente, top 60% → ~1.7
    marketAverage: 2.5,
    topPerformer: 1.7,
    isLowerBetter: true,
    unit: "mandats/vente",
  },
};

export function formatBenchmark(ratioId: RatioId): string {
  const b = MARKET_BENCHMARKS[ratioId];
  if (!b) return "";
  if (b.unit === "%") return `Moy. marché : ${b.marketAverage}%`;
  return `Moy. marché : ${Number.isInteger(b.marketAverage) ? b.marketAverage : b.marketAverage.toFixed(1)} ${b.unit}`;
}
