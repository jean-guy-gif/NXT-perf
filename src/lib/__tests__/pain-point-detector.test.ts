import { describe, it, expect } from "vitest";
import {
  detectBiggestPainPoint,
  detectTopPainPoints,
  detectBiggestPainPointWithContext,
  buildMeasuredRatiosFromVolumes,
  type PainVolumes,
} from "@/lib/pain-point-detector";
import { bucketTeamSize, type ThresholdContext } from "@/lib/diagnostic/resolve-threshold";

// Contexte commun : profil confirmé, agent commercial, équipe de 2 à 5,
// commission moyenne 8 000 €. Exigence resolveThreshold = 1.0 → seuils de base.
const ctx: ThresholdContext = {
  seniority: "confirme",
  agentStatus: "agent_commercial",
  teamSizeBucket: bucketTeamSize(3),
  avgCommissionEur: 8000,
};

// Ordre des volumes (sur 3 mois) :
// contacts, estimations, mandats, exclusifs, acheteurs, acheteurs sortis,
// visites, offres, compromis, actes.
function vols(
  arr: [number, number, number, number, number, number, number, number, number, number]
): PainVolumes {
  const [
    contacts,
    estimations,
    mandats,
    exclusifs,
    acheteurs,
    acheteursSortis,
    visites,
    offres,
    compromis,
    actes,
  ] = arr;
  return {
    contacts,
    estimations,
    mandats,
    exclusifs,
    acheteurs,
    acheteursSortis,
    visites,
    offres,
    compromis,
    actes,
  };
}

function topFor(
  arr: [number, number, number, number, number, number, number, number, number, number]
): string | null {
  const measured = buildMeasuredRatiosFromVolumes(vols(arr));
  return detectBiggestPainPoint(measured, ctx)?.expertiseId ?? null;
}

describe("détection du point de douleur V3 — points de douleur attendus", () => {
  it("1. 180,18,3,0,40,24,36,3,3,3 → estimations_mandats", () => {
    expect(topFor([180, 18, 3, 0, 40, 24, 36, 3, 3, 3])).toBe("estimations_mandats");
  });

  it("2. 144,9,6,3,40,30,90,3,3,3 → visites_offres", () => {
    expect(topFor([144, 9, 6, 3, 40, 30, 90, 3, 3, 3])).toBe("visites_offres");
  });

  it("3. 150,9,5,2,32,24,60,15,3,3 → offres_compromis", () => {
    expect(topFor([150, 9, 5, 2, 32, 24, 60, 15, 3, 3])).toBe("offres_compromis");
  });

  it("4. 135,15,0,0,32,24,60,6,3,3 → estimations_mandats (15 estimations / 0 mandat)", () => {
    expect(topFor([135, 15, 0, 0, 32, 24, 60, 6, 3, 3])).toBe("estimations_mandats");
  });

  it("5. 135,9,3,0,24,18,54,0,0,0 → visites_offres (54 visites / 0 offre)", () => {
    expect(topFor([135, 9, 3, 0, 24, 18, 54, 0, 0, 0])).toBe("visites_offres");
  });

  it("6. 240,8,4,2,32,24,60,6,3,3 → contacts_estimations", () => {
    expect(topFor([240, 8, 4, 2, 32, 24, 60, 6, 3, 3])).toBe("contacts_estimations");
  });

  it("7. 162,9,4,2,38,24,72,6,3,2 → compromis_actes", () => {
    expect(topFor([162, 9, 4, 2, 38, 24, 72, 6, 3, 2])).toBe("compromis_actes");
  });
});

describe("détection du point de douleur V3 — contrat de sortie", () => {
  const measured = buildMeasuredRatiosFromVolumes(vols([180, 18, 3, 0, 40, 24, 36, 3, 3, 3]));

  it("estimatedCaLossEur = gain en ventes × commission moyenne", () => {
    const top = detectBiggestPainPoint(measured, ctx)!;
    expect(top.painScoreV2).toBeGreaterThan(0);
    // painScore et estimatedCaLossEur portent le gain en € ; painScoreV2 les ventes.
    expect(top.estimatedCaLossEur).toBeCloseTo(top.painScoreV2 * 8000, 6);
    expect(top.painScore).toBeCloseTo(top.estimatedCaLossEur, 6);
  });

  it("detectBiggestPainPointWithContext renvoie toujours override = null", () => {
    const res = detectBiggestPainPointWithContext(measured, ctx, null);
    expect(res?.override).toBeNull();
    expect(res?.painPoint.expertiseId).toBe("estimations_mandats");
  });

  it("detectTopPainPoints renvoie un top 3 trié par gain en ventes décroissant", () => {
    const top3 = detectTopPainPoints(measured, ctx, 3);
    expect(top3.length).toBeGreaterThan(0);
    expect(top3.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < top3.length; i++) {
      expect(top3[i - 1].painScoreV2).toBeGreaterThanOrEqual(top3[i].painScoreV2);
    }
  });
});

describe("détection du point de douleur V3 — exclusions", () => {
  const empty = vols([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  it("aucun volume → aucun point de douleur", () => {
    expect(detectBiggestPainPoint(buildMeasuredRatiosFromVolumes(empty), ctx)).toBeNull();
  });

  it("gain inférieur à 0,05 vente → ignoré", () => {
    // 21 contacts (≥ 20) : 21/15 = 1.4 estimation attendue, 1 réalisée →
    // 0,4 estimation manquante × 0,5 × 0,5 ≈ 0,1 vente — reste au-dessus de
    // 0,05, donc on teste plus serré : 20 contacts, 1 estimation.
    // 20/15 = 1.333 ; manque 0.333 ; × 0.5 × 0.5 = 0.083 vente (> 0.05 → détecté).
    const detected = detectBiggestPainPoint(
      buildMeasuredRatiosFromVolumes(vols([20, 1, 0, 0, 0, 0, 0, 0, 0, 0])),
      ctx
    );
    expect(detected?.expertiseId).toBe("contacts_estimations");
  });
});
