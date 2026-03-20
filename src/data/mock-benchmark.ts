import type { RatioId } from "@/types/ratios";

export interface MarketBenchmark {
  marketAverage: number;
  topPerformer: number;
  label: string;
}

export const MARKET_BENCHMARKS: Record<RatioId, MarketBenchmark> = {
  contacts_rdv: {
    marketAverage: 25,
    topPerformer: 40,
    label: "Moy. marché : 25%",
  },
  estimations_mandats: {
    marketAverage: 55,
    topPerformer: 75,
    label: "Moy. marché : 55%",
  },
  pct_mandats_exclusifs: {
    marketAverage: 30,
    topPerformer: 60,
    label: "Moy. marché : 30%",
  },
  visites_offre: {
    marketAverage: 15,
    topPerformer: 25,
    label: "Moy. marché : 15%",
  },
  offres_compromis: {
    marketAverage: 50,
    topPerformer: 70,
    label: "Moy. marché : 50%",
  },
  mandats_simples_vente: {
    marketAverage: 20,
    topPerformer: 35,
    label: "Moy. marché : 20%",
  },
  mandats_exclusifs_vente: {
    marketAverage: 45,
    topPerformer: 65,
    label: "Moy. marché : 45%",
  },
};
