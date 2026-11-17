/**
 * Détecteur de plus grosse douleur — V3 (gain en ventes)
 *
 * Problèmes des versions précédentes :
 *   1. Un ratio « X pour 1 Y » avec Y = 0 valait 0 et passait pour parfait :
 *      les vrais blocages (54 visites / 0 offre, 15 estimations / 0 mandat)
 *      n'étaient jamais détectés.
 *   2. L'impact € était calculé sur des volumes non comparables (60 contacts
 *      contre 3 offres) puis pondéré par chainPosition, ce qui faisait sortir
 *      `contacts_estimations` presque à chaque fois.
 *   3. Les 5 règles de pain-point-context-override.ts rustinaient ce biais.
 *
 * Nouvelle règle, une seule unité : « ventes gagnées si ce ratio atteint son
 * seuil », multipliées par la commission moyenne.
 *
 * Entrées : les VOLUMES BRUTS agrégés (3 mois glissants ; 6 mois pour compromis
 * et actes), pas les ratios calculés. Seuil cible T = resolveThreshold.
 *
 * Pour chaque ratio : sortie manquante = max(0, volume d'entrée / T − sortie
 * réelle), propagée jusqu'à la vente avec les taux aval réels du conseiller, ou
 * le taux au seuil quand l'étape aval n'est pas mesurable.
 *
 * Classement : gain en ventes décroissant ; gains < 0,05 vente ignorés.
 * `chainPosition`, `feasibility` et l'override ne servent plus au tri (champs
 * conservés pour compat). `painScore`/`estimatedCaLossEur` = gain en € ;
 * `painScoreV2` = gain en ventes.
 */

import {
  RATIO_EXPERTISE,
  LEVER_EXPERTISE_IDS,
  tauxMandatVente,
  type ExpertiseRatioId,
  type ProfileLevel,
  type RatioExpertise,
  type RatioFeasibility,
} from "@/data/ratio-expertise";
import {
  resolveThreshold,
  type ThresholdContext,
} from "@/lib/diagnostic/resolve-threshold";

/**
 * Mapping faisabilité → score numérique. Conservé pour compat (champ
 * `feasibilityScore` de PainPointResult) — ne sert plus au tri en V3.
 */
export const FEASIBILITY_SCORE: Record<RatioFeasibility, number> = {
  easy: 1.0,
  medium: 0.6,
  hard: 0.3,
};

// ─── Volumes bruts ──────────────────────────────────────────────────────────

/**
 * Volumes bruts agrégés servant d'entrée au détecteur. Ordre métier :
 * contacts → estimations → mandats (dont exclusifs) ; acheteurs → sortis en
 * visite → visites → offres → compromis → actes.
 */
export interface PainVolumes {
  contacts: number;
  estimations: number;
  mandats: number;
  exclusifs: number;
  acheteurs: number;
  acheteursSortis: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
}

/**
 * Les ratios notés par le détecteur = les LEVIERS (dérivés de `estLevier`,
 * jamais une liste en dur). Exclut la résultante `compromis_actes` (décalage
 * ~3 mois) et la sous-dimension `visites_par_acheteur`.
 */
const PAIN_RATIOS: ExpertiseRatioId[] = LEVER_EXPERTISE_IDS;

/**
 * Échantillon minimum sur le VOLUME D'ENTRÉE de chaque ratio. Sous ce seuil,
 * le ratio est « non mesurable » et exclu du classement.
 */
const MIN_INPUT_SAMPLE: Record<ExpertiseRatioId, number> = {
  contacts_estimations: 20, // contacts
  estimations_mandats: 3, // estimations
  pct_exclusivite: 3, // mandats
  acheteurs_tournee: 5, // acheteurs
  visites_par_acheteur: 10, // (non noté)
  visites_offres: 10, // visites
  offres_compromis: 3, // offres
  compromis_actes: 3, // compromis
};

/** Volume d'entrée (numérateur porteur) d'un ratio. */
function inputVolume(id: ExpertiseRatioId, v: PainVolumes): number {
  switch (id) {
    case "contacts_estimations":
      return v.contacts;
    case "estimations_mandats":
      return v.estimations;
    case "pct_exclusivite":
      return v.mandats;
    case "acheteurs_tournee":
      return v.acheteurs;
    case "visites_offres":
      return v.visites;
    case "offres_compromis":
      return v.offres;
    case "compromis_actes":
      return v.compromis;
    case "visites_par_acheteur":
      return v.visites;
  }
}

