import type { DPIAxisScore } from "@/lib/dpi-scoring";

/** Identifiants stables des 6 axes DPI (alignés sur dpi-scoring.ts). */
export type DpiAxisId =
  | "intensite_commerciale"
  | "generation_opportunites"
  | "solidite_portefeuille"
  | "maitrise_ratios"
  | "valorisation_economique"
  | "pilotage_strategique";

export type NxtTool = "NXT Data" | "NXT Training" | "NXT Profiling" | "NXT Finance";

export interface RecommendedTool {
  name: NxtTool;
  reason: string;
}

export interface CoachingContent {
  /** 2-3 phrases sur le profil quand l'axe est faible. */
  profileInterpretation: string;
  /** 3 accroches courtes (15-20 mots) actionnables. */
  approachTips: [string, string, string];
  /** 1-2 outils max, chacun avec 1 phrase de justif. */
  recommendedTools: RecommendedTool[];
  /** 1-2 phrases avec chiffre concret. */
  projection6Months: string;
}

/**
 * Contenu coaching recrutement par axe DPI faible (PR2j).
 * Ton "professionnel chaleureux + directif terrain" — coach commercial expérimenté
 * qui parle à un directeur d'agence. Concret et orienté action.
 *
 * Mapping outils NXT (Q7 PR2j) :
 * - intensite_commerciale     → NXT Training
 * - generation_opportunites   → NXT Profiling + NXT Training
 * - solidite_portefeuille     → NXT Profiling
 * - maitrise_ratios           → NXT Data
 * - valorisation_economique   → NXT Finance
 * - pilotage_strategique      → NXT Data + NXT Finance
 */
