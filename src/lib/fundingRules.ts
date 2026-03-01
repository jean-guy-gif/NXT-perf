import type { NatureActiviteMicro } from "@/lib/plan-storage";

export const RULES_VERSION = "v1";

export interface YearCap {
  annualCapEUR: number; // 0 = "montant à confirmer"
}

export interface FundingBodyRules {
  label: string;
  byYear: Record<string, YearCap>;
}

export interface FundingRules {
  version: string;
  AGEFICE: FundingBodyRules;
  OPCO_EP: FundingBodyRules;
}

export const fundingRules: FundingRules = {
  version: RULES_VERSION,
  AGEFICE: {
    label: "AGEFICE",
    byYear: {
      "2025": { annualCapEUR: 0 },
      "2026": { annualCapEUR: 0 },
      "2027": { annualCapEUR: 0 },
    },
  },
  OPCO_EP: {
    label: "OPCO EP",
    byYear: {
      "2025": { annualCapEUR: 0 },
      "2026": { annualCapEUR: 0 },
      "2027": { annualCapEUR: 0 },
    },
  },
};

export type FundingBodyId = "AGEFICE" | "AGEFICE_MICRO" | "OPCO_EP" | "FAF_A_CONFIRMER" | "INCONNU";

export function getCapForYear(bodyId: FundingBodyId, year: string): number | null {
  if (bodyId === "AGEFICE" || bodyId === "AGEFICE_MICRO") {
    const cap = fundingRules.AGEFICE.byYear[year];
    return cap ? cap.annualCapEUR : null;
  }
  if (bodyId === "OPCO_EP") {
    const cap = fundingRules.OPCO_EP.byYear[year];
    return cap ? cap.annualCapEUR : null;
  }
  return null;
}

export function getFundingLabel(bodyId: FundingBodyId): string {
  switch (bodyId) {
    case "AGEFICE": return "AGEFICE";
    case "AGEFICE_MICRO": return "AGEFICE (micro-entrepreneur)";
    case "OPCO_EP": return "OPCO EP";
    case "FAF_A_CONFIRMER": return "FAF à confirmer (AGEFICE / FIFPL / autre)";
    case "INCONNU": return "Inconnu";
  }
}

// ─── Micro-entrepreneur CFP ─────────────────────────────────────────

export const MICRO_CFP_RATES: Record<Exclude<NatureActiviteMicro, "">, number> = {
  COMMERCIALE_VENTE: 0.001,
  PRESTATIONS_SERVICES_LIBERAL: 0.002,
  ARTISANALE: 0.003,
};

export const MICRO_NATURE_LABELS: Record<Exclude<NatureActiviteMicro, "">, string> = {
  COMMERCIALE_VENTE: "Commerciale / vente (0,1 %)",
  PRESTATIONS_SERVICES_LIBERAL: "Prestations de services / libéral (0,2 %)",
  ARTISANALE: "Artisanale (0,3 %)",
};

export function computeMicroCap(nature: NatureActiviteMicro, caN1: number): {
  cfp: number;
  annualCap: number;
} {
  if (!nature || caN1 <= 0) return { cfp: 0, annualCap: 0 };
  const rate = MICRO_CFP_RATES[nature];
  const cfp = Math.round(caN1 * rate * 100) / 100;
  let annualCap: number;
  if (cfp === 0) annualCap = 0;
  else if (cfp < 7) annualCap = 500;
  else annualCap = 3000;
  return { cfp, annualCap };
}
