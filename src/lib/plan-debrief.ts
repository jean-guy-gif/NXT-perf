import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { ImprovementResource } from "@/lib/improvement-resources-adapters";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { computeAllRatios } from "@/lib/ratios";
import { PLAN_30J_DURATION_DAYS } from "@/config/coaching";

// Facteurs produit validés D4
const ALONE_6M_FACTOR = 0.7;
const COACH_6M_FACTOR = 1.8;

// Amélioration typique d'un plan bien suivi (simulation si pas d'historique)
const TYPICAL_IMPROVEMENT_PCT = 0.25; // +25 % sur le ratio baseline

// Mapping ExpertiseRatioId → RatioId (inverse du RATIO_ID_TO_EXPERTISE_ID)
const EXPERTISE_TO_RATIO_ID: Partial<Record<ExpertiseRatioId, RatioId>> = {
  contacts_estimations: "contacts_rdv",
  estimations_mandats: "rdv_mandats",
  pct_exclusivite: "pct_mandats_exclusifs",
  acheteurs_tournee: "acheteurs_visites",
  visites_par_acheteur: "acheteurs_visites",
  visites_offres: "visites_offre",
  offres_compromis: "offres_compromis",
  compromis_actes: "compromis_actes",
};

// Coef cascade "gain unitaire sur ce ratio" → "actes supplémentaires"
const CONVERSION_TO_ACTE: Record<ExpertiseRatioId, number> = {
  contacts_estimations: 0.16, // estim → mandat 0.5 × exclu 0.4 × actes 0.8
  estimations_mandats: 0.32,
  pct_exclusivite: 0.8,
  acheteurs_tournee: 0.8,
  visites_par_acheteur: 0.8,
  visites_offres: 0.64,
  offres_compromis: 0.8,
  compromis_actes: 1.0,
};

export interface FieldGains {
  contacts: number;
  estimations: number;
  mandats: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
}

export interface PlanDebriefResult {
  // Section 1 — Ton plan en chiffres
  actionsStats: {
    done: number;
    total: number;
    percentDone: number;
  };
  weeksWithSaisie: number;
  ratioLabel: string;
  ratioBaseline: number;
  ratioCurrent: number;
  ratioDeltaPoints: number;
  isImproving: boolean;

  // Section 2 — Résultats concrets
  monthlyGainEur: number;
  annualProjectedEur: number;
  additionalEstimationsPerMonth: number | null;
  additionalActesPerMonth: number;
  fieldGains: FieldGains;

  // Section 3 — Et après
  sixMonthsAloneEur: number;
  sixMonthsWithCoachEur: number;
  upsideCoachEur: number;
}

