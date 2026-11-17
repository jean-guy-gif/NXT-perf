import { describe, it, expect } from "vitest";
import {
  detectBiggestPainPoint,
  detectTopPainPoints,
  detectBiggestPainPointWithContext,
  buildMeasuredRatiosFromVolumes,
  type PainVolumes,
} from "@/lib/pain-point-detector";
import { findCriticitePointsWithContext } from "@/lib/diagnostic-criticite";
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
type Vec = [number, number, number, number, number, number, number, number, number, number];

function vols(arr: Vec): PainVolumes {
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

function topFor(arr: Vec): string | null {
  const measured = buildMeasuredRatiosFromVolumes(vols(arr));
  return detectBiggestPainPoint(measured, ctx)?.expertiseId ?? null;
}

// Jeux de volumes + point de douleur attendu (compromis→actes n'est jamais
// un point de douleur : c'est une résultante, pas un levier).
const CASES: { vec: Vec; expected: string | null }[] = [
  { vec: [180, 18, 3, 0, 40, 24, 36, 3, 3, 3], expected: "estimations_mandats" },
  { vec: [144, 9, 6, 3, 40, 30, 90, 3, 3, 3], expected: "visites_offres" },
  { vec: [150, 9, 5, 2, 32, 24, 60, 15, 3, 3], expected: "offres_compromis" },
  { vec: [135, 15, 0, 0, 32, 24, 60, 6, 3, 3], expected: "estimations_mandats" },
  { vec: [135, 9, 3, 0, 24, 18, 54, 0, 0, 0], expected: "visites_offres" },
  { vec: [240, 8, 4, 2, 32, 24, 60, 6, 3, 3], expected: "contacts_estimations" },
  { vec: [162, 9, 4, 2, 38, 24, 72, 6, 3, 2], expected: "visites_offres" },
  { vec: [150, 10, 5, 3, 32, 24, 50, 5, 3, 0], expected: null },
];

describe("détection du point de douleur V3 — points de douleur attendus", () => {
  CASES.forEach(({ vec, expected }, i) => {
    it(`${i + 1}. ${vec.join(",")} → ${expected ?? "null"}`, () => {
      expect(topFor(vec)).toBe(expected);
    });
  });
});

describe("compromis_actes n'est jamais un point de douleur (résultante)", () => {
  // Jeux volontairement « favorables » à compromis→actes dans l'ancienne
  // formule (beaucoup de compromis, zéro acte) : il ne doit plus jamais sortir.
  const vectors: Vec[] = [
    [162, 9, 4, 2, 38, 24, 72, 6, 3, 2], // ex-cas 7 (sortait compromis_actes)
    [200, 20, 10, 5, 50, 30, 100, 20, 20, 0],
    [300, 30, 15, 8, 60, 40, 120, 30, 30, 0],
    [180, 18, 9, 4, 40, 24, 72, 9, 9, 1],
  ];
  vectors.forEach((vec, i) => {
    it(`jeu ${i + 1} : absent de detectTopPainPoints`, () => {
      const top = detectTopPainPoints(buildMeasuredRatiosFromVolumes(vols(vec)), ctx, 8);
      expect(top.map((p) => p.expertiseId)).not.toContain("compromis_actes");
    });
  });
});

describe("verdict (diagnostic) et plan désignent le même ratio", () => {
  // findCriticitePointsWithContext (verdict) avec results=null → pas de points
  // volume, on compare donc directement le top ratio au détecteur du plan.
  CASES.forEach(({ vec }, i) => {
    it(`jeu ${i + 1} : findCriticitePointsWithContext == detectBiggestPainPoint`, () => {
      const measured = buildMeasuredRatiosFromVolumes(vols(vec));
      const plan = detectBiggestPainPoint(measured, ctx)?.expertiseId ?? null;
      const verdict = findCriticitePointsWithContext(measured, ctx, null, "confirme", 3);
      const verdictId =
        verdict.top && verdict.top.type === "ratio" ? verdict.top.id : null;
      expect(verdictId).toBe(plan);
    });
  });
});

describe("détection du point de douleur V3 — contrat de sortie", () => {
  const measured = buildMeasuredRatiosFromVolumes(vols([180, 18, 3, 0, 40, 24, 36, 3, 3, 3]));

  it("estimatedCaLossEur = gain en ventes × commission moyenne", () => {
    const top = detectBiggestPainPoint(measured, ctx)!;
    expect(top.painScoreV2).toBeGreaterThan(0);
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

  it("gain inférieur à 0,05 vente → le ratio reste détecté s'il dépasse le seuil", () => {
    // 20 contacts (≥ 20) / 1 estimation : 20/15 = 1.333 ; manque 0.333 ;
    // × 0.5 × 0.5 = 0.083 vente (> 0.05 → détecté).
    const detected = detectBiggestPainPoint(
      buildMeasuredRatiosFromVolumes(vols([20, 1, 0, 0, 0, 0, 0, 0, 0, 0])),
      ctx
    );
    expect(detected?.expertiseId).toBe("contacts_estimations");
  });
});