/** Valeur du ratio calculé à partir des volumes (compat affichage/override). */
function ratioValueFromVolumes(id: ExpertiseRatioId, v: PainVolumes): number {
  switch (id) {
    case "contacts_estimations":
      return v.estimations > 0 ? v.contacts / v.estimations : 0;
    case "estimations_mandats":
      return v.mandats > 0 ? v.estimations / v.mandats : 0;
    case "pct_exclusivite":
      return v.mandats > 0 ? (v.exclusifs / v.mandats) * 100 : 0;
    case "acheteurs_tournee":
      return v.acheteursSortis > 0 ? v.acheteurs / v.acheteursSortis : 0;
    case "visites_offres":
      return v.offres > 0 ? v.visites / v.offres : 0;
    case "offres_compromis":
      return v.compromis > 0 ? v.offres / v.compromis : 0;
    case "compromis_actes":
      return v.actes > 0 ? v.compromis / v.actes : 0;
    case "visites_par_acheteur":
      return v.acheteursSortis > 0 ? v.visites / v.acheteursSortis : 0;
  }
}

// ─── Types publics ──────────────────────────────────────────────────────────

/**
 * Entrée du détecteur. Tous les éléments d'un même pool partagent les mêmes
 * `volumes`. `currentValue` est conservé pour compat (lecture par
 * pain-point-context-override et quelques vues).
 */
export interface MeasuredRatio {
  expertiseId: ExpertiseRatioId;
  /** Volumes bruts agrégés (identiques pour tous les ratios du pool). */
  volumes: PainVolumes;
  /** Valeur du ratio calculé — compat descendante. */
  currentValue: number;
  /** @deprecated plus utilisé par le scoring V3 ; conservé pour compat. */
  volumeBase?: number;
  /** @deprecated plus utilisé par le scoring V3 ; conservé pour compat. */
  legacyStatus?: "ok" | "warning" | "danger" | "non_mesurable";
}

export interface PainPointResult {
  expertiseId: ExpertiseRatioId;
  expertise: RatioExpertise;
  currentValue: number;
  targetValue: number;
  normalizedGap: number;
  /** Gain estimé en € sur la période (= gain en ventes × commission moyenne). */
  estimatedCaLossEur: number;
  /** V3 : gain en € (idem estimatedCaLossEur). Conservé pour la base DB. */
  painScore: number;
  /** V3 : gain en VENTES (clé de tri). */
  painScoreV2: number;
  /** @deprecated plus utilisé par le tri V3. */
  impactScoreNormalized: number;
  /** = `expertise.chainPosition` (compat affichage). */
  chainScore: number;
  /** = `FEASIBILITY_SCORE[feasibility]` (compat affichage). */
  feasibilityScore: number;
}

// ─── Fabrique de MeasuredRatio ──────────────────────────────────────────────

/**
 * Construit le pool des 7 ratios notables à partir d'un bundle de volumes.
 * Utilisé par les tests et par `buildMeasuredRatios` (ratio-to-expertise.ts).
 */
export function buildMeasuredRatiosFromVolumes(
  volumes: PainVolumes
): MeasuredRatio[] {
  return PAIN_RATIOS.map((expertiseId) => ({
    expertiseId,
    volumes,
    currentValue: ratioValueFromVolumes(expertiseId, volumes),
  }));
}

// ─── Scoring : gain en ventes propagé jusqu'à la vente ──────────────────────

/** Gain en ventes ignoré sous ce seuil. */
const MIN_GAIN_VENTES = 0.05;

/** Seuils résolus pour les ratios aval (taux de repli au seuil). */
interface ResolvedThresholds {
  contacts_estimations: number;
  estimations_mandats: number;
  pct_exclusivite: number;
  acheteurs_tournee: number;
  visites_par_acheteur: number;
  visites_offres: number;
  offres_compromis: number;
  compromis_actes: number;
}

