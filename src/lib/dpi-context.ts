export interface DPIContextProfile {
  anciennete: "moins_1an" | "1_3ans" | "3_7ans" | "plus_7ans";
  statut: "mandataire" | "salarie" | "agent_commercial" | "dirigeant" | "manager_reseau";
  zone: "grande_metropole" | "ville_moyenne" | "rurale" | "touristique";
  equipe: "seul" | "petite_equipe" | "agence" | "reseau_multi";
  ca: "moins_100k" | "100_250k" | "250_500k" | "plus_500k";
}

export interface DPIContextMultipliers {
  intensiteCommerciale: number;
  generationOpportunites: number;
  soliditePortefeuille: number;
  maitriseRatios: number;
  valorisationEconomique: number;
  pilotageStrategique: number;
}

export function computeContextMultipliers(
  ctx: Partial<DPIContextProfile>
): DPIContextMultipliers {
  let m1 = 1.0, m2 = 1.0, m3 = 1.0, m4 = 1.0, m5 = 1.0, m6 = 1.0;

  // Ancienneté
  if (ctx.anciennete === "moins_1an") {
    m1 *= 0.55; m2 *= 0.55; m3 *= 0.50; m4 *= 0.60; m5 *= 0.55; m6 *= 0.50;
  } else if (ctx.anciennete === "1_3ans") {
    m1 *= 0.75; m2 *= 0.75; m3 *= 0.70; m4 *= 0.80; m5 *= 0.75; m6 *= 0.70;
  } else if (ctx.anciennete === "3_7ans") {
    m1 *= 0.90; m2 *= 0.90; m3 *= 0.88; m4 *= 0.92; m5 *= 0.90; m6 *= 0.88;
  }

  // Zone géographique
  if (ctx.zone === "rurale") {
    m1 *= 0.80; m2 *= 0.80; m3 *= 0.85;
  } else if (ctx.zone === "touristique") {
    m3 *= 0.85;
  } else if (ctx.zone === "ville_moyenne") {
    m1 *= 0.92; m2 *= 0.92;
  }

  // Statut
  if (ctx.statut === "mandataire") {
    m6 *= 0.80;
  } else if (ctx.statut === "salarie") {
    m5 *= 0.85;
  }

  // CA
  if (ctx.ca === "moins_100k") {
    m5 *= 0.70; m6 *= 0.75;
  } else if (ctx.ca === "100_250k") {
    m5 *= 0.85; m6 *= 0.90;
  } else if (ctx.ca === "250_500k") {
    m5 *= 0.95;
  }

  // Taille équipe
  if (ctx.equipe === "seul") {
    m6 *= 0.85;
  }

  return {
    intensiteCommerciale: m1,
    generationOpportunites: m2,
    soliditePortefeuille: m3,
    maitriseRatios: m4,
    valorisationEconomique: m5,
    pilotageStrategique: m6,
  };
}
