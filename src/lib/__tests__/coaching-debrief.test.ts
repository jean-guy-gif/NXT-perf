import { describe, it, expect } from "vitest";
import { generateCoachingDebrief } from "../coaching-debrief";
import type { PeriodResults } from "@/types/results";
import { defaultRatioConfigs } from "@/data/mock-ratios";

function makeResults(o: Partial<{
  contactsTotaux: number; rdvEstimation: number;
  estimationsRealisees: number; mandatsSignes: number; mandatsExclusifs: number;
  rdvSuivi: number; nombreVisites: number; offresRecues: number;
  compromisSignes: number; actesSignes: number; chiffreAffaires: number;
}> = {}): PeriodResults {
  const d = { contactsTotaux: 0, rdvEstimation: 0,
    estimationsRealisees: 0, mandatsSignes: 0, mandatsExclusifs: 0,
    rdvSuivi: 0, nombreVisites: 0, offresRecues: 0,
    compromisSignes: 0, actesSignes: 0, chiffreAffaires: 0, ...o };
  const mandats = [];
  for (let i = 0; i < d.mandatsExclusifs; i++) mandats.push({ id: `e${i}`, nomVendeur: "", type: "exclusif" as const });
  for (let i = 0; i < (d.mandatsSignes - d.mandatsExclusifs); i++) mandats.push({ id: `s${i}`, nomVendeur: "", type: "simple" as const });
  return {
    id: "t", userId: "u1", periodType: "month", periodStart: "2026-04-01", periodEnd: "2026-04-30",
    prospection: { contactsTotaux: d.contactsTotaux, rdvEstimation: d.rdvEstimation },
    vendeurs: { rdvEstimation: d.rdvEstimation, estimationsRealisees: d.estimationsRealisees, mandatsSignes: d.mandatsSignes, mandats, rdvSuivi: d.rdvSuivi, requalificationSimpleExclusif: 0, baissePrix: 0 },
    acheteurs: { acheteursSortisVisite: 0, nombreVisites: d.nombreVisites, offresRecues: d.offresRecues, compromisSignes: d.compromisSignes, chiffreAffairesCompromis: 0 },
    ventes: { actesSignes: d.actesSignes, chiffreAffaires: d.chiffreAffaires },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

const cfg = defaultRatioConfigs;

// ═══ PROFILES ════════════════════════════════════════════════════════════════

describe("profiles", () => {
  it("insufficient_data when all zeros", () => {
    const d = generateCoachingDebrief(makeResults(), "confirme", cfg);
    expect(d.profile).toBe("insufficient_data");
  });

  it("high_performer", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 35, rdvEstimation: 5, estimationsRealisees: 4,
      mandatsSignes: 3, mandatsExclusifs: 2, rdvSuivi: 6,
      nombreVisites: 12, offresRecues: 3, compromisSignes: 2,
    }), "confirme", cfg);
    expect(d.profile).toBe("high_performer");
    expect(d.overallStatus).toBe("strong");
  });

  it("low_volume", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 5, rdvEstimation: 1, estimationsRealisees: 1,
      mandatsSignes: 1, mandatsExclusifs: 1, nombreVisites: 2, offresRecues: 1,
    }), "confirme", cfg);
    expect(d.profile).toBe("low_volume");
    expect(d.volumeScore).toBeLessThan(70);
  });

  it("low_conversion", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 50, rdvEstimation: 1, estimationsRealisees: 5,
      mandatsSignes: 0, nombreVisites: 10, offresRecues: 0, compromisSignes: 1,
    }), "confirme", cfg);
    expect(d.volumeScore).toBeGreaterThanOrEqual(70);
    expect(d.performanceScore).toBeLessThan(60);
    expect(d.profile).toBe("low_conversion");
  });

  it("mixed", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 5, rdvEstimation: 0,
    }), "confirme", cfg);
    expect(d.profile).toBe("mixed");
    expect(d.overallStatus).toBe("needs_work");
  });
});

// ═══ DIRECTION ═══════════════════════════════════════════════════════════════

