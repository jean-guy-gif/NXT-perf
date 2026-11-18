/**
 * Génération des plans 30 jours NXT Performance — V2 (flywheel)
 *
 * Nouvelle logique (Philosophie B — focus unique) :
 * Chaque plan cible UNE seule douleur (le ratio le plus coûteux en €
 * via pain-point-detector.ts), pas une liste de priorités.
 *
 * Le contenu des semaines est tiré directement du doc d'expertise Jean-Guy
 * (ratio-expertise.ts), section Q3 (best practices) et Q4 (first action).
 */

import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import {
  PLAN_CONTENT,
  type PlanWeekContent,
} from "@/data/plan-content";
import {
  FEASIBILITY_SCORE,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import type {
  Plan30jPayload,
  Plan30jWeek,
} from "@/config/coaching";

// Types publics

export interface GeneratedPlan30j {
  painRatioId: ExpertiseRatioId;
  painScore: number;
  estimatedCaLossEur: number;
  weeks: Plan30jWeek[];
  diagnosis: string;
  bestPractices: string;
  expectedImpactDelayDays: number;
  generatedAt: string;
}

// Génération du plan focalisé sur 1 douleur

/**
 * Génère un plan 30 jours focalisé exclusivement sur le plus gros point de
 * douleur du conseiller.
 *
 * Pour les 6 leviers, le contenu des semaines 1-3 vient de `PLAN_CONTENT`
 * (texte écrit POUR le conseiller, validé par Jean-Guy le 18/11/2026) ; la
 * semaine 4 « Mesurer » est générée. Chaque semaine porte un `geste`
 * (champ `exercice`) et des `actions`.
 *
 * Structure (4 semaines) : S1 Comprendre · S2 Corriger · S3 Appliquer ·
 * S4 Mesurer. Pour les ratios hors des 6 leviers (chemin legacy par aire),
 * on garde un repli tiré du doc d'expertise.
 */
export function generatePlan30j(painPoint: PainPointResult): GeneratedPlan30j {
  const expertise = painPoint.expertise;
  const content = PLAN_CONTENT[painPoint.expertiseId];

  const weeks: Plan30jWeek[] = content
    ? [
        buildLeverWeek(1, "Comprendre", content.s1),
        buildLeverWeek(2, "Corriger", content.s2),
        buildLeverWeek(3, "Appliquer", content.s3),
        buildWeek4Mesurer(painPoint),
      ]
    : buildFallbackWeeks(painPoint);

  return {
    painRatioId: painPoint.expertiseId,
    painScore: painPoint.painScore,
    estimatedCaLossEur: painPoint.estimatedCaLossEur,
    weeks,
    diagnosis: expertise.diagnosis,
    bestPractices: expertise.bestPractices,
    expectedImpactDelayDays: expertise.expectedImpactDelayDays,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Entrée / sortie de chaque levier « X pour 1 Y » ────────────────────────

export interface LevierObjectif {
  /** Volume d'entrée du ratio, au pluriel (ex. « visites »). */
  input: string;
  /** Sortie visée, au singulier (ex. « offre »). */
  output: string;
}

/** Entrée / sortie de chaque levier (pct_exclusivite traité à part, en %). */
export const LEVIER_OBJECTIF: Partial<Record<ExpertiseRatioId, LevierObjectif>> = {
  contacts_estimations: { input: "contacts", output: "estimation" },
  estimations_mandats: { input: "estimations", output: "mandat" },
  acheteurs_tournee: { input: "acheteurs", output: "sortie en visite" },
  visites_offres: { input: "visites", output: "offre" },
  offres_compromis: { input: "offres", output: "compromis" },
};

/** Formate un nombre : entier tel quel, sinon une décimale avec virgule FR. */
export function fmtNombre(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

/**
 * Arrondi d'AFFICHAGE d'une cible / valeur de ratio montrée au conseiller.
 * N'affecte QUE l'affichage — les calculs internes (détecteur de douleur,
 * gains en €, statuts, écarts) gardent la valeur exacte.
 *
 * - % d'exclusivité → entier (ex. 52,5 % → 53 %).
 * - ratio « X pour 1 Y » → entier le plus proche si ≥ 3 (9,5 → 10, 14,3 → 14) ;
 *   sinon au 0,5 le plus proche en dessous de 3 (1,9 → 2, 1,6 → 1,5).
 */
export function formatCible(valeur: number, levier: ExpertiseRatioId): string {
  if (levier === "pct_exclusivite") {
    return `${Math.round(valeur)} %`;
  }
  const arrondi = valeur >= 3 ? Math.round(valeur) : Math.round(valeur * 2) / 2;
  return fmtNombre(arrondi);
}

/**
 * En-tête du plan, au-dessus des 4 semaines : où en est le conseiller vs la
 * cible à 30 jours. Nombres au format français, une décimale maximum.
 */
export function planHeaderLine(
  expertiseId: ExpertiseRatioId,
  currentValue: number,
  targetValue: number,
): string {
  if (expertiseId === "pct_exclusivite") {
    return `Tu es à ${formatCible(currentValue, expertiseId)} d'exclusivité · cible à 30 jours : ${formatCible(targetValue, expertiseId)}`;
  }
  const o = LEVIER_OBJECTIF[expertiseId];
  if (!o) return "";
  return `Tu es à ${formatCible(currentValue, expertiseId)} ${o.input} pour 1 ${o.output} · cible à 30 jours : ${formatCible(targetValue, expertiseId)}`;
}

// ─── Semaines 1-3 — contenu validé (PLAN_CONTENT) ───────────────────────────

function buildLeverWeek(
  weekNumber: 1 | 2 | 3,
  focus: string,
  week: PlanWeekContent,
): Plan30jWeek {
  return {
    week_number: weekNumber,
    focus,
    actions: week.actions.map((label, i) => ({
      id: `w${weekNumber}-action-${i + 1}`,
      label,
      done: false,
    })),
    // Le geste de la semaine s'affiche sous « Geste de la semaine ».
    exercice: week.geste,
  };
}

// ─── Semaine 4 — Mesurer (générée, identique pour tous les leviers) ─────────

function buildWeek4Mesurer(painPoint: PainPointResult): Plan30jWeek {
  const cur = formatCible(painPoint.currentValue, painPoint.expertiseId);

  let saisie: string;
  if (painPoint.expertiseId === "pct_exclusivite") {
    saisie = `Fais ta saisie : quel % de mandats exclusifs ce mois-ci ? Tu étais à ${cur}.`;
  } else {
    const o = LEVIER_OBJECTIF[painPoint.expertiseId];
    saisie = o
      ? `Fais ta saisie : combien de ${o.input} pour 1 ${o.output} ce mois-ci ? Tu étais à ${cur}.`
      : `Fais ta saisie et compare ton ratio ${painPoint.expertise.label} ce mois-ci. Tu étais à ${cur}.`;
  }

  return {
    week_number: 4,
    focus: "Mesurer",
    actions: [
      { id: "w4-action-1", label: saisie, done: false },
      { id: "w4-action-2", label: "Choisis les 2 gestes que tu gardes.", done: false },
    ],
    exercice: "Fais le point sur ton mois.",
  };
}

// ─── Repli (ratios hors des 6 leviers, via le chemin legacy par aire) ───────

function buildFallbackWeeks(painPoint: PainPointResult): Plan30jWeek[] {
  const e = painPoint.expertise;
  const geste = `Repère où tu te reconnais sur ${e.label}.`;

  const s1: Plan30jWeek = {
    week_number: 1,
    focus: "Comprendre",
    actions: e.commonCauses.map((cause, i) => ({
      id: `w1-action-${i + 1}`,
      label: `${cause} → Est-ce que je fais ça ?`,
      done: false,
    })),
    exercice: geste,
  };

  const s2: Plan30jWeek = {
    week_number: 2,
    focus: "Corriger",
    actions: [{ id: "w2-action-1", label: e.firstAction, done: false }],
    exercice: geste,
  };

  const s3: Plan30jWeek = {
    week_number: 3,
    focus: "Appliquer",
    actions: [{ id: "w3-action-1", label: e.bestPractices, done: false }],
    exercice: geste,
  };

  return [s1, s2, s3, buildWeek4Mesurer(painPoint)];
}

// Conversion vers payload JSONB pour stockage Supabase

/**
 * Prepare le payload JSONB a stocker dans user_improvement_resources.payload
 * pour une ressource de type plan_30j.
 */
export function planToPayload(plan: GeneratedPlan30j): Plan30jPayload {
  return {
    pain_ratio_id: plan.painRatioId,
    pain_score: plan.painScore,
    estimated_ca_loss_eur: plan.estimatedCaLossEur,
    weeks: plan.weeks,
  };
}

// Re-export des types expertise pour compat

export type { ExpertiseRatioId } from "@/data/ratio-expertise";
export { RATIO_EXPERTISE } from "@/data/ratio-expertise";
// ═══════════════════════════════════════════════════════════════════════════
// COUCHE LEGACY — Adaptateur pour composants UI existants
// ═══════════════════════════════════════════════════════════════════════════
// Ces exports maintiennent l'ancienne API (multi-priorités, PlanPriority[])
// alimentée en interne par la nouvelle logique V2 (1 douleur max).
//
// Utilisé par : hooks/use-plans.ts, components/formation/plan-30-jours.tsx,
//               components/dashboard/production-chain.tsx, dashboard/page.tsx
//
// À migrer progressivement via tickets dédiés pour consommer directement
// l'API V2 (generatePlan30j, GeneratedPlan30j).
// ═══════════════════════════════════════════════════════════════════════════

import type { RatioId, RatioConfig } from "@/types/ratios";
import type { FormationArea, FormationDiagnostic } from "@/types/formation";

// ─── Types legacy ────────────────────────────────────────────────────

export type ActionStatus = "todo" | "in_progress" | "done";

export interface PlanAction {
  id: string;
  label: string;
  done: boolean;
  status: ActionStatus;
  note?: string;
}

export interface WeekPlan {
  weekNumber: 1 | 2 | 3 | 4;
  actions: PlanAction[];
  exercice: string;
}

export interface PlanPriority {
  ratioId: RatioId;
  area: FormationArea;
  label: string;
  currentValue: number;
  targetValue: number;
  status: "danger" | "warning";
}

export interface Plan30Days {
  priorities: PlanPriority[];
  weeks: WeekPlan[];
  generatedAt: string;
}

// ─── Mappings FormationArea ↔ ExpertiseRatioId ───────────────────────

const areaToExpertiseId: Record<FormationArea, ExpertiseRatioId> = {
  prospection: "contacts_estimations",
  estimation: "estimations_mandats",
  exclusivite: "pct_exclusivite",
  accompagnement_acheteur: "visites_offres",
  negociation: "offres_compromis",
  suivi_mandat: "compromis_actes",
};

const areaToRatioId: Record<FormationArea, RatioId> = {
  prospection: "contacts_rdv",
  estimation: "rdv_mandats",
  exclusivite: "pct_mandats_exclusifs",
  accompagnement_acheteur: "visites_offre",
  negociation: "offres_compromis",
  suivi_mandat: "compromis_actes",
};

const areaLabels: Record<FormationArea, string> = {
  prospection: "Prospection",
  estimation: "Estimation",
  exclusivite: "Exclusivite",
  suivi_mandat: "Suivi Mandat",
  accompagnement_acheteur: "Accompagnement Acheteur",
  negociation: "Negociation",
};

// ─── Fonctions legacy ────────────────────────────────────────────────

/**
 * LEGACY — Retourne la priorite principale (Philosophie B : focus unique).
 */
export function computeTopPriorities(
  diagnostic: FormationDiagnostic
): PlanPriority[] {
  const topRec = diagnostic.recommendations
    .filter((r) => r.priority <= 2)
    .slice(0, 1);

  return topRec.map((rec) => ({
    ratioId: areaToRatioId[rec.area],
    area: rec.area,
    label: areaLabels[rec.area],
    currentValue: rec.currentRatio,
    targetValue: rec.targetRatio,
    status: rec.priority === 1 ? ("danger" as const) : ("warning" as const),
  }));
}

/**
 * LEGACY — Genere un Plan30Days au format ancien a partir de priorites.
 * En interne, delegue a generatePlan30j pour le contenu des semaines.
 */
export function generatePlan30Days(
  priorities: PlanPriority[],
  _ratioConfigs: Record<RatioId, RatioConfig>
): Plan30Days {
  const mainPriority = priorities[0];

  if (!mainPriority) {
    return {
      priorities: [],
      weeks: [
        { weekNumber: 1, actions: [], exercice: "" },
        { weekNumber: 2, actions: [], exercice: "" },
        { weekNumber: 3, actions: [], exercice: "" },
        { weekNumber: 4, actions: [], exercice: "" },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const expertiseId = areaToExpertiseId[mainPriority.area];
  const expertise = RATIO_EXPERTISE[expertiseId];

  // Chantier A.1 — composantes V2 dérivées de l'expertise (le pain n'est pas
  // détecté ici, on construit un fake pour générer le contenu pédagogique).
  const feasibilityScore = FEASIBILITY_SCORE[expertise.feasibility];
  const chainScore = expertise.chainPosition;
  const fakePainPoint: PainPointResult = {
    expertiseId,
    expertise,
    currentValue: mainPriority.currentValue,
    targetValue: mainPriority.targetValue,
    normalizedGap:
      Math.abs(mainPriority.currentValue - mainPriority.targetValue) /
      (mainPriority.targetValue || 1),
    estimatedCaLossEur: 0,
    painScore: 0,
    painScoreV2: 0.4 * chainScore + 0.2 * feasibilityScore,
    impactScoreNormalized: 0,
    chainScore,
    feasibilityScore,
  };

  const newPlan = generatePlan30j(fakePainPoint);

  const legacyWeeks: WeekPlan[] = newPlan.weeks.map((w) => ({
    weekNumber: w.week_number,
    actions: w.actions.map((a) => ({
      id: a.id,
      label: a.label,
      done: a.done,
      status: (a.done ? "done" : "todo") as ActionStatus,
      note: undefined,
    })),
    exercice: w.exercice ?? "",
  }));

  return {
    priorities: [mainPriority],
    weeks: legacyWeeks,
    generatedAt: newPlan.generatedAt,
  };
}
