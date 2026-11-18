import { describe, it, expect } from "vitest";
import { computeMonthProgress } from "@/lib/coaching-debrief";
import type { PeriodResults } from "@/types/results";
import { defaultRatioConfigs } from "@/data/mock-ratios";

const cfg = defaultRatioConfigs;

function makeResults(o: Partial<{
  contacts: number;
  estimations: number;
  mandats: number;
  exclusifs: number;
  visites: number;
  offres: number;
  compromis: number;
}> = {}): PeriodResults {
  const d = { contacts: 0, estimations: 0, mandats: 0, exclusifs: 0, visites: 0, offres: 0, compromis: 0, ...o };
  const mandats = [];
  for (let i = 0; i < d.exclusifs; i++) mandats.push({ id: `e${i}`, type: "exclusif" as const });
  for (let i = 0; i < d.mandats - d.exclusifs; i++) mandats.push({ id: `s${i}`, type: "simple" as const });
  return {
    id: "t",
    userId: "u1",
    periodType: "month",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    prospection: { contactsTotaux: d.contacts, rdvEstimation: 0 },
    vendeurs: {
      rdvEstimation: 0,
      estimationsRealisees: d.estimations,
      mandatsSignes: d.mandats,
      mandats,
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: 0,
      nombreVisites: d.visites,
      offresRecues: d.offres,
      compromisSignes: d.compromis,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: 0, chiffreAffaires: 0 },
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-30T00:00:00.000Z",
  };
}

// Objectif GPS de la salle (confirmé) : 90 000 € de CA, 9 000 € de commission.
const GPS = { annualCA: 90000, avgActValue: 9000 };

describe("computeMonthProgress — verdict honnête", () => {
  it("la semaine d'exemple ne produit aucune phrase positive et cite offres + exclusifs", () => {
    // 25 contacts, 2 estimations, 1 mandat simple, 6 visites, 0 offre, 1 compromis.
    const month = makeResults({ contacts: 25, estimations: 2, mandats: 1, exclusifs: 0, visites: 6, offres: 0, compromis: 1 });
    const now = new Date(2026, 10, 30); // 30 novembre → prorata ≈ mois plein
    const p = computeMonthProgress(month, "confirme", GPS, cfg, now);

    expect(p.onTrack).toBe(false);
    expect(p.verdict).not.toMatch(/dans le rythme/i);
    expect(p.verdict).toContain("offres");
    expect(p.verdict).toContain("exclusifs");
    // Les offres et exclusifs réalisés sont à 0.
    const offres = p.items.find((i) => i.key === "offres")!;
    const exclusifs = p.items.find((i) => i.key === "exclusifs")!;
    expect(offres.actual).toBe(0);
    expect(exclusifs.actual).toBe(0);
    expect(offres.target).toBeGreaterThan(0);
  });

  it("un mois à ≥ 90 % du prorata sur tous les volumes → « dans le rythme »", () => {
    const now = new Date(2026, 10, 3); // 3 novembre → prorata faible
    const month = makeResults({ contacts: 20, estimations: 2, mandats: 1, exclusifs: 1, visites: 4, offres: 1, compromis: 1 });
    const p = computeMonthProgress(month, "confirme", GPS, cfg, now);

    expect(p.onTrack).toBe(true);
    expect(p.verdict).toBe("Tu es dans le rythme de ton objectif ce mois-ci.");
    expect(p.laggards.length).toBe(0);
  });

  it("sans objectif GPS → repli sur le standard du niveau, avec la mention", () => {
    const now = new Date(2026, 10, 15);
    const p = computeMonthProgress(makeResults(), "confirme", null, cfg, now);

    expect(p.usingFallback).toBe(true);
    expect(p.fallbackLevelLabel).toBe("Confirmé");
    expect(p.items.every((i) => i.fromFallback)).toBe(true);
  });

  it("expose les 7 volumes attendus (contacts → compromis, dont exclusifs)", () => {
    const now = new Date(2026, 10, 15);
    const p = computeMonthProgress(makeResults(), "confirme", GPS, cfg, now);
    expect(p.items.map((i) => i.key)).toEqual([
      "contacts",
      "estimations",
      "mandats",
      "exclusifs",
      "visites",
      "offres",
      "compromis",
    ]);
    // Avec un GPS, seuls les contacts suivent le standard (le GPS ne les fournit pas).
    const contacts = p.items.find((i) => i.key === "contacts")!;
    expect(contacts.fromFallback).toBe(true);
    expect(p.items.find((i) => i.key === "offres")!.fromFallback).toBe(false);
  });
});