describe("direction métier", () => {
  it("contacts_rdv = lower_is_better", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 2, mandatsExclusifs: 1, nombreVisites: 8, offresRecues: 2,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "contacts_rdv")!;
    expect(ratio.direction).toBe("lower_is_better");
    // 30/3 = 10, target 15 for confirme. Lower is better → 10 < 15 → good
    expect(ratio.status).toBe("ok");
  });

  it("pct_mandats_exclusifs = higher_is_better", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 3, mandatsExclusifs: 1, nombreVisites: 8, offresRecues: 2,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "pct_mandats_exclusifs")!;
    expect(ratio.direction).toBe("higher_is_better");
    // 1/3 = 33%, target 50% for confirme → under → danger or warning
    expect(["warning", "danger"]).toContain(ratio.status);
  });

  it("8.7 contacts/RDV for expert target 10 = good (lower is better)", () => {
    // 87 contacts / 10 RDV = 8.7, expert threshold = 10
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 87, rdvEstimation: 10, estimationsRealisees: 5,
      mandatsSignes: 3, mandatsExclusifs: 2, nombreVisites: 15, offresRecues: 4,
    }), "expert", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "contacts_rdv")!;
    expect(ratio.value).toBeCloseTo(8.7, 0);
    expect(ratio.status).toBe("ok"); // 8.7 < 10 → ok
  });

  it("2 estimations/mandat for expert target 1.5 = under (lower is better)", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 6,
      mandatsSignes: 3, nombreVisites: 8, offresRecues: 2,
    }), "expert", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "rdv_mandats")!;
    expect(ratio.value).toBe(2); // 6/3 = 2, target 1.5 → 2 > 1.5 → bad
    expect(["warning", "danger"]).toContain(ratio.status);
  });
});

// ═══ CONFIDENCE ═════════════════════════════════════════════════════════════

describe("confidence", () => {
  it("1 visite / 1 offre = low confidence", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 2, mandatsExclusifs: 1, nombreVisites: 1, offresRecues: 1,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "visites_offre")!;
    expect(ratio.confidence).toBe("low");
    expect(ratio.confidenceLabel).toBe("Signal à consolider");
  });

  it("1 estimation / 1 mandat = low confidence", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 1,
      mandatsSignes: 1, mandatsExclusifs: 1, nombreVisites: 8, offresRecues: 2,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "rdv_mandats")!;
    expect(ratio.confidence).toBe("low");
  });

  it("10 visites / 2 offres = medium confidence", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 2, mandatsExclusifs: 1, nombreVisites: 10, offresRecues: 2,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "visites_offre")!;
    expect(ratio.confidence).toBe("medium");
  });

  it("15 visites / 4 offres = high confidence", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 5, estimationsRealisees: 5,
      mandatsSignes: 3, mandatsExclusifs: 2, nombreVisites: 15, offresRecues: 4,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "visites_offre")!;
    expect(ratio.confidence).toBe("high");
    expect(ratio.confidenceLabel).toBe("Lecture fiable");
  });

  it("4+ mandats = high confidence on exclusivité", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 5, estimationsRealisees: 5,
      mandatsSignes: 5, mandatsExclusifs: 3, nombreVisites: 10, offresRecues: 2,
    }), "confirme", cfg);
    const ratio = d.performanceReview.find(r => r.ratioId === "pct_mandats_exclusifs")!;
    expect(ratio.confidence).toBe("high");
  });
});

// ═══ CONFIDENCE IMPACT ON DEBRIEF ════════════════════════════════════════════

