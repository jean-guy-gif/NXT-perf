"use client";

import { useMemo } from "react";
import { useNetworkData } from "@/hooks/use-network-data";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import { aggregateResults } from "@/lib/aggregate-results";
import {
  getStatus,
  getVolumeStatus,
  type Status,
  type ViewMode,
  type PeriodMode,
} from "@/components/dashboard/production-chain";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

/**
 * useNetworkProductionChain — cœur métier du tableau de bord réseau v2.0.
 *
 * AGRÉGATION PAR « RUISSELLEMENT TOTAL »
 * ──────────────────────────────────────
 * Pour chaque étape de la chaîne 12 niveaux, l'objectif réseau =
 * Σ CATEGORY_OBJECTIVES[c.category][step] sur tous les conseillers du réseau.
 * Le réalisé = Σ champs PeriodResults correspondants. Pas de moyenne simple
 * sur les agences — chaque conseiller contribue selon sa catégorie.
 *
 * Exclusivité (étape 5) est l'exception : le réalisé est une moyenne pondérée
 * (Σ exclusifs / Σ mandats × 100), l'objectif est une moyenne simple des
 * `CATEGORY_OBJECTIVES[c.category].exclusivite` (% par conseiller).
 *
 * CONVENTION caCompromis (étape 11) — discrépance assumée
 * ────────────────────────────────────────────────────────
 * - Réalisé : `Σ result.acheteurs.chiffreAffairesCompromis` (mocks à 15 000€/compromis,
 *   convention historique = valeur DES BIENS en compromis).
 * - Objectif : `Σ CATEGORY_OBJECTIVES[c.category].caCompromis` (calibré à 7 500€
 *   = honoraires moyens par compromis).
 *
 * Conséquence : si un conseiller atteint pile son objectif compromis, son
 * « % d'objectif CA Compromis » apparaîtra à ~200 % (15k réalisé / 7.5k cible).
 * Cette discrépance est ASSUMÉE par construction (Vue Réseau v2.0 Q6) et
 * documentée également dans le JSDoc de CATEGORY_OBJECTIVES (constants.ts).
 * Ne pas tenter de « corriger » à l'identique sans valider avec Laurent.
 *
 * MODE PÉRIODE
 * ────────────
 * - "mois"   : on prend le PeriodResult le plus récent par conseiller (mars 2026
 *              en démo Phase 1) et l'objectif mensuel × 1.
 * - "ytd"    : agrégation jan + fév + mars via aggregateResults() ; objectif × 3.
 * - "custom" : fallback sur "mois" en Phase 1 (sera implémenté Phase 2 si besoin).
 *
 * CONSEILLER SANS RESULT
 * ──────────────────────
 * Si un conseiller n'a aucun résultat pour la période demandée, on le saute
 * intégralement (réalisé = 0 ET objectif = 0 pour ce conseiller). Cela évite
 * de pénaliser artificiellement le ratio réseau (un conseiller qui n'a pas
 * encore saisi ses données ne dégrade pas le score collectif).
 *
 * USAGE
 * ─────
 * Consommé par /reseau/dashboard pour afficher les 12 cartes de la chaîne
 * de production. Indépendant du <ProductionChain> directeur (clé localStorage
 * dédiée pour les toggles : "nxt-network-period" et "nxt-network-chain-view").
 */

export type ChainStep =
  | "contactsTotaux"
  | "rdvEstimation"
  | "estimations"
  | "mandats"
  | "exclusivite"
  | "acheteursSortis"
  | "visites"
  | "offres"
  | "compromis"
  | "actes"
  | "caCompromis"
  | "caActe";

export type ChainCategory = "prospection" | "transformation" | "resultat";

