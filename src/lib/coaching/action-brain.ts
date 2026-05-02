/**
 * Action-brain — contenu pédagogique GRANULAIRE par action de plan 30j.
 *
 * Problème résolu : avant, chaque action ouvrait la MÊME fiche
 * (buildResourceFromExpertise(expertiseId)) → 12 clics, 12 fois la même
 * fiche, perte d'attention.
 *
 * Désormais, chaque clic "Pourquoi cette action ?" donne une réponse
 * différente, calibrée sur l'action précise.
 *
 * Schéma `ActionContent` :
 *   - title       : titre court de l'action
 *   - why         : 1-2 phrases — pourquoi cette action existe dans le plan
 *   - bestPractices : 3 bullets max — comment la réussir
 *   - concreteStep : 1 phrase — première action concrète à faire
 *   - mistake     : 1 phrase — l'erreur à éviter
 *
 * Clé `ActionBrainKey` = `${ExpertiseRatioId}:${actionId}` ou `:${actionId}`
 *   - Le préfixé `${expertiseId}:` est consulté en premier (spécifique levier)
 *   - Le `:${actionId}` (sans levier) sert de fallback générique pour les
 *     actions identiques d'un plan à l'autre (ex: w3-action-2 "Documenter…")
 *   - Si rien ne matche → null, le caller (drawer) revient à la fiche legacy
 *
 * Note : en V1, on couvre 8 entries (4 spécifiques sur 2 leviers fréquents +
 * 4 génériques). Le périmètre s'enrichira itérativement quand on observera
 * lesquelles sont les plus consultées.
 */

import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { getTopPractices } from "@/lib/coaching/coach-brain";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export interface ActionContent {
  title: string;
  why: string;
  bestPractices: string[];
  concreteStep: string;
  mistake: string;
}

// ─── ACTION_BRAIN — entries V1 ────────────────────────────────────────────

export const ACTION_BRAIN: Record<string, ActionContent> = {
  // ── estimations_mandats : 3 entries spécifiques ─────────────────────────

  "estimations_mandats:w1-action-1": {
    title: "Identifier les 3 derniers cas où ça a coincé",
    why: "On ne corrige pas en aveugle. Repérer concrètement les 3 dernières estimations qui n'ont pas signé permet d'identifier le pattern bloquant — pas un ressenti, des faits.",
    bestPractices: [
      "Reprendre le CRM ou le carnet de RDV des 4 dernières semaines.",
      "Pour chaque cas perdu : noter en 1 ligne le moment exact où ça a basculé.",
      "Chercher le facteur commun (prix, services pas présentés, R2 reporté, etc.).",
    ],
    concreteStep:
      "Bloquer 30 minutes calmes pour relire les 3 derniers RDV estimation non signés.",
    mistake:
      "Faire une analyse intellectuelle sans relire les vrais cas terrain.",
  },

  "estimations_mandats:w1-action-2": {
    title: "Relancer toutes les estimations non transformées",
    why: "Une estimation non signée n'est pas un mandat perdu — c'est un mandat en attente. La majorité signe sur la 2e ou 3e relance avec un argument neuf.",
    bestPractices: [
      "Lister toutes les estimations des 60 derniers jours sans suite.",
      "Préparer un angle de relance neuf pour chacune (comparable récent, évolution du marché).",
      "Appeler en proposant un R2 court (15 min) — pas une simple prise de news.",
    ],
    concreteStep:
      "Relancer 5 estimations non transformées cette semaine avec un angle neuf.",
    mistake:
      "Relancer en disant simplement \"je voulais prendre des nouvelles\" — sans valeur ajoutée.",
  },

  "estimations_mandats:w2-action-1": {
    title: "Process R1/R2 hyper rodé",
    why: "Les meilleurs ne signent pas par hasard. Ils ont un process R1 → R2 millimétré : services, analyse comparative, estimation, objections, signature électronique dans la foulée.",
    bestPractices: [
      "R2 démarre par la présentation des services (15 min) avant l'estimation.",
      "Analyse comparative de marché présentée avec preuves (ventes récentes du secteur).",
      "Une fois l'accord verbal : signature électronique sur place ou dans la journée.",
    ],
    concreteStep:
      "Préparer un kit R2 standard (slides services + 5 comparables récents).",
    mistake:
      "Annoncer le prix avant d'avoir présenté les services — le client ne voit que le chiffre.",
  },

  // ── contacts_estimations : 1 entry spécifique ───────────────────────────

  "contacts_estimations:w1-action-1": {
    title: "Identifier où ça décroche en prospection",
    why: "Trop de contacts pour 1 estimation veut souvent dire : mauvaise source, discours générique, ou outil de prospection qui ne convertit plus.",
    bestPractices: [
      "Compter les contacts par source (terrain, téléphone, digital) sur 30 jours.",
      "Identifier la source avec le pire taux de conversion → c'est elle qu'on travaille en premier.",
      "Vérifier si le discours utilisé est rodé ou improvisé.",
    ],
    concreteStep:
      "Sortir le tableau des sources de contacts et identifier le maillon le plus faible.",
    mistake:
      "Augmenter le volume de contacts sans corriger la source qui dilue.",
  },

  // ── Génériques (s'appliquent à tout levier) ─────────────────────────────

  ":w1-action-3": {
    title: "Journal de bord : noter chaque situation",
    why: "Sans tracking, on oublie 80% des cas dans la semaine. Le journal force l'attention et nourrit le debrief de fin de plan.",
    bestPractices: [
      "Noter chaque situation rencontrée le jour même (pas le lendemain).",
      "Format court : situation + ce qui a marché + ce qui a coincé (3 lignes max).",
      "Relire le journal le vendredi soir avant la saisie hebdo.",
    ],
    concreteStep:
      "Ouvrir une note dédiée et y déposer la 1ʳᵉ situation aujourd'hui.",
    mistake:
      "Vouloir tout détailler — résultat : on arrête au bout de 2 jours.",
  },

  ":w2-action-2": {
    title: "Préparer 3 situations cette semaine",
    why: "Adopter une nouvelle méthode demande de la répéter — pas de la lire. 3 situations préparées = 3 occasions concrètes de l'appliquer.",
    bestPractices: [
      "Choisir 3 RDV ou 3 contacts sur l'agenda où la nouvelle méthode est applicable.",
      "Préparer le déroulé pour chacun (qui, quoi, quel argument testé).",
      "Briefer un collègue sur ce qu'on va tester pour pouvoir débriefer après.",
    ],
    concreteStep:
      "Bloquer 20 minutes aujourd'hui pour identifier les 3 situations de la semaine.",
    mistake:
      "Attendre que ça tombe \"naturellement\" — la pratique ne se déclenche pas seule.",
  },

  ":w2-action-3": {
    title: "Demander un retour après chaque tentative",
    why: "Un retour rapide d'un collègue ou du manager corrige le tir avant que le mauvais réflexe s'installe. Pas de feedback = pas d'apprentissage.",
    bestPractices: [
      "Choisir UN regard de confiance (collègue senior ou manager).",
      "Demander un retour court juste après la tentative — pas 2 jours plus tard.",
      "Cibler la question (ex: \"comment j'ai présenté l'estimation ?\") plutôt que \"c'était bien ?\".",
    ],
    concreteStep:
      "Identifier la personne à qui demander un retour et la prévenir aujourd'hui.",
    mistake:
      "Demander un retour vague — on récolte un \"c'était bien\" inutile.",
  },

  ":w4-action-3": {
    title: "Préparer le debrief NXT Coaching",
    why: "Le debrief de fin de plan est offert UNE fois. Le préparer = sortir 3× plus de valeur du RDV (ROI calibré, plan suivant ciblé).",
    bestPractices: [
      "Lister les 3 situations qui ont le plus marché pendant les 30 jours.",
      "Lister les 2 qui ont le moins fonctionné — c'est sur celles-là qu'on creuse.",
      "Arriver au RDV avec une question précise, pas \"qu'est-ce que tu en penses ?\".",
    ],
    concreteStep:
      "Bloquer 15 minutes en fin de semaine pour préparer le débrief.",
    mistake:
      "Arriver les mains vides au RDV — le coach doit deviner ce qui s'est passé.",
  },
};