function resolveAll(ctx: ThresholdContext): ResolvedThresholds {
  return {
    contacts_estimations: resolveThreshold(RATIO_EXPERTISE.contacts_estimations, ctx),
    estimations_mandats: resolveThreshold(RATIO_EXPERTISE.estimations_mandats, ctx),
    pct_exclusivite: resolveThreshold(RATIO_EXPERTISE.pct_exclusivite, ctx),
    acheteurs_tournee: resolveThreshold(RATIO_EXPERTISE.acheteurs_tournee, ctx),
    visites_par_acheteur: resolveThreshold(RATIO_EXPERTISE.visites_par_acheteur, ctx),
    visites_offres: resolveThreshold(RATIO_EXPERTISE.visites_offres, ctx),
    offres_compromis: resolveThreshold(RATIO_EXPERTISE.offres_compromis, ctx),
    compromis_actes: resolveThreshold(RATIO_EXPERTISE.compromis_actes, ctx),
  };
}

/**
 * Taux de conversion aval. Taux RÉEL du conseiller quand l'étape est mesurable
 * (volume d'entrée de l'étape ≥ son échantillon minimum), sinon taux AU SEUIL.
 */
function downstreamRates(
  v: PainVolumes,
  T: ResolvedThresholds,
  niveau: ProfileLevel
) {
  // Taux mandat → vente selon le niveau du conseiller (standard Start Academia).
  const tauxExclu = tauxMandatVente(niveau, "exclusif");
  const tauxSimple = tauxMandatVente(niveau, "simple");

  // Part d'exclusifs : réelle si assez de mandats, sinon part au seuil.
  const partExclu =
    v.mandats >= MIN_INPUT_SAMPLE.pct_exclusivite
      ? v.exclusifs / v.mandats
      : T.pct_exclusivite / 100;
  const ventesParMandat =
    partExclu * tauxExclu + (1 - partExclu) * tauxSimple;

  const rateEstimMandat =
    v.estimations >= MIN_INPUT_SAMPLE.estimations_mandats
      ? v.mandats / v.estimations
      : 1 / T.estimations_mandats;

  const rateVisiteOffre =
    v.visites >= MIN_INPUT_SAMPLE.visites_offres
      ? v.offres / v.visites
      : 1 / T.visites_offres;

  const rateOffreCompromis =
    v.offres >= MIN_INPUT_SAMPLE.offres_compromis
      ? v.compromis / v.offres
      : 1 / T.offres_compromis;

  // Résultante avec ~3 mois de décalage compromis→acte : le taux réel est
  // faussé (les actes du mois viennent de compromis d'il y a ~3 mois). On
  // prend donc TOUJOURS le taux au seuil, jamais v.actes.
  const rateCompromisActe = 1 / T.compromis_actes;

  const visitesParSorti =
    v.acheteursSortis > 0
      ? v.visites / v.acheteursSortis
      : T.visites_par_acheteur;

  return {
    ventesParMandat,
    rateEstimMandat,
    rateVisiteOffre,
    rateOffreCompromis,
    rateCompromisActe,
    visitesParSorti,
  };
}

/** Gain en ventes pour un ratio donné (sortie manquante propagée à la vente). */
function gainVentes(
  id: ExpertiseRatioId,
  v: PainVolumes,
  T: ResolvedThresholds,
  niveau: ProfileLevel
): number {
  const r = downstreamRates(v, T, niveau);
  switch (id) {
    case "contacts_estimations": {
      const missing = Math.max(0, v.contacts / T.contacts_estimations - v.estimations);
      return missing * r.rateEstimMandat * r.ventesParMandat;
    }
    case "estimations_mandats": {
      const missing = Math.max(0, v.estimations / T.estimations_mandats - v.mandats);
      return missing * r.ventesParMandat;
    }
    case "pct_exclusivite": {
      const partExclu = v.mandats > 0 ? v.exclusifs / v.mandats : 0;
      const missingShare = Math.max(0, T.pct_exclusivite / 100 - partExclu);
      // Gain d'1 point d'exclusivité = écart de taux exclusif − simple, au
      // niveau du conseiller.
      const deltaTaux =
        tauxMandatVente(niveau, "exclusif") - tauxMandatVente(niveau, "simple");
      return v.mandats * missingShare * deltaTaux;
    }
    case "acheteurs_tournee": {
      const missing = Math.max(0, v.acheteurs / T.acheteurs_tournee - v.acheteursSortis);
      return (
        missing *
        r.visitesParSorti *
        r.rateVisiteOffre *
        r.rateOffreCompromis *
        r.rateCompromisActe
      );
    }
    case "visites_offres": {
      const missing = Math.max(0, v.visites / T.visites_offres - v.offres);
      return missing * r.rateOffreCompromis * r.rateCompromisActe;
    }
    case "offres_compromis": {
      const missing = Math.max(0, v.offres / T.offres_compromis - v.compromis);
      return missing * r.rateCompromisActe;
    }
    case "compromis_actes":
      // Résultante (décalage ~3 mois) : jamais un levier, aucun gain propagé.
      return 0;
    case "visites_par_acheteur":
      return 0;
  }
}

