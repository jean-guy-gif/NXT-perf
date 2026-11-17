import { describe, it, expect } from "vitest";
import {
  computeAllRatios,
  computeDiagnosticRatios,
  assessMeasurability,
} from "@/lib/ratios";
import { aggregateLastMonths } from "@/lib/aggregate-results";
import {
  detectBiggestPainPoint,
  type MeasuredRatio,
} from "@/lib/pain-point-detector";
import { bucketTeamSize } from "@/lib/diagnostic/resolve-threshold";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { PeriodResults } from "@/types/results";
import type { ComputedRatio } from "@/types/ratios";

// ─── Fabrique de PeriodResults ─────────────────────────────────────────────

function makeResults(overrides: {
  periodStart?: string;
  contactsTotaux?: number;
  rdvEstimation?: number;
  estimations?: number;
  mandatsSignes?: number;
  nbMandats?: number;
  acheteursSortisVisite?: number;
  nombreVisites?: number;
  offresRecues?: number;
  compromisSignes?: number;
  actesSignes?: number;
  chiffreAffaires?: number;
}): PeriodResults {
  const start = overrides.periodStart ?? "2026-06-01";
  return {
    id: `r-${start}`,
    userId: "u1",
    periodType: "month",
    periodStart: start,
    periodEnd: start,
    prospection: {
      contactsTotaux: overrides.contactsTotaux ?? 0,
      rdvEstimation: overrides.rdvEstimation ?? 0,
    },
    vendeurs: {
      rdvEstimation: overrides.estimations ?? 0,
      estimationsRealisees: overrides.estimations ?? 0,
      mandatsSignes: overrides.mandatsSignes ?? 0,
      mandats: Array.from({ length: overrides.nbMandats ?? 0 }, (_, i) => ({
        id: `m${i}`,
        type: i % 2 === 0 ? ("exclusif" as const) : ("simple" as const),
      })),
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: overrides.acheteursSortisVisite ?? 0,
      nombreVisites: overrides.nombreVisites ?? 0,
      offresRecues: overrides.offresRecues ?? 0,
      compromisSignes: overrides.compromisSignes ?? 0,
      chiffreAffairesCompromis: 0,
    },
    ventes: {
      actesSignes: overrides.actesSignes ?? 0,
      chiffreAffaires: overrides.chiffreAffaires ?? 0,
    },
    createdAt: `${start}T00:00:00.000Z`,
    updatedAt: `${start}T00:00:00.000Z`,
  };
}

function byId(ratios: ComputedRatio[], id: string): ComputedRatio {
  const r = ratios.find((x) => x.ratioId === id);
  if (!r) throw new Error(`ratio ${id} introuvable`);
  return r;
}

describe("assessMeasurability — dénominateur nul", () => {
  it("contacts_rdv : rdvEstimation=0 (dénominateur nul) → non mesurable, pas danger", () => {
    // Échantillon suffisant (50 contacts ≥ 10) mais aucun RDV : ratio indéfini.
    const results = makeResults({ contactsTotaux: 50, rdvEstimation: 0 });
    const m = assessMeasurability("contacts_rdv", results);
    expect(m.measurable).toBe(false);
    expect(m.message).toBe("Pas encore assez de données");

    const ratio = byId(computeAllRatios(results, "confirme"), "contacts_rdv");
    expect(ratio.status).toBe("non_mesurable");
    expect(ratio.status).not.toBe("danger");
    expect(ratio.message).toBe("Pas encore assez de données");
  });

  it("honoraires_moyens : actesSignes=0 → non mesurable, pas danger", () => {
    const results = makeResults({ actesSignes: 0, chiffreAffaires: 0 });
    const ratio = byId(
      computeAllRatios(results, "confirme"),
      "honoraires_moyens"
    );
    expect(ratio.status).toBe("non_mesurable");
    expect(ratio.status).not.toBe("danger");
    expect(ratio.message).toBe("Pas encore assez de données");
  });
});

