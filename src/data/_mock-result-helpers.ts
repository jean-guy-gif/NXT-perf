/**
 * Helpers privés pour générer des PeriodResults mockés cohérents (entonnoir
 * descendant) calibrés sur CATEGORY_OBJECTIVES × multiplicateur de performance.
 *
 * Utilisé par mock-results.ts (Paris March) et mock-network.ts (Lyon March +
 * Marseille/Toulouse jan/fév/mar). Ne PAS exporter publiquement — fichier
 * préfixé `_` pour signaler son caractère interne aux mocks.
 *
 * Aucun nouveau champ inventé : ne consomme que des champs PeriodResults
 * existants (prospection / vendeurs / acheteurs / ventes).
 */

import type { PeriodResults } from "@/types/results";

export type CategoryKey = "debutant" | "confirme" | "expert";
export type MonthKey = "01" | "02" | "03";

const MONTH_PERIOD: Record<MonthKey, { start: string; end: string }> = {
  "01": { start: "2026-01-01", end: "2026-01-31" },
  "02": { start: "2026-02-01", end: "2026-02-28" },
  "03": { start: "2026-03-01", end: "2026-03-31" },
};

/**
 * Référentiel par catégorie (aligné sur CATEGORY_OBJECTIVES de constants.ts).
 * Dupliqué ici localement pour découpler la génération de mocks de la conf.
 */
const OBJ: Record<CategoryKey, {
  estim: number; mand: number; excl: number;
  vis: number; off: number; comp: number; actes: number; ca: number;
}> = {
  debutant: { estim: 8,  mand: 4,  excl: 30, vis: 20, off: 3, comp: 1, actes: 1, ca: 8000 },
  confirme: { estim: 15, mand: 8,  excl: 50, vis: 30, off: 5, comp: 3, actes: 2, ca: 20000 },
  expert:   { estim: 20, mand: 12, excl: 70, vis: 40, off: 8, comp: 5, actes: 4, ca: 40000 },
};

export interface MakeResultArgs {
  /** ID unique du PeriodResult (ex: "r-marseille-1-feb"). */
  id: string;
  /** ID de l'utilisateur (conseiller / manager / directeur). */
  userId: string;
  /** Mois cible : "01" janv, "02" fév, "03" mars. */
  monthKey: MonthKey;
  /** Catégorie du conseiller (objectifs de référence). */
  category: CategoryKey;
  /**
   * Multiplicateur de performance : agencyPerf × monthFactor.
   * Ex: Paris janv = 1.05 × 0.95 = 0.9975. Toulouse équipe A mars = 1.15 × 1.05 = 1.2075.
   */
  factor: number;
  /** Préfixe pour les IDs de mandats (ex: "mm-1" → mm-1-e1, mm-1-s1, ...). */
  mandatPrefix: string;
}

/**
 * Génère un PeriodResults cohérent à partir de CATEGORY_OBJECTIVES × factor.
 *
 * Cohérence entonnoir : Estimations >= Mandats >= Visites×0.8 (acheteurs sortis)
 * Type de mandats : split exclusif/simple selon le % d'exclusivité × factor.
 *
 * Champs proxy (contactsTotaux, rdvEstimation, acheteursSortis) : calculés en
 * proportion des estimations/visites pour respecter l'entonnoir descendant.
 * NB : le proxy runtime (utilisé par useNetworkProductionChain) appliquera ses
 * propres ratios pour calculer les objectifs réseau — les valeurs ici sont
 * juste les RÉALISÉS mockés, pas les objectifs.
 *
 * Champ chiffreAffairesCompromis : suit la convention historique des mocks
 * (compromisSignes × 15 000 = valeur des biens en compromis), à ne pas
 * confondre avec le proxy runtime "honoraires moyens × compromis" pour le
 * calcul de l'objectif "CA Compromis" côté réseau.
 */
export function makeResult(args: MakeResultArgs): PeriodResults {
  const { id, userId, monthKey, category, factor, mandatPrefix } = args;
  const ref = OBJ[category];
  const period = MONTH_PERIOD[monthKey];

  const estim = Math.max(0, Math.round(ref.estim * factor));
  const mand = Math.max(0, Math.round(ref.mand * factor));

  // Split exclusif/simple selon le % d'exclusivité × factor (capé à 100 %).
  const exclPct = Math.min(100, Math.max(0, ref.excl * factor));
  const exclusifs = Math.round(mand * (exclPct / 100));
  const simples = Math.max(0, mand - exclusifs);

  const vis = Math.max(0, Math.round(ref.vis * factor));
  const off = Math.max(0, Math.round(ref.off * factor));
  const comp = Math.max(0, Math.round(ref.comp * factor));
  const actes = Math.max(0, Math.round(ref.actes * factor));
  const ca = Math.max(0, Math.round(ref.ca * factor));

  // Proxies pour les 4 étapes hors CATEGORY_OBJECTIVES (entonnoir cohérent).
  const contactsTotaux = Math.max(0, Math.round(estim * 15));
  const rdvEstim = Math.max(0, Math.round(estim * 1.2));
  const acheteursSortis = Math.max(0, Math.round(vis * 0.8));

  // mandats[] avec types selon split — IDs uniques `${prefix}-eN` / `${prefix}-sN`.
  const mandats = [
    ...Array.from({ length: exclusifs }, (_, i) => ({
      id: `${mandatPrefix}-e${i + 1}`,
      type: "exclusif" as const,
    })),
    ...Array.from({ length: simples }, (_, i) => ({
      id: `${mandatPrefix}-s${i + 1}`,
      type: "simple" as const,
    })),
  ];

  return {
    id,
    userId,
    periodType: "month",
    periodStart: period.start,
    periodEnd: period.end,
    prospection: {
      contactsTotaux,
      rdvEstimation: rdvEstim,
    },
    vendeurs: {
      rdvEstimation: rdvEstim,
      estimationsRealisees: estim,
      mandatsSignes: mand,
      mandats,
      rdvSuivi: Math.max(0, Math.round(estim * 1.5)),
      requalificationSimpleExclusif: Math.max(0, Math.round(simples * 0.2)),
      baissePrix: Math.max(0, Math.round(mand * 0.15)),
    },
    acheteurs: {
      acheteursSortisVisite: acheteursSortis,
      nombreVisites: vis,
      offresRecues: off,
      compromisSignes: comp,
      chiffreAffairesCompromis: comp * 15000,
    },
    ventes: {
      actesSignes: actes,
      chiffreAffaires: ca,
    },
    createdAt: `${period.start}T08:00:00Z`,
    updatedAt: `${period.end}T17:00:00Z`,
  };
}