export interface ChainStepData {
  stepId: ChainStep;
  /** 1 à 12 (ordre canonique de la chaîne). */
  stepNumber: number;
  label: string;
  category: ChainCategory;
  realise: number;
  objectif: number;
  /** realise - objectif (peut être négatif). */
  ecart: number;
  /** realise / objectif × 100, arrondi entier. 0 si objectif = 0. */
  pct: number;
  status: Status;
  /**
   * Tooltip optionnel à afficher sur la carte (icône info + popover).
   * Renseigné aujourd'hui uniquement pour `caCompromis` (étape 11) afin
   * d'expliquer la discrépance 15 000€ mock vs 7 500€ objectif honoraires.
   */
  tooltip?: string;
}

/**
 * Tooltip explicatif unique de l'étape caCompromis (étape 11) — discrépance
 * volontaire entre la valeur réalisée (mock 15k = valeur des biens) et
 * l'objectif (7.5k = honoraires moyens d'agence). Voir Q6 PR2 brief +
 * JSDoc CATEGORY_OBJECTIVES.caCompromis.
 */
const CA_COMPROMIS_TOOLTIP =
  "Le CA Compromis affiché correspond à la valeur des biens en compromis " +
  "(≈ 15 000€ par compromis dans la démo). L'objectif réseau est calculé sur " +
  "les honoraires d'agence attendus (≈ 7 500€ par compromis × nombre de " +
  "compromis cible). Le ratio supérieur à 100% reflète cette différence de " +
  "convention, pas une véritable surperformance. En production, ces deux " +
  "valeurs seront exprimées dans la même unité (honoraires d'agence) et le " +
  "ratio sera cohérent.";

export interface CategoryMix {
  debutant: { count: number; pct: number };
  confirme: { count: number; pct: number };
  expert: { count: number; pct: number };
}

export interface NetworkProductionChainData {
  steps: ChainStepData[];
  conseillerCount: number;
  categoryMix: CategoryMix;
  period: PeriodMode;
  setPeriod: (p: PeriodMode) => void;
  displayMode: ViewMode;
  setDisplayMode: (m: ViewMode) => void;
}

// Définition canonique des 12 étapes (ordre, labels, catégorie de chaîne).
const STEP_DEFS: Array<Omit<ChainStepData, "realise" | "objectif" | "ecart" | "pct" | "status">> = [
  { stepId: "contactsTotaux",  stepNumber: 1,  label: "Contacts totaux",       category: "prospection" },
  { stepId: "rdvEstimation",   stepNumber: 2,  label: "RDV Estimation",        category: "prospection" },
  { stepId: "estimations",     stepNumber: 3,  label: "Estimations réalisées", category: "prospection" },
  { stepId: "mandats",         stepNumber: 4,  label: "Mandats signés",        category: "prospection" },
  { stepId: "exclusivite",     stepNumber: 5,  label: "% Exclusivité",         category: "transformation" },
  { stepId: "acheteursSortis", stepNumber: 6,  label: "Acheteurs sortis",      category: "transformation" },
  { stepId: "visites",         stepNumber: 7,  label: "Visites réalisées",     category: "transformation" },
  { stepId: "offres",          stepNumber: 8,  label: "Offres reçues",         category: "transformation" },
  { stepId: "compromis",       stepNumber: 9,  label: "Compromis signés",      category: "transformation" },
  { stepId: "actes",           stepNumber: 10, label: "Actes signés",          category: "resultat" },
  { stepId: "caCompromis",     stepNumber: 11, label: "CA Compromis",          category: "resultat" },
  { stepId: "caActe",          stepNumber: 12, label: "CA Acte",               category: "resultat" },
];

const PERIOD_KEY = "nxt-network-period";
const VIEW_KEY = "nxt-network-chain-view";

/**
 * Récupère le PeriodResults agrégé d'un conseiller sur la période demandée.
 * - mois : le plus récent par periodStart desc (mars 2026 en démo Phase 1).
 * - ytd  : agrégation jan + fév + mar via aggregateResults().
 */
function getUserResultsForPeriod(
  userId: string,
  period: PeriodMode,
  allResults: PeriodResults[],
): PeriodResults | null {
  const userResults = allResults
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));

  if (userResults.length === 0) return null;

  if (period === "ytd") {
    return aggregateResults(userResults);
  }
  // mois (et custom fallback Phase 1)
  return userResults[0];
}