export const COACHING_BY_AXIS: Record<DpiAxisId, CoachingContent> = {
  intensite_commerciale: {
    profileInterpretation:
      "Profil prudent côté prospection — le candidat n'ose pas encore décrocher son téléphone assez souvent. Pas un manque d'envie, un manque de méthode. Avec un cadre clair et une cadence imposée, ce levier débloque vite.",
    approachTips: [
      "Vendez la cadence : 5 contacts/jour minimum, pas la peine d'avoir le pitch parfait.",
      "Montrez votre tableau d'équipe — la pression positive du collectif fait son travail.",
      "Promettez un coaching d'attaque sur les 30 premiers jours, pas un onboarding mou.",
    ],
    recommendedTools: [
      {
        name: "NXT Training",
        reason:
          "Drills quotidiens d'appels (objections, prise de RDV) pour installer la cadence sans douleur.",
      },
    ],
    projection6Months:
      "Avec 5 contacts/jour tenus 6 mois, son score peut passer de 4/10 à 7/10 — soit +30 % de RDV estimation déclenchés.",
  },
  generation_opportunites: {
    profileInterpretation:
      "Le candidat est en contact mais ne convertit pas en estimation. Souvent un problème de pitch et de ciblage : il parle à tout le monde de la même manière. À recadrer dès l'arrivée : qualifier puis personnaliser.",
    approachTips: [
      "Mettez la barre haute sur le ciblage : on veut des estimations qualifiées, pas du volume.",
      "Promettez un atelier pitch dans les 15 jours — c'est ce qui change tout sur ce profil.",
      "Donnez-lui 3 personas à connaître par cœur avant son premier RDV terrain.",
    ],
    recommendedTools: [
      {
        name: "NXT Profiling",
        reason:
          "Qualification automatique des prospects pour cibler les bons et personnaliser l'approche.",
      },
      {
        name: "NXT Training",
        reason: "Atelier pitch d'estimation avec scénarios réels et feedback immédiat.",
      },
    ],
    projection6Months:
      "Taux de transformation contact→estimation peut doubler en 6 mois (passage de 12 % à 25 %), avec à la clé +40 % de mandats signés.",
  },
  solidite_portefeuille: {
    profileInterpretation:
      "Le candidat ramène des mandats mais peu d'exclusifs et un stock fragile. C'est un signal de méthode de signature : il ne pose pas le cadre exclusif au bon moment. Ça se travaille en quelques séances.",
    approachTips: [
      "Annoncez tout de suite : ici on signe en exclusif, ce n'est pas négociable.",
      "Mettez l'accent sur la qualification vendeur avant signature, pas après.",
      "Promettez un coaching exclusif/simple avec scripts rodés terrain.",
    ],
    recommendedTools: [
      {
        name: "NXT Profiling",
        reason:
          "Diagnostic vendeur avant signature — pour viser les bons mandats et les conclure en exclusif.",
      },
    ],
    projection6Months:
      "Part d'exclusifs peut passer de 30 % à 60 % en 6 mois, avec un stock de mandats actifs qui double.",
  },
  maitrise_ratios: {
    profileInterpretation:
      "Le candidat travaille à l'instinct sans lire ses ratios. Pas un mauvais profil — un profil non équipé. Avec un cockpit clair et 10 minutes de lecture par semaine, il prend du recul et ajuste.",
    approachTips: [
      "Vendez la transparence : ici, chaque conseiller voit ses ratios en temps réel.",
      "Promettez un debrief mensuel chiffres en main — pas du feeling.",
      "Montrez-lui votre dashboard NXT, c'est l'argument qui fait basculer ce profil.",
    ],
    recommendedTools: [
      {
        name: "NXT Data",
        reason:
          "Cockpit personnel des 7 ratios clés — il voit ses gaps en un coup d'œil et corrige sans attendre.",
      },
    ],
    projection6Months:
      "Avec une lecture hebdo de ses ratios, il rattrape son retard sur 2-3 KPI majeurs en 6 mois (+25 % de production).",
  },
  valorisation_economique: {
    profileInterpretation:
      "Le candidat signe mais à des prix bas — il accepte trop facilement les baisses. Symptôme d'un manque de confiance dans l'estimation initiale. Ça se corrige avec des outils chiffrés et un cadre clair.",
    approachTips: [
      "Annoncez la couleur : on défend nos estimations, on ne brade pas.",
      "Promettez un appui chiffré (data marché, ventes comparables) sur chaque mandat.",
      "Donnez-lui un objectif clair de CA moyen par acte dès le mois 1.",
    ],
    recommendedTools: [
      {
        name: "NXT Finance",
        reason:
          "Pilotage de la marge et du CA par acte — il voit l'impact direct de ses décisions de prix sur la rentabilité.",
      },
    ],
    projection6Months:
      "CA moyen par acte peut grimper de 8 000 € à 11 000 € en 6 mois — soit +35 % de revenus à volume égal.",
  },
  pilotage_strategique: {
    profileInterpretation:
      "Le candidat exécute sans plan — il avance au coup par coup. Pas un manque de motivation, un manque de cap. Avec des objectifs personnalisés et un cockpit, il prend la dimension du métier.",
    approachTips: [
      "Promettez un plan 30 jours dès l'arrivée — il a besoin de rails clairs.",
      "Vendez la projection : ici on parle objectifs annuels, pas que mois courant.",
      "Montrez-lui votre pilotage financier d'agence — ça lui donnera envie d'y contribuer.",
    ],
    recommendedTools: [
      {
        name: "NXT Data",
        reason:
          "Vision GPS — objectifs personnalisés par catégorie (Junior/Confirmé/Expert) et suivi mensuel.",
      },
      {
        name: "NXT Finance",
        reason: "Cockpit dirigeant pour comprendre l'impact de sa production sur le résultat agence.",
      },
    ],
    projection6Months:
      "Score pilotage peut passer de 3/10 à 7/10 en 6 mois — il devient un conseiller autonome qui pilote sa progression.",
  },
};

/**
 * Retourne l'axe DPI le plus faible parmi un tableau de scores.
 * En cas d'égalité, retourne le premier rencontré (ordre de la liste).
 */
export function getWeakestAxis(axes: DPIAxisScore[]): DPIAxisScore | null {
  if (axes.length === 0) return null;
  let weakest = axes[0];
  for (const axis of axes) {
    if (axis.score < weakest.score) weakest = axis;
  }
  return weakest;
}
