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
 * douleur du conseiller, avec un contenu tiré du doc d'expertise et un
 * objectif chiffré propre au levier sur chaque semaine.
 *
 * Structure narrative (4 semaines), spécifique au levier :
 *   S1 — Comprendre : le diagnostic + les causes fréquentes à vérifier.
 *   S2 — Corriger : première action + 1re bonne pratique + jeu de rôle.
 *   S3 — Appliquer : le reste des bonnes pratiques en 2-3 actions concrètes.
 *   S4 — Mesurer : refaire sa saisie, comparer son ratio, ancrer 2 habitudes.
 *
 * Tous les textes sont au tutoiement, avec de vrais accents, sans aucune
 * mention de coaching commercial ni de « Exercice NXT ».
 */
export function generatePlan30j(painPoint: PainPointResult): GeneratedPlan30j {
  const expertise = painPoint.expertise;

  const weeks: Plan30jWeek[] = [
    buildWeek1Comprendre(painPoint),
    buildWeek2Corriger(painPoint),
    buildWeek3Appliquer(painPoint),
    buildWeek4Mesurer(painPoint),
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

// ─── Objectif chiffré par levier ────────────────────────────────────────────

interface LevierObjectif {
  /** Volume d'entrée du ratio, au pluriel (ex. « visites »). */
  input: string;
  /** Genre de l'entrée, pour l'accord « prochains / prochaines ». */
  inputGender: "m" | "f";
  /** Sortie visée, au singulier (ex. « offre »). */
  output: string;
}

/** Entrée / sortie de chaque levier « X pour 1 Y » (pct_exclusivite à part). */
const LEVIER_OBJECTIF: Partial<Record<ExpertiseRatioId, LevierObjectif>> = {
  contacts_estimations: { input: "contacts", inputGender: "m", output: "estimation" },
  estimations_mandats: { input: "estimations", inputGender: "f", output: "mandat" },
  acheteurs_tournee: { input: "acheteurs", inputGender: "m", output: "sortie en visite" },
  visites_offres: { input: "visites", inputGender: "f", output: "offre" },
  offres_compromis: { input: "offres", inputGender: "f", output: "compromis" },
};

/** Jeu de rôle d'une phrase, propre à la situation de chaque levier. */
const JEU_DE_ROLE: Partial<Record<ExpertiseRatioId, string>> = {
  contacts_estimations:
    "Jeu de rôle : avec un collègue qui joue un prospect méfiant, déroule ton accroche de prospection jusqu'à décrocher un rendez-vous d'estimation.",
  estimations_mandats:
    "Jeu de rôle : rejoue un R2 avec un collègue qui joue le vendeur, de la présentation des services à la signature du mandat, objections comprises.",
  pct_exclusivite:
    "Jeu de rôle : défends l'exclusivité face à un collègue qui joue le vendeur qui veut garder plusieurs agences.",
  acheteurs_tournee:
    "Jeu de rôle : mène un entretien de découverte avec un collègue qui joue l'acheteur, et amène-le à signer un mandat de recherche.",
  visites_offres:
    "Jeu de rôle : rejoue un retour de visite avec un collègue qui joue l'acheteur intéressé, et amène-le à se positionner tout de suite.",
  offres_compromis:
    "Jeu de rôle : négocie une offre trop basse en face-à-face avec un collègue qui joue le vendeur, jusqu'à la faire remonter.",
};

/** Formate un nombre : entier tel quel, sinon une décimale avec virgule FR. */
function fmtNombre(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

/** Phrase d'objectif chiffré de la semaine, tirée du point de douleur. */
function objectifChiffre(painPoint: PainPointResult): string {
  const cur = fmtNombre(painPoint.currentValue);
  const target = fmtNombre(painPoint.targetValue);

  if (painPoint.expertiseId === "pct_exclusivite") {
    return `Cible : passer de ${cur}% à ${target}% de mandats exclusifs. Cette semaine, sur tes prochains mandats, vise au moins ${target}% en exclusivité.`;
  }

  const o = LEVIER_OBJECTIF[painPoint.expertiseId];
  if (!o) {
    // Repli (ratio hors des 6 leviers, via le chemin legacy par aire).
    return `Cible : rapprocher ton ratio ${painPoint.expertise.label} de ${target}.`;
  }
  const prochains = o.inputGender === "f" ? "prochaines" : "prochains";
  return `Cible : passer de ${cur} ${o.input} pour 1 ${o.output} à ${target}. Cette semaine, sur tes ${target} ${prochains} ${o.input}, vise 1 ${o.output}.`;
}

/** Découpe un texte en phrases (sur . ! ?), nettoyées et non vides. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Semaine 1 — Comprendre ──────────────────────────────────────────────────

function buildWeek1Comprendre(painPoint: PainPointResult): Plan30jWeek {
  const e = painPoint.expertise;
  const actions: Plan30jAction[] = [
    {
      id: "w1-action-1",
      label: `Relis ce constat et repère où tu te reconnais : ${e.diagnosis}`,
      done: false,
    },
    ...e.commonCauses.map((cause, i) => ({
      id: `w1-cause-${i + 1}`,
      label: `${cause} → Est-ce que je fais ça ? Vérifie-le sur tes 3 derniers dossiers concernés.`,
      done: false,
    })),
  ];

  return {
    week_number: 1,
    focus: `Comprendre ce qui coince sur ${e.label}`,
    actions,
    exercice: objectifChiffre(painPoint),
  };
}

// ─── Semaine 2 — Corriger ────────────────────────────────────────────────────

function buildWeek2Corriger(painPoint: PainPointResult): Plan30jWeek {
  const e = painPoint.expertise;
  const firstBestPractice = splitSentences(e.bestPractices)[0] ?? e.bestPractices;

  const actions: Plan30jAction[] = [
    {
      id: "w2-action-1",
      label: `Première action : ${e.firstAction}`,
      done: false,
    },
    {
      id: "w2-action-2",
      label: `Inspire-toi des meilleurs : ${firstBestPractice}`,
      done: false,
    },
    {
      id: "w2-action-3",
      label:
        JEU_DE_ROLE[painPoint.expertiseId] ??
        `Jeu de rôle : rejoue une situation de ${e.label} avec un collègue.`,
      done: false,
    },
  ];

  return {
    week_number: 2,
    focus: `Corriger tes premiers gestes sur ${e.label}`,
    actions,
    exercice: objectifChiffre(painPoint),
  };
}

// ─── Semaine 3 — Appliquer ───────────────────────────────────────────────────

function buildWeek3Appliquer(painPoint: PainPointResult): Plan30jWeek {
  const e = painPoint.expertise;
  // Le reste des bonnes pratiques (la 1re phrase est déjà vue en S2), découpé
  // en 2 ou 3 actions concrètes propres au levier.
  const reste = splitSentences(e.bestPractices).slice(1).slice(0, 3);

  const actions: Plan30jAction[] = reste.map((phrase, i) => ({
    id: `w3-action-${i + 1}`,
    label: `Mets en pratique : ${phrase}`,
    done: false,
  }));

  if (actions.length === 0) {
    // Repli si les bonnes pratiques tiennent en une seule phrase.
    actions.push({
      id: "w3-action-1",
      label: `Applique la méthode des meilleurs sur tes dossiers réels : ${e.bestPractices}`,
      done: false,
    });
  }

  return {
    week_number: 3,
    focus: "Appliquer sur le terrain",
    actions,
    exercice: objectifChiffre(painPoint),
  };
}

// ─── Semaine 4 — Mesurer ─────────────────────────────────────────────────────

function buildWeek4Mesurer(painPoint: PainPointResult): Plan30jWeek {
  const e = painPoint.expertise;
  const cur = fmtNombre(painPoint.currentValue);
  const target = fmtNombre(painPoint.targetValue);

  const actions: Plan30jAction[] = [
    {
      id: "w4-action-1",
      label: `Fais ta saisie et compare ton ratio ${e.label} sur ton tableau de bord : tu étais à ${cur}, cible ${target}.`,
      done: false,
    },
    {
      id: "w4-action-2",
      label: "Choisis les 2 habitudes que tu gardes définitivement.",
      done: false,
    },
  ];

  return {
    week_number: 4,
    focus: "Mesurer et ancrer tes acquis",
    actions,
    exercice: objectifChiffre(painPoint),
  };
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