/** Écart normalisé directionnel (compat — ne sert plus au tri). */
function normalizedGap(expertise: RatioExpertise, current: number, target: number): number {
  if (target <= 0) return 0;
  const raw =
    expertise.direction === "less_is_better"
      ? (current - target) / target
      : (target - current) / target;
  return Math.max(0, raw);
}

/**
 * Note tous les ratios du pool et retourne le tableau trié par gain en ventes
 * décroissant. Ratios sous l'échantillon minimum ou sous 0,05 vente exclus.
 */
function scoreAllPainPoints(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext
): PainPointResult[] {
  if (measuredRatios.length === 0) return [];
  const T = resolveAll(ctx);

  const scored: PainPointResult[] = [];
  for (const measured of measuredRatios) {
    const expertise = RATIO_EXPERTISE[measured.expertiseId];
    if (!expertise) continue;

    const v = measured.volumes;
    // Échantillon minimum sur le volume d'entrée → non mesurable, exclu.
    if (inputVolume(measured.expertiseId, v) < MIN_INPUT_SAMPLE[measured.expertiseId]) {
      continue;
    }

    const ventes = gainVentes(measured.expertiseId, v, T, ctx.seniority);
    if (ventes < MIN_GAIN_VENTES) continue;

    const targetValue = resolveThreshold(expertise, ctx);
    const currentValue = ratioValueFromVolumes(measured.expertiseId, v);
    const gainEur = ventes * ctx.avgCommissionEur;

    scored.push({
      expertiseId: measured.expertiseId,
      expertise,
      currentValue,
      targetValue,
      normalizedGap: normalizedGap(expertise, currentValue, targetValue),
      estimatedCaLossEur: gainEur,
      painScore: gainEur,
      painScoreV2: ventes,
      impactScoreNormalized: 0,
      chainScore: expertise.chainPosition,
      feasibilityScore: FEASIBILITY_SCORE[expertise.feasibility],
    });
  }

  scored.sort((a, b) => b.painScoreV2 - a.painScoreV2);
  return scored;
}

/**
 * Retourne LE ratio le plus douloureux (gain en ventes max), ou null.
 */
export function detectBiggestPainPoint(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext
): PainPointResult | null {
  const scored = scoreAllPainPoints(measuredRatios, ctx);
  return scored[0] ?? null;
}

/**
 * Retourne le top N des douleurs (tri par gain en ventes décroissant).
 */
export function detectTopPainPoints(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
  limit = 3
): PainPointResult[] {
  const scored = scoreAllPainPoints(measuredRatios, ctx);
  return scored.slice(0, limit);
}

// ─── Compat : variante « with context » ─────────────────────────────────────

import type { PainContextOverride } from "@/lib/pain-point-context-override";
import type { PeriodResults } from "@/types/results";

/**
 * Résultat enrichi. En V3 `override` est TOUJOURS null (l'override contextuel
 * ne sert plus : le gain en ventes détecte directement les blocages aval).
 */
export interface PainPointWithContext {
  painPoint: PainPointResult;
  override: PainContextOverride | null;
}

/**
 * Signature conservée pour compat. `_results` n'est plus utilisé (l'appel à
 * detectContextualBlockage est retiré) ; `override` reste null.
 */
export function detectBiggestPainPointWithContext(
  measuredRatios: MeasuredRatio[],
  ctx: ThresholdContext,
  _results: PeriodResults | null
): PainPointWithContext | null {
  const scored = scoreAllPainPoints(measuredRatios, ctx);
  if (scored.length === 0) return null;
  return { painPoint: scored[0], override: null };
}
