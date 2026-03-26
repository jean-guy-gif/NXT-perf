import type { PeriodResults } from "@/types/results";
import type { ComputedRatio } from "@/types/ratios";

export interface DPIAxis {
  id: string;
  label: string;
  score: number;
}

export interface DPIContextParams {
  plan30Total?: number;
  plan30Done?: number;
  hasActivePlan?: boolean;
  hasCustomObjectif?: boolean;
  nxtTrainingActive?: boolean;
}

const REF = {
  debutant: {
    contactsMois: 30,
    estimationsMois: 3,
    mandatsStock: 5,
    pctExclusiviteObjectif: 30,
    caParActe: 8000,
  },
  confirme: {
    contactsMois: 50,
    estimationsMois: 6,
    mandatsStock: 10,
    pctExclusiviteObjectif: 50,
    caParActe: 10000,
  },
  expert: {
    contactsMois: 80,
    estimationsMois: 10,
    mandatsStock: 18,
    pctExclusiviteObjectif: 70,
    caParActe: 14000,
  },
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function computeDPIAxes(
  results: PeriodResults,
  category: "debutant" | "confirme" | "expert",
  computedRatios: ComputedRatio[],
  ctx?: DPIContextParams
): DPIAxis[] {
  const ref = REF[category] ?? REF.confirme;
  const p = ctx ?? {};

  // AXE 1 : Intensité Commerciale
  const contacts = results.prospection.contactsTotaux;
  const scoreIntensiteCommerciale = clamp((contacts / ref.contactsMois) * 100);

  // AXE 2 : Génération d'Opportunités
  const estimations = results.vendeurs.estimationsRealisees;
  const scoreGenerationOpportunites = clamp((estimations / ref.estimationsMois) * 100);

  // AXE 3 : Solidité du Portefeuille (50% stock mandats + 50% taux exclusivité)
  const mandatsStock = results.vendeurs.mandats.length;
  const scoreMandatsStock = clamp((mandatsStock / ref.mandatsStock) * 100);
  const totalMandats = results.vendeurs.mandats.length;
  const mandatsExclusifs = results.vendeurs.mandats.filter(
    (m) => m.type === "exclusif"
  ).length;
  const pctExclusiviteReel =
    totalMandats > 0 ? (mandatsExclusifs / totalMandats) * 100 : 0;
  const scoreExclusivite = clamp(
    (pctExclusiviteReel / ref.pctExclusiviteObjectif) * 100
  );
  const scoreSoliditePortefeuille = clamp(
    (scoreMandatsStock + scoreExclusivite) / 2
  );

  // AXE 4 : Maîtrise des Ratios (50% global ratios + 25% plan 30j + 25% training)
  const scoreGlobal7Ratios =
    computedRatios.length > 0
      ? clamp(
          computedRatios.reduce((a, r) => a + r.percentageOfTarget, 0) /
            computedRatios.length
        )
      : 0;
  const plan30Score =
    (p.plan30Total ?? 0) > 0
      ? clamp(((p.plan30Done ?? 0) / (p.plan30Total ?? 1)) * 100)
      : 0;
  const nxtTrainingScore = p.hasActivePlan ? 100 : 0;
  const scoreMaitriseRatios = clamp(
    scoreGlobal7Ratios * 0.5 + plan30Score * 0.25 + nxtTrainingScore * 0.25
  );

  // AXE 5 : Valorisation Économique
  const actesSignes = results.ventes.actesSignes;
  const caTotal = results.ventes.chiffreAffaires;
  const caParActe = actesSignes > 0 ? caTotal / actesSignes : 0;
  const scoreValorisationEconomique = clamp((caParActe / ref.caParActe) * 100);

  // AXE 6 : Pilotage Stratégique (40% ratios ok + 30% objectif perso + 30% compétences)
  const ratiosOk = computedRatios.filter((r) => r.status === "ok").length;
  const ratiosTotal = computedRatios.length;
  const scoreGPSRealise =
    ratiosTotal > 0 ? clamp((ratiosOk / ratiosTotal) * 100) : 0;
  const scoreGPSPersonnalise = p.hasCustomObjectif ? 100 : 0;
  const scoreCompetences =
    p.hasActivePlan || p.nxtTrainingActive
      ? clamp(50 + plan30Score * 0.5)
      : 0;
  const scorePilotageStrategique = clamp(
    scoreGPSRealise * 0.4 + scoreGPSPersonnalise * 0.3 + scoreCompetences * 0.3
  );

  return [
    { id: "intensite_commerciale", label: "Intensité Commerciale", score: scoreIntensiteCommerciale },
    { id: "generation_opportunites", label: "Génération d'Opportunités", score: scoreGenerationOpportunites },
    { id: "solidite_portefeuille", label: "Solidité du Portefeuille", score: scoreSoliditePortefeuille },
    { id: "maitrise_ratios", label: "Maîtrise des Ratios", score: scoreMaitriseRatios },
    { id: "valorisation_economique", label: "Valorisation Économique", score: scoreValorisationEconomique },
    { id: "pilotage_strategique", label: "Pilotage Stratégique", score: scorePilotageStrategique },
  ];
}

export function computeGlobalDPIScore(axes: DPIAxis[]): number {
  if (!axes.length) return 0;
  return Math.round(axes.reduce((a, b) => a + b.score, 0) / axes.length);
}