// ─── API publique ─────────────────────────────────────────────────────────

/**
 * Retourne le contenu pédagogique d'une action.
 *
 * Lookup hiérarchique :
 *   1. ACTION_BRAIN[`${expertiseId}:${actionId}`]  spécifique levier
 *   2. ACTION_BRAIN[`:${actionId}`]                générique par actionId
 *   3. Si fallbackExpertiseId fourni → contenu dérivé du coach-brain
 *      (les 3 bullets levier + firstAction) — backward compat avec l'ancienne
 *      fiche unique. Permet de garantir qu'on ne casse jamais le rendu si
 *      une action n'a pas encore d'entry dédiée.
 *   4. null
 */
export function getActionContent(
  actionId: string | null | undefined,
  fallbackExpertiseId?: ExpertiseRatioId | null
): ActionContent | null {
  if (!actionId) {
    return fallbackExpertiseId
      ? buildFallbackFromExpertise(fallbackExpertiseId)
      : null;
  }

  // 1. Spécifique levier × action
  if (fallbackExpertiseId) {
    const specific = ACTION_BRAIN[`${fallbackExpertiseId}:${actionId}`];
    if (specific) return specific;
  }

  // 2. Générique par actionId
  const generic = ACTION_BRAIN[`:${actionId}`];
  if (generic) return generic;

  // 3. Fallback sur le coach-brain (3 bullets levier + firstAction)
  if (fallbackExpertiseId) {
    return buildFallbackFromExpertise(fallbackExpertiseId);
  }

  return null;
}

function buildFallbackFromExpertise(
  expertiseId: ExpertiseRatioId
): ActionContent | null {
  const expertise = RATIO_EXPERTISE[expertiseId];
  if (!expertise) return null;

  return {
    title: expertise.label,
    why: expertise.diagnosis,
    bestPractices: getTopPractices(expertiseId, 3),
    concreteStep: expertise.firstAction,
    mistake: expertise.commonCauses[0] ?? "",
  };
}
