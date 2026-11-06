import { describe, it, expect } from "vitest";
import { buildDiagnosticText, type DiagnosticExportInput } from "@/lib/diagnostic-export";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

const results: PeriodResults = {
  id: "r1",
  userId: "u1",
  periodType: "month",
  periodStart: "2026-02-01",
  periodEnd: "2026-02-28",
  prospection: { contactsTotaux: 150, rdvEstimation: 10 },
  vendeurs: {
    rdvEstimation: 10,
    estimationsRealisees: 10,
    mandatsSignes: 4,
    mandats: [
      { id: "m1", type: "exclusif" },
      { id: "m2", type: "exclusif" },
      { id: "m3", type: "simple" },
      { id: "m4", type: "simple" },
    ],
    rdvSuivi: 0,
    requalificationSimpleExclusif: 0,
    baissePrix: 0,
  },
  acheteurs: {
    acheteursSortisVisite: 5,
    nombreVisites: 20,
    offresRecues: 3,
    compromisSignes: 2,
    chiffreAffairesCompromis: 0,
  },
  ventes: { actesSignes: 2, chiffreAffaires: 20000 },
  createdAt: "2026-02-28T00:00:00.000Z",
  updatedAt: "2026-02-28T00:00:00.000Z",
};

// Jeu de ratios figé : visites_offre (50 %) et contacts_rdv (71 %) sont les
// deux plus faibles ; tous les autres sont OK à 100 %.
const computedRatios: ComputedRatio[] = [
  { ratioId: "contacts_rdv", value: 21, thresholdForCategory: 15, status: "warning", percentageOfTarget: 71 },
  { ratioId: "rdv_mandats", value: 2.5, thresholdForCategory: 2.5, status: "ok", percentageOfTarget: 100 },
  { ratioId: "pct_mandats_exclusifs", value: 50, thresholdForCategory: 50, status: "ok", percentageOfTarget: 100 },
  { ratioId: "acheteurs_visites", value: 2, thresholdForCategory: 2, status: "ok", percentageOfTarget: 100 },
  { ratioId: "visites_offre", value: 20, thresholdForCategory: 10, status: "danger", percentageOfTarget: 50 },
  { ratioId: "offres_compromis", value: 2, thresholdForCategory: 2, status: "ok", percentageOfTarget: 100 },
  { ratioId: "compromis_actes", value: 1.15, thresholdForCategory: 1.15, status: "ok", percentageOfTarget: 100 },
  { ratioId: "honoraires_moyens", value: 10000, thresholdForCategory: 10000, status: "ok", percentageOfTarget: 100 },
];

const input: DiagnosticExportInput = {
  firstName: "Alex",
  category: "confirme",
  periodStart: "2026-02-01",
  results,
  computedRatios,
  ratioConfigs: defaultRatioConfigs,
  objective: null,
};

describe("buildDiagnosticText", () => {
  const text = buildDiagnosticText(input);

  it("commence par le titre et l'en-tête conseiller", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("DIAGNOSTIC NXT PERFORMANCE");
    expect(lines[1]).toBe(
      "Conseiller : Alex — niveau Confirmé — période : février 2026",
    );
  });

  it("contient les 8 lignes de ratios avec valeur / cible / statut", () => {
    const ratioLines = text.split("\n").filter((l) => l.startsWith("- "));
    expect(ratioLines).toHaveLength(8);
    expect(ratioLines).toEqual([
      "- Contacts → RDV : 21 / 15 / à surveiller",
      "- RDV → mandats : 2,5 / 2,5 / OK",
      "- % mandats exclusifs : 50 % / 50 % / OK",
      "- Acheteurs → visites : 2 / 2 / OK",
      "- Visites → offre : 20 / 10 / à renforcer",
      "- Offres → compromis : 2 / 2 / OK",
      "- Compromis → actes : 1,15 / 1,15 / OK",
      "- Honoraires moyens : 10 000 € / 10 000 € / OK",
    ]);
  });

  it("liste les 2 ratios les plus faibles, du plus faible au moins faible", () => {
    expect(text).toContain(
      "RATIOS À TRAVAILLER EN PRIORITÉ : Visites → offre, Contacts → RDV",
    );
  });

  it("n'ajoute pas la ligne OBJECTIF ANNUEL quand aucun objectif n'existe", () => {
    expect(text).not.toContain("OBJECTIF ANNUEL");
  });
});
