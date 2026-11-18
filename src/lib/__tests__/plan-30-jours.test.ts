import { describe, it, expect } from "vitest";
import { generatePlan30j } from "@/lib/plan-30-jours";
import {
  RATIO_EXPERTISE,
  LEVER_EXPERTISE_IDS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";
import { FEASIBILITY_SCORE } from "@/lib/pain-point-detector";

// Construit un PainPointResult minimal pour un levier (niveau confirmé).
function painFor(id: ExpertiseRatioId): PainPointResult {
  const e = RATIO_EXPERTISE[id];
  const target = e.thresholds.confirme;
  // Valeur courante « dégradée » plausible selon le sens du ratio.
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

// Les 6 leviers actionnables (estLevier) — jamais une liste en dur.
const LEVIERS = LEVER_EXPERTISE_IDS;

const BANNED_UNACCENTED = [
  "premiere",
  "precisement",
  "debrief",
  "methode",
  "reflexes",
  "evolution",
];

describe("plan 30 jours — contenu par levier", () => {
  it("couvre bien les 6 leviers", () => {
    expect(LEVIERS.length).toBe(6);
  });

  LEVIERS.forEach((id) => {
    const plan = generatePlan30j(painFor(id));

    it(`${id} : 4 semaines, chacune avec l'objectif chiffré`, () => {
      expect(plan.weeks.length).toBe(4);
      for (const w of plan.weeks) {
        // L'objectif chiffré de la semaine (phrase « Cible : … »).
        expect(w.exercice ?? "").toMatch(/Cible\s*:/);
      }
    });

    it(`${id} : contenu propre au levier dans les 4 semaines`, () => {
      const e = RATIO_EXPERTISE[id];
      // S1 reprend le diagnostic + au moins une cause fréquente.
      expect(weekText(plan.weeks[0])).toContain(e.commonCauses[0]);
      // S2 reprend la première action.
      expect(weekText(plan.weeks[1])).toContain(e.firstAction);
      // S3 applique le RESTE des bonnes pratiques (après la 1re phrase vue en
      // S2) → la dernière phrase du doc d'expertise y figure.
      const tail = e.bestPractices.replace(/[.!?]\s*$/, "").slice(-25);
      expect(weekText(plan.weeks[2])).toContain(tail);
      // S4 nomme le ratio du levier.
      expect(weekText(plan.weeks[3])).toContain(e.label);
    });

    it(`${id} : aucun texte interdit (vouvoiement, NXT Coaching, mot sans accent)`, () => {
      for (const w of plan.weeks) {
        const raw = weekText(w);
        expect(raw).not.toContain("NXT Coaching");
        expect(raw).not.toContain("Exercice NXT");
        // « vous » de vouvoiement — on tolère « rendez-vous ».
        const sansRdv = raw.replace(/rendez-vous/gi, "");
        expect(sansRdv).not.toMatch(/\bvous\b/i);
        for (const mot of BANNED_UNACCENTED) {
          expect(raw.toLowerCase()).not.toMatch(new RegExp(`\\b${mot}\\b`));
        }
      }
    });
  });

  it("les semaines 3 et 4 diffèrent d'un levier à l'autre", () => {
    const s3 = LEVIERS.map((id) => weekText(generatePlan30j(painFor(id)).weeks[2]));
    const s4 = LEVIERS.map((id) => weekText(generatePlan30j(painFor(id)).weeks[3]));
    expect(new Set(s3).size).toBe(LEVIERS.length);
    expect(new Set(s4).size).toBe(LEVIERS.length);
  });

  it("l'objectif chiffré reprend valeur courante et cible du point de douleur", () => {
    const plan = generatePlan30j(painFor("visites_offres"));
    // visites_offres confirmé : seuil 10, courant 30 → « de 30 … à 10 ».
    expect(plan.weeks[2].exercice).toContain("30");
    expect(plan.weeks[2].exercice).toContain("10");
    expect(plan.weeks[2].exercice).toContain("vise 1 offre");
  });

  it("pct_exclusivite exprime l'objectif en pourcentage", () => {
    const plan = generatePlan30j(painFor("pct_exclusivite"));
    expect(plan.weeks[0].exercice).toContain("%");
    expect(plan.weeks[0].exercice).toContain("exclusif");
  });
});