export function computePlanDebrief(
  plan: ImprovementResource,
  periodResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>,
  avgCommissionEur: number
): PlanDebriefResult {
  const payload = (plan.payload ?? {}) as Record<string, unknown>;

  // ── Actions stats (strict : status === "done") ──
  const weeks = (payload.weeks ?? []) as Array<{
    week_number: number;
    actions: Array<{ id: string; label: string; done: boolean; status?: string }>;
  }>;
  const allActions = weeks.flatMap((w) => w.actions);
  const total = allActions.length;
  const done = allActions.filter(
    (a) => a.status === "done" || a.done === true
  ).length;
  const percentDone = total > 0 ? Math.round((done / total) * 100) : 0;

  // ── Ratio ciblé ──
  const painRatioId = plan.pain_ratio_id as ExpertiseRatioId;
  const expertise = RATIO_EXPERTISE[painRatioId];
  const ratioLabel = expertise?.label ?? painRatioId ?? "Ratio";

  // ── Baseline : priorité payload → 1re période avant plan → seuil confirmé × 0.7 ──
  const baselineFromPayload = payload.baseline_ratio_value as number | undefined;
  const planCreatedAt = plan.created_at;

  // Fenêtre théorique de 30 jours depuis la création du plan.
  // On n'utilise PAS expires_at car il peut être forcé dans le passé
  // (fast-forward démo) et casser le filtre des saisies.
  const theoreticalWindowEnd = new Date(
    new Date(planCreatedAt).getTime() +
      PLAN_30J_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const duringPlanResults = periodResults
    .filter(
      (r) =>
        r.periodStart >= planCreatedAt && r.periodStart <= theoreticalWindowEnd
    )
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const weeksWithSaisie = duringPlanResults.length;

  const getRatioValueForPeriod = (period: PeriodResults): number | null => {
    // computeAllRatios signature réelle : (results, category, ratioConfigs)
    const ratios = computeAllRatios(period, "confirme", ratioConfigs);
    const ratioId = EXPERTISE_TO_RATIO_ID[painRatioId];
    if (!ratioId) return null;
    const computed = ratios.find((r) => r.ratioId === ratioId);
    return computed?.value ?? null;
  };

  let ratioBaseline: number;
  if (typeof baselineFromPayload === "number") {
    ratioBaseline = baselineFromPayload;
  } else {
    const beforePlan = periodResults
      .filter((r) => r.periodStart < planCreatedAt)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
    if (beforePlan) {
      ratioBaseline =
        getRatioValueForPeriod(beforePlan) ??
        (expertise?.thresholds.confirme ?? 1) * 0.7;
    } else {
      ratioBaseline = (expertise?.thresholds.confirme ?? 1) * 0.7;
    }
  }

  // ── Ratio actuel : moyenne des saisies pendant le plan OU simulation ──
  let ratioCurrent: number;
  if (duringPlanResults.length > 0) {
    const values = duringPlanResults
      .map(getRatioValueForPeriod)
      .filter((v): v is number => v !== null && v > 0);
    if (values.length > 0) {
      ratioCurrent = values.reduce((s, v) => s + v, 0) / values.length;
    } else {
      ratioCurrent = simulateCurrent(ratioBaseline, percentDone, painRatioId);
    }
  } else {
    ratioCurrent = simulateCurrent(ratioBaseline, percentDone, painRatioId);
  }

  // "more_is_better" pour pct_exclusivite ; sinon less_is_better
  const isLowerBetter = painRatioId !== "pct_exclusivite";
  const ratioDeltaPoints = isLowerBetter
    ? ratioBaseline - ratioCurrent
    : ratioCurrent - ratioBaseline;
  const isImproving = ratioDeltaPoints > 0;

  // ── Volume mensuel de base pour projection ──
  const recent3 = periodResults
    .slice()
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .slice(0, 3);

  const avgVolumeMonthly =
    recent3.length > 0
      ? recent3.reduce((s, r) => s + getVolumeForRatio(painRatioId, r), 0) /
        recent3.length
      : simulateVolume(painRatioId);

  // ── Calcul ROI concret ──
  const coefToActe = CONVERSION_TO_ACTE[painRatioId] ?? 0.3;
  const deltaForCalc = Math.abs(ratioDeltaPoints);

  let additionalUnitsPerMonth = 0;
  if (isImproving && avgVolumeMonthly > 0) {
    if (isLowerBetter && ratioCurrent > 0 && ratioBaseline > 0) {
      // Ex contacts/estim : nbEstim_apres − nbEstim_avant
      additionalUnitsPerMonth =
        avgVolumeMonthly / ratioCurrent - avgVolumeMonthly / ratioBaseline;
    } else if (!isLowerBetter) {
      // Ex % exclusivité : volume × delta%
      additionalUnitsPerMonth = avgVolumeMonthly * (deltaForCalc / 100);
    }
  }

  const additionalActesPerMonth =
    isImproving && Number.isFinite(additionalUnitsPerMonth)
      ? Math.max(0, additionalUnitsPerMonth * coefToActe)
      : 0;

  const monthlyGainEur = additionalActesPerMonth * avgCommissionEur;
  const annualProjectedEur = monthlyGainEur * 12;
  const sixMonthsAloneEur = monthlyGainEur * 6 * ALONE_6M_FACTOR;
  const sixMonthsWithCoachEur = monthlyGainEur * 6 * COACH_6M_FACTOR;
  const upsideCoachEur = sixMonthsWithCoachEur - sixMonthsAloneEur;

  // Contextuel : +estimations/mois (seulement pour contacts_estimations)
  let additionalEstimationsPerMonth: number | null = null;
  if (
    painRatioId === "contacts_estimations" &&
    isImproving &&
    ratioBaseline > 0 &&
    ratioCurrent > 0
  ) {
    const estimAvant = avgVolumeMonthly / ratioBaseline;
    const estimApres = avgVolumeMonthly / ratioCurrent;
    additionalEstimationsPerMonth = Math.max(0, estimApres - estimAvant);
  }

  const fieldGains = computeFieldGains(duringPlanResults, periodResults, planCreatedAt);

  return {
    actionsStats: { done, total, percentDone },
    weeksWithSaisie,
    ratioLabel,
    ratioBaseline: round2(ratioBaseline),
    ratioCurrent: round2(ratioCurrent),
    ratioDeltaPoints: round2(ratioDeltaPoints),
    isImproving,
    monthlyGainEur: Math.round(monthlyGainEur),
    annualProjectedEur: Math.round(annualProjectedEur),
    additionalEstimationsPerMonth:
      additionalEstimationsPerMonth !== null
        ? Math.round(additionalEstimationsPerMonth * 10) / 10
        : null,
    additionalActesPerMonth: Math.round(additionalActesPerMonth * 10) / 10,
    fieldGains,
    sixMonthsAloneEur: Math.round(sixMonthsAloneEur),
    sixMonthsWithCoachEur: Math.round(sixMonthsWithCoachEur),
    upsideCoachEur: Math.round(upsideCoachEur),
  };
}

// ─── Gains terrain cumulés (cumul saisies plan vs projection baseline) ──────

function computeFieldGains(
  duringPlanResults: PeriodResults[],
  periodResults: PeriodResults[],
  planCreatedAt: string
): FieldGains {
  const empty: FieldGains = {
    contacts: 0,
    estimations: 0,
    mandats: 0,
    visites: 0,
    offres: 0,
    compromis: 0,
    actes: 0,
  };

  if (duringPlanResults.length === 0) return empty;

  const duringTotals = duringPlanResults.reduce<FieldGains>(
    (acc, r) => ({
      contacts: acc.contacts + r.prospection.contactsTotaux,
      estimations: acc.estimations + r.vendeurs.estimationsRealisees,
      mandats: acc.mandats + r.vendeurs.mandatsSignes,
      visites: acc.visites + r.acheteurs.nombreVisites,
      offres: acc.offres + r.acheteurs.offresRecues,
      compromis: acc.compromis + r.acheteurs.compromisSignes,
      actes: acc.actes + r.ventes.actesSignes,
    }),
    { ...empty }
  );

  const beforePlan = periodResults
    .filter((r) => r.periodStart < planCreatedAt)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    .slice(0, 3);

  // Pas d'historique → les volumes pendant le plan sont tous "nouveaux"
  if (beforePlan.length === 0) {
    return {
      contacts: Math.round(duringTotals.contacts),
      estimations: Math.round(duringTotals.estimations),
      mandats: Math.round(duringTotals.mandats),
      visites: Math.round(duringTotals.visites),
      offres: Math.round(duringTotals.offres),
      compromis: Math.round(duringTotals.compromis),
      actes: Math.round(duringTotals.actes),
    };
  }

  const baselineTotals = beforePlan.reduce<FieldGains>(
    (acc, r) => ({
      contacts: acc.contacts + r.prospection.contactsTotaux,
      estimations: acc.estimations + r.vendeurs.estimationsRealisees,
      mandats: acc.mandats + r.vendeurs.mandatsSignes,
      visites: acc.visites + r.acheteurs.nombreVisites,
      offres: acc.offres + r.acheteurs.offresRecues,
      compromis: acc.compromis + r.acheteurs.compromisSignes,
      actes: acc.actes + r.ventes.actesSignes,
    }),
    { ...empty }
  );

  const n = beforePlan.length;
  const nbSaisies = duringPlanResults.length;
  const avg = {
    contacts: baselineTotals.contacts / n,
    estimations: baselineTotals.estimations / n,
    mandats: baselineTotals.mandats / n,
    visites: baselineTotals.visites / n,
    offres: baselineTotals.offres / n,
    compromis: baselineTotals.compromis / n,
    actes: baselineTotals.actes / n,
  };

  return {
    contacts: Math.max(0, Math.round(duringTotals.contacts - avg.contacts * nbSaisies)),
    estimations: Math.max(0, Math.round(duringTotals.estimations - avg.estimations * nbSaisies)),
    mandats: Math.max(0, Math.round(duringTotals.mandats - avg.mandats * nbSaisies)),
    visites: Math.max(0, Math.round(duringTotals.visites - avg.visites * nbSaisies)),
    offres: Math.max(0, Math.round(duringTotals.offres - avg.offres * nbSaisies)),
    compromis: Math.max(0, Math.round(duringTotals.compromis - avg.compromis * nbSaisies)),
    actes: Math.max(0, Math.round(duringTotals.actes - avg.actes * nbSaisies)),
  };
}

// ─── Helpers internes ────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function simulateCurrent(
  baseline: number,
  percentDone: number,
  painRatioId: ExpertiseRatioId
): number {
  // percentDone en [0, 100], convertit en [0, 1]
  const progress = percentDone / 100;
  const isLowerBetter = painRatioId !== "pct_exclusivite";
  if (isLowerBetter) {
    // Le ratio baisse d'autant que percentDone est élevé
    return baseline * (1 - TYPICAL_IMPROVEMENT_PCT * progress);
  }
  // pct_exclusivite : monte
  return baseline * (1 + TYPICAL_IMPROVEMENT_PCT * progress);
}

function simulateVolume(painRatioId: ExpertiseRatioId): number {
  // Volume mensuel typique simulé pour la démo (ordre de grandeur réaliste)
  switch (painRatioId) {
    case "contacts_estimations":
      return 80;
    case "estimations_mandats":
      return 8;
    case "pct_exclusivite":
      return 4;
    case "acheteurs_tournee":
    case "visites_par_acheteur":
      return 10;
    case "visites_offres":
      return 20;
    case "offres_compromis":
      return 4;
    case "compromis_actes":
      return 3;
  }
}

function getVolumeForRatio(
  painRatioId: ExpertiseRatioId,
  period: PeriodResults
): number {
  switch (painRatioId) {
    case "contacts_estimations":
      return period.prospection.contactsTotaux;
    case "estimations_mandats":
      return period.vendeurs.estimationsRealisees;
    case "pct_exclusivite":
      return period.vendeurs.mandatsSignes;
    case "acheteurs_tournee":
    case "visites_par_acheteur":
      return period.acheteurs.acheteursSortisVisite;
    case "visites_offres":
      return period.acheteurs.nombreVisites;
    case "offres_compromis":
      return period.acheteurs.offresRecues;
    case "compromis_actes":
      return period.acheteurs.compromisSignes;
  }
}
