import { describe, it, expect } from "vitest";
import { DEMO_PROFILES, DEMO_PROFILE_USER_ID } from "@/data/demo-profiles";
import { aggregateLastMonths } from "@/lib/aggregate-results";
import {
  computeAllRatios,
  DIAGNOSTIC_WINDOW_MONTHS,
  COMPROMIS_ACTES_WINDOW_MONTHS,
} from "@/lib/ratios";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { detectBiggestPainPoint } from "@/lib/pain-point-detector";
import { bucketTeamSize, type ThresholdContext } from "@/lib/diagnostic/resolve-threshold";

// Contexte équivalent à celui du user démo (confirmé ; statut null ; équipe
// 2-5 ; commission d'agence 12 000 €). Les profils démo sont tous confirmés.
const ctx: ThresholdContext = {
  seniority: "confirme",
  agentStatus: null,
  teamSizeBucket: bucketTeamSize(3),
  avgCommissionEur: 12000,
};

describe("profils démo — point de douleur attendu sur l'agrégat 3 mois", () => {
  const profiles = DEMO_PROFILES.filter((p) => p.id !== "actuel");

  profiles.forEach((p) => {
    it(`${p.label} → ${p.expectedPainPoint}`, () => {
      const agg3 = aggregateLastMonths(
        p.results,
        DEMO_PROFILE_USER_ID,
        DIAGNOSTIC_WINDOW_MONTHS
      );
      const agg6 = aggregateLastMonths(
        p.results,
        DEMO_PROFILE_USER_ID,
        COMPROMIS_ACTES_WINDOW_MONTHS
      );
      expect(agg3).not.toBeNull();
      const computed = computeAllRatios(agg3!, "confirme");
      const measured = buildMeasuredRatios(computed, agg3, agg6);
      const top = detectBiggestPainPoint(measured, ctx);
      expect(top?.expertiseId).toBe(p.expectedPainPoint);
    });
  });

  it("l'agrégat 3 mois reproduit les volumes cible (Léa)", () => {
    const lea = DEMO_PROFILES.find((p) => p.id === "lea")!;
    const agg3 = aggregateLastMonths(lea.results, DEMO_PROFILE_USER_ID, 3)!;
    expect(agg3.prospection.contactsTotaux).toBe(180);
    expect(agg3.vendeurs.estimationsRealisees).toBe(18);
    expect(agg3.vendeurs.mandatsSignes).toBe(3);
    expect(agg3.acheteurs.offresRecues).toBe(3);
    expect(agg3.acheteurs.compromisSignes).toBe(3);
  });

  it("la fenêtre 6 mois garde compromis/actes = cible (pas de fuite)", () => {
    // Les mois pont (juin-août) sont sans vente → 6 mois ≈ 3 mois côté aval.
    const karim = DEMO_PROFILES.find((p) => p.id === "karim")!;
    const agg6 = aggregateLastMonths(karim.results, DEMO_PROFILE_USER_ID, 6)!;
    expect(agg6.acheteurs.compromisSignes).toBe(3);
    expect(agg6.ventes.actesSignes).toBe(3);
  });
});