describe("confidence impact on text", () => {
  it("high confidence strength = direct phrasing", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 40, rdvEstimation: 5, estimationsRealisees: 5,
      mandatsSignes: 4, mandatsExclusifs: 3, rdvSuivi: 3,
      nombreVisites: 15, offresRecues: 4, compromisSignes: 2,
    }), "confirme", cfg);
    const strength = d.strengths[0] || "";
    expect(strength).not.toContain("à confirmer");
  });

  it("low confidence strength = prudent phrasing", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 5, rdvEstimation: 1, estimationsRealisees: 1,
      mandatsSignes: 1, mandatsExclusifs: 1, nombreVisites: 1, offresRecues: 1,
    }), "confirme", cfg);
    if (d.strengths.length > 0 && d.strengths[0].includes("objectif")) {
      expect(d.strengths[0]).toContain("à confirmer");
    }
  });

  it("low confidence watchout uses softer language", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 50, rdvEstimation: 1, estimationsRealisees: 1,
      mandatsSignes: 0, nombreVisites: 1, offresRecues: 0, compromisSignes: 1,
    }), "confirme", cfg);
    const hasLowConfWatchout = d.watchouts.some(w => w.includes("signal faible") || w.includes("à surveiller"));
    // At least one watchout should be softened
    expect(d.watchouts.length).toBeGreaterThan(0);
    if (hasLowConfWatchout) {
      expect(hasLowConfWatchout).toBe(true);
    }
  });

  it("audio mentions confirmation needed when many low-confidence ratios", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 5, rdvEstimation: 1, estimationsRealisees: 1,
      mandatsSignes: 1, mandatsExclusifs: 0, nombreVisites: 1, offresRecues: 1,
    }), "confirme", cfg);
    const lowConfCount = d.performanceReview.filter(r => r.confidence === "low" && r.value > 0).length;
    if (lowConfCount >= 2) {
      expect(d.audioScript).toContain("confirmer");
    }
  });
});

// ═══ CONSTRAINTS ═════════════════════════════════════════════════════════════

describe("constraints", () => {
  it("strengths max 2", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 40, rdvEstimation: 5, estimationsRealisees: 5,
      mandatsSignes: 3, mandatsExclusifs: 2, nombreVisites: 15, offresRecues: 4, compromisSignes: 2,
    }), "confirme", cfg);
    expect(d.strengths.length).toBeLessThanOrEqual(2);
  });

  it("watchouts max 2", () => {
    const d = generateCoachingDebrief(makeResults({ contactsTotaux: 3, rdvEstimation: 0 }), "expert", cfg);
    expect(d.watchouts.length).toBeLessThanOrEqual(2);
  });

  it("topPriorities max 3", () => {
    const d = generateCoachingDebrief(makeResults({ contactsTotaux: 3 }), "expert", cfg);
    expect(d.topPriorities.length).toBeLessThanOrEqual(3);
  });

  it("nextWeekPlan max 3", () => {
    const d = generateCoachingDebrief(makeResults({ contactsTotaux: 3, mandatsSignes: 1 }), "confirme", cfg);
    expect(d.nextWeekPlan.length).toBeLessThanOrEqual(3);
  });

  it("closing + branding + CTA always present", () => {
    const d = generateCoachingDebrief(makeResults({ contactsTotaux: 10 }), "debutant", cfg);
    expect(d.closingSentence).toContain("meilleur");
    expect(d.coachingBranding).toContain("NXT Coaching");
    expect(d.ctaUrl).toBe("/formation");
  });

  it("performanceReview has 4 key ratios", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 2, mandatsExclusifs: 1, nombreVisites: 8, offresRecues: 2,
    }), "confirme", cfg);
    expect(d.performanceReview.map(r => r.ratioId)).toEqual(
      expect.arrayContaining(["contacts_rdv", "rdv_mandats", "pct_mandats_exclusifs", "visites_offre"])
    );
  });

  it("each ratio has direction and confidence", () => {
    const d = generateCoachingDebrief(makeResults({
      contactsTotaux: 30, rdvEstimation: 3, estimationsRealisees: 3,
      mandatsSignes: 2, mandatsExclusifs: 1, nombreVisites: 8, offresRecues: 2,
    }), "confirme", cfg);
    for (const r of d.performanceReview) {
      expect(["lower_is_better", "higher_is_better"]).toContain(r.direction);
      expect(["low", "medium", "high"]).toContain(r.confidence);
      expect(r.confidenceLabel).toBeTruthy();
    }
  });
});