describe("assessMeasurability — échantillon sous le seuil", () => {
  it("contacts_rdv : 4 contacts (<10) → « Encore 6 contacts pour mesurer »", () => {
    const results = makeResults({ contactsTotaux: 4, rdvEstimation: 2 });
    const m = assessMeasurability("contacts_rdv", results);
    expect(m.measurable).toBe(false);
    expect(m.message).toBe("Encore 6 contacts pour mesurer");

    const ratio = byId(computeAllRatios(results, "confirme"), "contacts_rdv");
    expect(ratio.status).toBe("non_mesurable");
    expect(ratio.message).toBe("Encore 6 contacts pour mesurer");
  });

  it("offres_compromis : 1 offre (<3) → « Encore 2 offres pour mesurer »", () => {
    const results = makeResults({ offresRecues: 1, compromisSignes: 1 });
    const ratio = byId(
      computeAllRatios(results, "confirme"),
      "offres_compromis"
    );
    expect(ratio.status).toBe("non_mesurable");
    expect(ratio.message).toBe("Encore 2 offres pour mesurer");
  });

  it("pct_mandats_exclusifs : 2 mandats (<3) → « Encore 1 mandats pour mesurer »", () => {
    const results = makeResults({ nbMandats: 2, mandatsSignes: 2 });
    const ratio = byId(
      computeAllRatios(results, "confirme"),
      "pct_mandats_exclusifs"
    );
    expect(ratio.status).toBe("non_mesurable");
    expect(ratio.message).toBe("Encore 1 mandats pour mesurer");
  });
});

describe("assessMeasurability — ratio mesurable", () => {
  it("échantillon et dénominateur suffisants → statut chiffré (jamais non_mesurable)", () => {
    const results = makeResults({ contactsTotaux: 150, rdvEstimation: 10 });
    const ratio = byId(computeAllRatios(results, "confirme"), "contacts_rdv");
    expect(ratio.status).not.toBe("non_mesurable");
    expect(ratio.message).toBeUndefined();
    expect(ratio.value).toBe(15);
  });
});

describe("pain-point-detector ignore les ratios non_mesurables", () => {
  const ctx = {
    seniority: "confirme" as const,
    agentStatus: null,
    teamSizeBucket: bucketTeamSize(1),
    avgCommissionEur: 5000,
  };

  const basePain: Omit<MeasuredRatio, "legacyStatus"> = {
    expertiseId: "contacts_estimations",
    // Valeur très au-dessus de la cible (less_is_better) → écart réel > 0.
    currentValue: 999,
    volumeBase: 50,
  };

  it("un ratio non_mesurable n'est jamais retourné comme point de douleur", () => {
    const result = detectBiggestPainPoint(
      [{ ...basePain, legacyStatus: "non_mesurable" }],
      ctx
    );
    expect(result).toBeNull();
  });

  it("contrôle : le même ratio en danger EST détecté (prouve que l'écart existe)", () => {
    const result = detectBiggestPainPoint(
      [{ ...basePain, legacyStatus: "danger" }],
      ctx
    );
    expect(result?.expertiseId).toBe("contacts_estimations");
  });
});

describe("fenêtres glissantes 3 mois / 6 mois", () => {
  it("aggregateLastMonths agrège uniquement les 3 mois les plus récents", () => {
    const months = [
      makeResults({ periodStart: "2026-01-01", contactsTotaux: 1 }),
      makeResults({ periodStart: "2026-02-01", contactsTotaux: 10 }),
      makeResults({ periodStart: "2026-03-01", contactsTotaux: 100 }),
      makeResults({ periodStart: "2026-04-01", contactsTotaux: 1000 }),
    ];
    const agg3 = aggregateLastMonths(months, "u1", 3);
    // Les 3 derniers = fév(10) + mars(100) + avr(1000) = 1110 (janvier exclu).
    expect(agg3?.prospection.contactsTotaux).toBe(1110);
  });

  it("computeDiagnosticRatios mesure compromis → actes sur la fenêtre 6 mois", () => {
    // 3 mois : compromis=3, actes=3 → ratio 3m = 1.0
    const agg3 = makeResults({ compromisSignes: 3, actesSignes: 3 });
    // 6 mois : compromis=12, actes=6 → ratio 6m = 2.0
    const agg6 = makeResults({ compromisSignes: 12, actesSignes: 6 });

    const ratios = computeDiagnosticRatios(agg3, agg6, "confirme");
    const compromis = byId(ratios, "compromis_actes");
    // Doit refléter la fenêtre 6 mois (2.0), pas la fenêtre 3 mois (1.0).
    expect(compromis.value).toBe(2);
  });
});
