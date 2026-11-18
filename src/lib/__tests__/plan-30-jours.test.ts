import { describe, it, expect } from "vitest";
import { generatePlan30j, planHeaderLine } from "@/lib/plan-30-jours";
import {
  RATIO_EXPERTISE,
  LEVER_EXPERTISE_IDS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { PLAN_CONTENT } from "@/data/plan-content";
import type { PainPointResult } from "@/lib/pain-point-detector";
import { FEASIBILITY_SCORE } from "@/lib/pain-point-detector";

// PainPointResult minimal pour un levier (niveau confirmé).
function painFor(id: ExpertiseRatioId): PainPointResult {
  const e = RATIO_EXPERTISE[id];
  const target = e.thresholds.confirme;
  const current = e.direction === "less_is_better" ? target * 3 : target / 2;
  return {
    expertiseId: id,
    expertise: e,
    currentValue: current,
    targetValue: target,
    normalizedGap: 0,
    estimatedCaLossEur: 0,
    painScore: 0,
    painScoreV2: 1,
    impactScoreNormalized: 0,
    chainScore: e.chainPosition,
    feasibilityScore: FEASIBILITY_SCORE[e.feasibility],
  };
}

function weekText(w: { focus: string; actions: { label: string }[]; exercice?: string }): string {
  return `${w.focus} ${w.actions.map((a) => a.label).join(" ")} ${w.exercice ?? ""}`;
}

const LEVIERS = LEVER_EXPERTISE_IDS;

describe("plan 30 jours — contenu conseiller validé (PLAN_CONTENT)", () => {
  it("couvre les 6 leviers", () => {
    expect(LEVIERS.length).toBe(6);
  });

  LEVIERS.forEach((id) => {
    const plan = generatePlan30j(painFor(id));
    const content = PLAN_CONTENT[id]!;

    it(`${id} : 4 semaines, chacune avec un geste non vide`, () => {
      expect(plan.weeks.length).toBe(4);
      for (const w of plan.weeks) {
        expect((w.exercice ?? "").trim().length).toBeGreaterThan(0);
      }
      // Titres des 4 semaines.
      expect(plan.weeks.map((w) => w.focus)).toEqual([
        "Comprendre",
        "Corriger",
        "Appliquer",
        "Mesurer",
      ]);
    });

    it(`${id} : S1 à S3 reprennent exactement PLAN_CONTENT`, () => {
      const [s1, s2, s3] = plan.weeks;
      expect(s1.exercice).toBe(content.s1.geste);
      expect(s1.actions.map((a) => a.label)).toEqual(content.s1.actions);
      expect(s2.exercice).toBe(content.s2.geste);
      expect(s2.actions.map((a) => a.label)).toEqual(content.s2.actions);
      expect(s3.exercice).toBe(content.s3.geste);
      expect(s3.actions.map((a) => a.label)).toEqual(content.s3.actions);
    });

    it(`${id} : S4 « Mesurer » — geste fixe + 2 gestes à garder`, () => {
      const s4 = plan.weeks[3];
      expect(s4.exercice).toBe("Fais le point sur ton mois.");
      expect(s4.actions[1].label).toBe("Choisis les 2 gestes que tu gardes.");
    });

    it(`${id} : aucun texte interdit`, () => {
      for (const w of plan.weeks) {
        const raw = weekText(w);
        expect(raw).not.toContain("NXT Coaching");
        expect(raw).not.toContain("Le conseiller");
        expect(raw).not.toContain("Les meilleurs");
        expect(raw).not.toContain("prochaines visites");
        // « Ils » en début de phrase (notes formateur 3e personne).
        expect(raw).not.toMatch(/(^|\.\s)Ils\b/);
        // Vouvoiement du conseiller — on tolère « rendez-vous » et la question
        // posée au client (« qu'est-ce qui vous a plu ? »).
        const sansClient = raw
          .replace(/rendez-vous/gi, "")
          .replace(/qu'est-ce qui vous [^?]*\?/gi, "");
        expect(sansClient).not.toMatch(/\bvous\b/i);
      }
    });
  });

  it("en-tête correct pour Karim (visites_offres)", () => {
    expect(planHeaderLine("visites_offres", 30, 9.5)).toBe(
      "Tu es à 30 visites pour 1 offre · cible à 30 jours : 9,5",
    );
  });

  it("en-tête correct pour pct_exclusivite (en %)", () => {
    expect(planHeaderLine("pct_exclusivite", 25, 50)).toBe(
      "Tu es à 25 % d'exclusivité · cible à 30 jours : 50 %",
    );
  });

  it("S4 reprend les entrées/sortie du levier (visites_offres)", () => {
    const s4 = generatePlan30j(painFor("visites_offres")).weeks[3];
    expect(s4.actions[0].label).toContain("combien de visites pour 1 offre ce mois-ci ?");
  });

  it("S4 de pct_exclusivite est exprimé en %", () => {
    const s4 = generatePlan30j(painFor("pct_exclusivite")).weeks[3];
    expect(s4.actions[0].label).toContain("quel % de mandats exclusifs ce mois-ci ?");
  });
});
