/**
 * AGEFICE — Règles de financement 2025-2026-2027
 *
 * RÉFÉRENCE CFP — ANNÉE N-1
 * ─────────────────────────
 * La CFP (Contribution à la Formation Professionnelle) prise en référence
 * pour le calcul du plafond AGEFICE est celle de l'année N-1 :
 *   - L'attestation URSSAF "Contribution Formation Professionnelle" délivrée
 *     en année N concerne les cotisations versées sur l'année N-1.
 *   - Pour un micro-entrepreneur, ces cotisations sont calculées sur le
 *     chiffre d'affaires N-2 (déclaré en N-1).
 *
 * Exemple : un dossier déposé en 2026 utilise l'attestation URSSAF 2025
 * (cotisations 2025 sur CA 2024) pour qualifier l'éligibilité.
 *
 * MATRICE PLAFONDS AGEFICE (par année civile)
 * ─────────────────────────────────────────────
 *   CFP = 0 €                                 → non éligible (0 €)
 *   0 < CFP < 7 €                             → 600 €/an
 *   CFP ≥ 7 €                                 → 3 000 €/an
 *   CFP ≥ 7 € + formation RNCP/diplômante     → 5 000 €/an (plafond majoré)
 *
 * Source : règles AGEFICE 2025-2026 (Mallette du Dirigeant)
 */

import type { NatureActiviteMicro } from "@/lib/plan-storage";

export const RULES_VERSION = "v2-2026";

export interface YearCap {
  annualCapEUR: number; // 0 = "non éligible / montant à confirmer"
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

/**
 * Plafonds annuels par année et par organisme.
 *
 * Pour AGEFICE, la valeur stockée ici est le plafond standard (cas CFP ≥ 7 €,
 * formation non-RNCP). Le calcul conditionnel précis (CFP=0, CFP<7, RNCP)
 * est délégué à computeAnnualCap() qui prend la CFP en paramètre.
 *
 * OPCO EP reste à 0 € (hors scope V1 — workflow employeur séparé).
 */
export const fundingRules: FundingRules = {
  version: RULES_VERSION,
  AGEFICE: {
    label: "AGEFICE",
    byYear: {
      "2025": { annualCapEUR: 3000 },
      "2026": { annualCapEUR: 3000 },
      "2027": { annualCapEUR: 3000 },
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

// ─── Plafond annuel conditionnel CFP + RNCP ─────────────────────────

export interface AnnualCapResult {
  capEur: number;
  reason: string;
}

/**
 * Détermine le plafond AGEFICE annuel en fonction du montant de CFP versé
 * (année N-1) et du caractère RNCP/diplômant de la formation.
 *
 * @param cfpAmount Montant CFP en euros (depuis attestation URSSAF N-1)
 * @param isRncp    true si la formation est inscrite au RNCP / diplômante
 *
 * Cas couverts :
 *   1. cfpAmount ≤ 0 → non éligible (0 €)
 *   2. 0 < cfpAmount < 7 € → 600 €/an
 *   3. cfpAmount ≥ 7 €, formation standard → 3 000 €/an
 *   4. cfpAmount ≥ 7 €, formation RNCP/diplômante → 5 000 €/an (majoré)
 */
export function computeAnnualCap(cfpAmount: number, isRncp: boolean): AnnualCapResult {
  if (!Number.isFinite(cfpAmount) || cfpAmount <= 0) {
    return {
      capEur: 0,
      reason: "CFP nulle ou non versée → dossier AGEFICE non éligible",
    };
  }
  if (cfpAmount < 7) {
    return {
      capEur: 600,
      reason: `CFP versée < 7 € (${cfpAmount.toFixed(2)} €) → plafond réduit 600 €/an`,
    };
  }
  if (isRncp) {
    return {
      capEur: 5000,
      reason: `CFP ≥ 7 € + formation RNCP/diplômante → plafond majoré 5 000 €/an`,
    };
  }
  return {
    capEur: 3000,
    reason: `CFP ≥ 7 € (${cfpAmount.toFixed(2)} €) → plafond standard 3 000 €/an`,
  };
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

/**
 * Calcule la CFP estimée d'un micro-entrepreneur (depuis CA N-1) et le plafond
 * AGEFICE annuel correspondant. Logique alignée sur computeAnnualCap (cas
 * standard, formation non-RNCP).
 *
 * Pour le cas RNCP majoré, utiliser directement computeAnnualCap(cfp, true).
 */
export function computeMicroCap(nature: NatureActiviteMicro, caN1: number): {
  cfp: number;
  annualCap: number;
} {
  if (!nature || caN1 <= 0) return { cfp: 0, annualCap: 0 };
  const rate = MICRO_CFP_RATES[nature];
  const cfp = Math.round(caN1 * rate * 100) / 100;
  const { capEur } = computeAnnualCap(cfp, false);
  return { cfp, annualCap: capEur };
}