/**
 * Multiplicateur d'objectif selon la période.
 * - mois : ×1 (mensuel)
 * - ytd  : ×3 (jan + fév + mars en démo Phase 1)
 * - custom : ×1 (fallback)
 */
function getPeriodMultiplier(period: PeriodMode): number {
  if (period === "ytd") return 3;
  return 1;
}

export function useNetworkProductionChain(): NetworkProductionChainData {
  const { agencies, allResults } = useNetworkData();
  const [period, setPeriod] = usePersistedState<PeriodMode>(PERIOD_KEY, "mois");
  const [displayMode, setDisplayMode] = usePersistedState<ViewMode>(VIEW_KEY, "volumes");

  const data = useMemo<Pick<NetworkProductionChainData, "steps" | "conseillerCount" | "categoryMix">>(() => {
    // ── 1. Collecte tous les conseillers du réseau ──
    const allConseillers: User[] = [];
    for (const agency of agencies) {
      allConseillers.push(...agency.agents);
    }
    const conseillerCount = allConseillers.length;

    // ── 2. Mix de catégories (Junior / Confirmé / Expert) ──
    const counts = { debutant: 0, confirme: 0, expert: 0 };
    for (const c of allConseillers) {
      if (c.category === "debutant") counts.debutant++;
      else if (c.category === "confirme") counts.confirme++;
      else if (c.category === "expert") counts.expert++;
    }
    const totalForPct = conseillerCount > 0 ? conseillerCount : 1;
    const categoryMix: CategoryMix = {
      debutant: { count: counts.debutant, pct: Math.round((counts.debutant / totalForPct) * 100) },
      confirme: { count: counts.confirme, pct: Math.round((counts.confirme / totalForPct) * 100) },
      expert:   { count: counts.expert,   pct: Math.round((counts.expert   / totalForPct) * 100) },
    };

    // ── 3. Agrégation par étape ──
    const periodMultiplier = getPeriodMultiplier(period);

    let realContacts = 0;
    let realRdv = 0;
    let realEstim = 0;
    let realMandats = 0;
    let realExclusifs = 0;
    let realAcheteursSortis = 0;
    let realVisites = 0;
    let realOffres = 0;
    let realCompromis = 0;
    let realActes = 0;
    let realCaCompromis = 0;
    let realCaActe = 0;

    let objContacts = 0;
    let objRdv = 0;
    let objEstim = 0;
    let objMandats = 0;
    let objAcheteursSortis = 0;
    let objVisites = 0;
    let objOffres = 0;
    let objCompromis = 0;
    let objActes = 0;
    let objCaCompromis = 0;
    let objCaActe = 0;

    // Exclusivité objectif : moyenne simple des % CATEGORY_OBJECTIVES.exclusivite
    // sur les conseillers AYANT un résultat pour la période (pas de % multiplicateur).
    let exclObjSum = 0;
    let exclObjCount = 0;

    for (const user of allConseillers) {
      const res = getUserResultsForPeriod(user.id, period, allResults);
      // Si aucun résultat sur la période, on saute le conseiller intégralement
      // (réalisé ET objectif). Cf. JSDoc en haut.
      if (!res) continue;

      const cat = user.category as keyof typeof CATEGORY_OBJECTIVES;
      const obj = CATEGORY_OBJECTIVES[cat] ?? CATEGORY_OBJECTIVES.confirme;

      // Réalisé
      realContacts          += res.prospection.contactsTotaux;
      realRdv               += res.vendeurs.rdvEstimation;
      realEstim             += res.vendeurs.estimationsRealisees;
      realMandats           += res.vendeurs.mandats.length;
      realExclusifs         += res.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
      realAcheteursSortis   += res.acheteurs.acheteursSortisVisite;
      realVisites           += res.acheteurs.nombreVisites;
      realOffres            += res.acheteurs.offresRecues;
      realCompromis         += res.acheteurs.compromisSignes;
      realActes             += res.ventes.actesSignes;
      realCaCompromis       += res.acheteurs.chiffreAffairesCompromis;
      realCaActe            += res.ventes.chiffreAffaires;

      // Objectif × periodMultiplier (sauf exclusivité qui est un %)
      objContacts          += obj.contactsTotaux  * periodMultiplier;
      objRdv               += obj.rdvEstimation   * periodMultiplier;
      objEstim             += obj.estimations     * periodMultiplier;
      objMandats           += obj.mandats         * periodMultiplier;
      objAcheteursSortis   += obj.acheteursSortis * periodMultiplier;
      objVisites           += obj.visites         * periodMultiplier;
      objOffres            += obj.offres          * periodMultiplier;
      objCompromis         += obj.compromis       * periodMultiplier;
      objActes             += obj.actes           * periodMultiplier;
      objCaCompromis       += obj.caCompromis     * periodMultiplier;
      objCaActe            += obj.ca              * periodMultiplier;

      // Exclusivité objectif : moyenne simple, no period multiplier
      exclObjSum   += obj.exclusivite;
      exclObjCount += 1;
    }

    // % Exclusivité réalisé : (Σ exclusifs / Σ mandats) × 100 — moyenne pondérée
    const realExclusivePct = realMandats > 0
      ? Math.round((realExclusifs / realMandats) * 100)
      : 0;
    // % Exclusivité objectif : moyenne simple des objectifs catégorie
    const objExclusivePct = exclObjCount > 0
      ? Math.round(exclObjSum / exclObjCount)
      : 0;

    // ── 4. Construction des 12 ChainStepData ──
    const realisedByStep: Record<ChainStep, number> = {
      contactsTotaux:  realContacts,
      rdvEstimation:   realRdv,
      estimations:     realEstim,
      mandats:         realMandats,
      exclusivite:     realExclusivePct,
      acheteursSortis: realAcheteursSortis,
      visites:         realVisites,
      offres:          realOffres,
      compromis:       realCompromis,
      actes:           realActes,
      caCompromis:     realCaCompromis,
      caActe:          realCaActe,
    };

    const objectiveByStep: Record<ChainStep, number> = {
      contactsTotaux:  objContacts,
      rdvEstimation:   objRdv,
      estimations:     objEstim,
      mandats:         objMandats,
      exclusivite:     objExclusivePct,
      acheteursSortis: objAcheteursSortis,
      visites:         objVisites,
      offres:          objOffres,
      compromis:       objCompromis,
      actes:           objActes,
      caCompromis:     objCaCompromis,
      caActe:          objCaActe,
    };

    const steps: ChainStepData[] = STEP_DEFS.map((def) => {
      const realise = realisedByStep[def.stepId];
      const objectif = objectiveByStep[def.stepId];
      const ecart = realise - objectif;
      const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
      // Exclusivité : ratio "plus = mieux" → getStatus(_, _, false) (cohérent
      // avec le directeur). Toutes les autres étapes : getVolumeStatus.
      const status: Status =
        def.stepId === "exclusivite"
          ? getStatus(realise, objectif, false)
          : getVolumeStatus(realise, objectif);

      return {
        stepId: def.stepId,
        stepNumber: def.stepNumber,
        label: def.label,
        category: def.category,
        realise,
        objectif,
        ecart,
        pct,
        status,
        // Tooltip uniquement pour caCompromis (discrépance assumée 15k mock vs 7.5k objectif).
        tooltip: def.stepId === "caCompromis" ? CA_COMPROMIS_TOOLTIP : undefined,
      };
    });

    return { steps, conseillerCount, categoryMix };
  }, [agencies, allResults, period]);

  return {
    steps: data.steps,
    conseillerCount: data.conseillerCount,
    categoryMix: data.categoryMix,
    period,
    setPeriod,
    displayMode,
    setDisplayMode,
  };
}
