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
  type RatioExpertise,
} from "@/data/ratio-expertise";
import {
  FEASIBILITY_SCORE,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import type {
  Plan30jAction,
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
 * douleur du conseiller, avec un contenu tiré du doc d'expertise.
 *
 * Structure narrative (4 semaines) :
 *   S1 — Diagnostic personnel + première action (Q4)
 *   S2 — Ancrage des meilleures pratiques (Q3 partie 1)
 *   S3 — Mise en pratique avancée (Q3 partie 2)
 *   S4 — Consolidation + mesure d\'impact
 */
export function generatePlan30j(painPoint: PainPointResult): GeneratedPlan30j {
  const expertise = painPoint.expertise;

  const weeks: Plan30jWeek[] = [
    buildWeek1Diagnostic(expertise),
    buildWeek2Ancrage(expertise),
    buildWeek3MisePratique(expertise),
    buildWeek4Consolidation(expertise),
  ];

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

// Semaine 1 - Diagnostic + premiere action

function buildWeek1Diagnostic(expertise: RatioExpertise): Plan30jWeek {
  const actions: Plan30jAction[] = [
    {
      id: "w1-action-1",
      label: `Identifier precisement les 3 derniers cas ou vous avez constate ce probleme sur ${expertise.label}`,
      done: false,
    },
    {
      id: "w1-action-2",
      label: `Appliquer la premiere action recommandee : ${expertise.firstAction}`,
      done: false,
    },
    {
      id: "w1-action-3",
      label: "Tenir un journal de bord : noter chaque situation rencontree cette semaine liee a ce ratio",
      done: false,
    },
  ];

  return {
    week_number: 1,
    focus: `Diagnostic et premiere action sur ${expertise.label}`,
    actions,
    exercice: `Exercice NXT - Analyse personnelle : pourquoi ce ratio se degrade chez vous`,
  };
}

// Semaine 2 - Ancrage des meilleures pratiques

function buildWeek2Ancrage(expertise: RatioExpertise): Plan30jWeek {
  const firstBestPracticeSentence = extractFirstSentence(expertise.bestPractices);

  const actions: Plan30jAction[] = [
    {
      id: "w2-action-1",
      label: firstBestPracticeSentence,
      done: false,
    },
    {
      id: "w2-action-2",
      label: "Preparer 3 situations professionnelles cette semaine ou vous appliquerez la methode des meilleurs",
      done: false,
    },
    {
      id: "w2-action-3",
      label: "Demander un retour a un collegue ou a votre manager apres chaque tentative",
      done: false,
    },
  ];

  return {
    week_number: 2,
    focus: "Ancrage : adopter les reflexes des meilleurs",
    actions,
    exercice: `Exercice NXT - Jeu de role sur ${expertise.label}`,
  };
}

// Semaine 3 - Mise en pratique avancee

function buildWeek3MisePratique(_expertise: RatioExpertise): Plan30jWeek {
  const actions: Plan30jAction[] = [
    {
      id: "w3-action-1",
      label: "Appliquer la methode complete sur au moins 5 dossiers reels cette semaine",
      done: false,
    },
    {
      id: "w3-action-2",
      label: "Documenter chaque application : ce qui a fonctionne, ce qui a resiste",
      done: false,
    },
    {
      id: "w3-action-3",
      label: "Ajuster votre approche en cours de route selon les retours terrain",
      done: false,
    },
  ];

  return {
    week_number: 3,
    focus: "Mise en pratique intensive et ajustements",
    actions,
    exercice: "Exercice NXT - Debrief hebdomadaire avec analyse des resistances",
  };
}

// Semaine 4 - Consolidation + mesure

function buildWeek4Consolidation(expertise: RatioExpertise): Plan30jWeek {
  const actions: Plan30jAction[] = [
    {
      id: "w4-action-1",
      label: `Mesurer l\'evolution de votre ratio ${expertise.label} sur les 30 derniers jours`,
      done: false,
    },
    {
      id: "w4-action-2",
      label: "Identifier 2 comportements a conserver definitivement",
      done: false,
    },
    {
      id: "w4-action-3",
      label: "Preparer le debrief NXT Coaching offert pour affiner la suite",
      done: false,
    },
  ];

  return {
    week_number: 4,
    focus: "Consolidation des acquis et preparation du debrief",
    actions,
    exercice: "Exercice NXT - Bilan personnel de progression",
  };
}

// Helpers

/** Extrait la premiere phrase d\'un texte multi-phrases pour affichage compact */
function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 200);
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
