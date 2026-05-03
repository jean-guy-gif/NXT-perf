/**
 * COACHING_PATTERNS — patterns issus de l'observation terrain
 * (PR3.8 follow-up #3 — cerveau du coach, fallback hardcoded).
 *
 * Source produit : « cerveau du coach » NXT (300+ debriefs et coachings
 * réels). Ce module ne contient AUCUN transcript brut, AUCUN cas réel
 * citable — uniquement des PATTERNS extraits, anonymisés et synthétisés.
 *
 * Politique d'usage :
 *   - Ne jamais afficher le contenu de ce module à un conseiller.
 *   - Servir uniquement à enrichir les questions et angles que le manager
 *     pose en coaching individuel.
 *   - Donner au manager l'impression que le système « a déjà vu ce cas
 *     100 fois » → questions calibrées, pas génériques.
 *
 * Forward-compat : si une vraie fonction de query (LLM/embeddings sur
 * transcripts) apparaît plus tard, `getCoachingPattern` côté `coach-brain`
 * sera réimplémentée pour appeler ce service ; les consommateurs (kit
 * coaching individuel) n'ont pas à changer.
 */

import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export interface CoachingPattern {
  /**
   * Comportements observés récurrents chez les conseillers en difficulté
   * sur ce levier. Grille de lecture pour le manager — pas une question
   * brute à poser au conseiller.
   */
  observedBehaviors: string[];
  /**
   * Erreurs récurrentes (anti-patterns). Permettent au manager de
   * débusquer le vrai blocage si le conseiller ne le verbalise pas.
   */
  recurringMistakes: string[];
  /**
   * Questions de signal — formulations précises que les coachs experts
   * utilisent pour faire surgir le frein réel. Calibrées par cas
   * fréquents observés. Plus actionnables que des "Comment tu te sens ?".
   */
  signalQuestions: string[];
  /**
   * Angles de coaching à proposer quand le conseiller est bloqué :
   * jeu de rôle, scripts, séquencements. Sert d'aide à la décision pour
   * la section E. (Décision manager).
   */
  coachingAngles: string[];
}

export const COACHING_PATTERNS: Record<ExpertiseRatioId, CoachingPattern> = {
  // ─── Contacts → Estimations ──────────────────────────────────────────
  contacts_estimations: {
    observedBehaviors: [
      "Le conseiller fait beaucoup d'appels mais peu d'engagement (pas de RDV calé en sortie).",
      "Il prospecte par à-coups (3 jours intenses, puis silence pendant 10 jours).",
      "Il évite la prospection à froid et compte trop sur les rebonds entrants.",
    ],
    recurringMistakes: [
      "Pitch flou — pas de demande claire d'estimation à la fin de l'échange.",
      "Pas de suivi des contacts tièdes (CRM rempli en début de mois, vide en fin).",
      "Aller voir le terrain sans support physique (carte, flyer, identité agence).",
    ],
    signalQuestions: [
      "Sur tes 10 derniers contacts, combien ont débouché sur une demande d'estimation ?",
      "Qu'est-ce que tu dis exactement à la fin d'un premier contact pour caler une estimation ?",
      "Quand tu sors de prospection terrain, tu reviens avec quoi de concret ?",
    ],
    coachingAngles: [
      "Travailler en jeu de rôle l'amorce + la demande engageante.",
      "Caler un rituel de prospection hebdomadaire (créneaux fixes, volumes cibles).",
      "Aligner les supports terrain (flyer, carte, pitch) sur une promesse claire.",
    ],
  },

  // ─── Estimations → Mandats ───────────────────────────────────────────
  estimations_mandats: {
    observedBehaviors: [
      "Le conseiller arrive en R2 sans mandat préparé — il propose au lieu de signer.",
      "Il évite la conversation sur l'exclusivité par peur du refus.",
      "Il reporte la signature à un 3ᵉ RDV qui n'a souvent pas lieu.",
    ],
    recurringMistakes: [
      "Présenter une fourchette de prix au lieu d'un prix unique justifié.",
      "Quitter le RDV sans demande engageante (« on en reparle »).",
      "Pas d'AVM ou comparables préparés avant le R2.",
    ],
    signalQuestions: [
      "Sur tes 3 derniers R2, qu'est-ce qui a empêché la signature ?",
      "Quand tu es face au vendeur, à quel moment précis tu sens que tu perds la main ?",
      "Qu'est-ce que tu fais quand le vendeur dit « je dois en parler avec ma femme » ?",
    ],
    coachingAngles: [
      "Travailler le séquencement R1/R2 en jeu de rôle.",
      "Cadrer la posture : signature comme conclusion logique, pas comme demande.",
      "Préparer un argumentaire écrit pour les 3 objections les plus fréquentes.",
    ],
  },

  // ─── % Exclusivité ───────────────────────────────────────────────────
  pct_exclusivite: {
    observedBehaviors: [
      "Le conseiller signe en simple par défaut, sans même proposer l'exclu.",
      "Il a peur de perdre le mandat s'il insiste sur l'exclusivité.",
      "Il ne valorise pas les services différenciants associés à l'exclu.",
    ],
    recurringMistakes: [
      "Pitch identique pour mandat simple et exclusif — aucune différenciation.",
      "Demander l'exclu sans avoir construit la confiance en R1.",
      "Céder à la première objection sans contre-argument structuré.",
    ],
    signalQuestions: [
      "Sur tes 5 derniers mandats, dans combien tu as VRAIMENT proposé l'exclusivité ?",
      "Qu'est-ce qui te fait reculer quand le vendeur hésite sur l'exclu ?",
      "Tu présentes les services exclu comment, concrètement ?",
    ],
    coachingAngles: [
      "Construire un argumentaire « valeur exclu » centré services et durée.",
      "Travailler en duo le franchissement de l'objection « j'ai d'autres agences ».",
      "Chiffrer le ROI vendeur de l'exclu (vs. multi-agence).",
    ],
  },

  // ─── Acheteurs → Tournée ─────────────────────────────────────────────
  acheteurs_tournee: {
    observedBehaviors: [
      "Le conseiller fait visiter à tout acheteur entrant, sans qualifier.",
      "Il enchaîne 1 visite = 1 acheteur sans logique de tournée.",
      "Il découvre le projet acheteur sur place, pas en agence avant.",
    ],
    recurringMistakes: [
      "Pas de RDV préalable en agence avec l'acheteur.",
      "Aucun mandat de recherche signé — relation à sens unique.",
      "Une visite à la fois, alors qu'une vraie sortie en cumulerait 3.",
    ],
    signalQuestions: [
      "Tu reçois l'acheteur en agence avant de le faire visiter, oui ou non ?",
      "Sur tes 5 derniers acheteurs visités, combien étaient vraiment qualifiés ?",
      "Qu'est-ce que tu sais du projet de l'acheteur AVANT de le mettre en voiture ?",
    ],
    coachingAngles: [
      "Imposer un process de découverte acheteur en agence avant toute visite.",
      "Former à la signature du mandat de recherche exclusif.",
      "Caler la règle « 3 biens minimum par sortie » et la pratiquer.",
    ],
  },

  // ─── Visites par acheteur ────────────────────────────────────────────
  visites_par_acheteur: {
    observedBehaviors: [
      "Le conseiller continue à visiter avec un acheteur indécis au-delà de 3 sorties.",
      "Il propose des biens trop similaires, sans logique de contraste.",
      "Il ne refait jamais la découverte client si rien ne ressort.",
    ],
    recurringMistakes: [
      "Pas de règle « repoussoir + ciblé + confort » dans la sortie.",
      "Aucun débrief structuré entre les visites.",
      "Continuer mécaniquement après 3 sorties infructueuses.",
    ],
    signalQuestions: [
      "Combien de sorties tu fais avec un même acheteur avant de remettre en cause sa recherche ?",
      "Tes biens proposés se ressemblent ou tu construis du contraste ?",
      "Qu'est-ce que tu fais quand après 3 sorties rien ne ressort ?",
    ],
    coachingAngles: [
      "Caler la règle des 3 biens par sortie (repoussoir + ciblé + confort).",
      "Limiter à 3 sorties max avec le même acheteur — formaliser.",
      "Reprendre la découverte client si rien ne ressort après 3 sorties.",
    ],
  },

  // ─── Visites → Offres ────────────────────────────────────────────────
  visites_offres: {
    observedBehaviors: [
      "Le conseiller fait visiter sans avoir vérifié l'intérêt réel en amont.",
      "Il sépare le client de l'agent pendant la visite.",
      "Il ne propose pas de se positionner immédiatement après la visite.",
    ],
    recurringMistakes: [
      "Envoyer la fiche au client pour qu'il « vienne directement » sur place.",
      "Aucun débrief immédiat post-visite — laisser refroidir.",
      "Pas de RDV agence ou brasserie cadré après les visites.",
    ],
    signalQuestions: [
      "Tu fais visiter avec ou sans avoir d'abord cadré le projet en agence ?",
      "Après la dernière visite, tu fais quoi exactement avec l'acheteur ?",
      "Pourquoi à ton avis, sur tes X visites, seulement Y offres ?",
    ],
    coachingAngles: [
      "Standardiser le RDV agence avant les visites.",
      "Imposer un débrief immédiat post-visite (agence ou brasserie).",
      "Caler la phrase de positionnement systématique en fin de tournée.",
    ],
  },

  // ─── Offres → Compromis ──────────────────────────────────────────────
  offres_compromis: {
    observedBehaviors: [
      "Le conseiller transmet l'offre acheteur sans la cadrer en amont.",
      "Il négocie au téléphone au lieu de provoquer un face-à-face vendeur.",
      "Il accepte la première contre-proposition sans relancer.",
    ],
    recurringMistakes: [
      "Présenter l'offre par téléphone ou WhatsApp.",
      "Pas de cheminement préparé pour le vendeur (dernière visite, retour acheteur).",
      "Pas d'argumentaire écrit pour défendre le montant proposé.",
    ],
    signalQuestions: [
      "Comment tu prépares l'acheteur sur le montant AVANT qu'il fasse l'offre ?",
      "La présentation de l'offre au vendeur, tu la fais comment ?",
      "Sur les offres qui n'ont pas signé, qu'est-ce qui a coincé ?",
    ],
    coachingAngles: [
      "Aiguiller le montant d'offre avec l'acheteur AVANT présentation.",
      "Imposer le face-à-face vendeur en négociation (jamais par téléphone).",
      "Préparer la négo comme un vrai RDV : agenda, support, scénarios.",
    ],
  },

  // ─── Compromis → Actes ───────────────────────────────────────────────
  compromis_actes: {
    observedBehaviors: [
      "Le conseiller laisse le dossier dormir entre compromis et acte.",
      "Il découvre les conditions suspensives non levées en fin de parcours.",
      "Il n'a pas vérifié le financement avant l'offre.",
    ],
    recurringMistakes: [
      "Pas de checklist commune des pièces dossier au moment de la découverte.",
      "Suivre uniquement « quand le notaire appelle ».",
      "Aucune relance proactive sur les conditions suspensives.",
    ],
    signalQuestions: [
      "Le financement de l'acheteur, tu l'as vérifié à quel moment ?",
      "Sur tes derniers compromis qui n'ont pas signé, qu'est-ce qui a sauté ?",
      "Tu suis comment la levée des conditions suspensives ?",
    ],
    coachingAngles: [
      "Imposer la vérification de financement avant l'offre.",
      "Mettre en place une checklist commune des pièces dossier.",
      "Suivre la levée des conditions suspensives chaque semaine.",
    ],
  },
};

/**
 * Retourne le pattern coaching pour un levier donné, ou `null` si absent.
 * Forward-compat : un futur appel à un service de query (LLM/embeddings)
 * pourrait remplacer cet accès direct sans changer l'API.
 */
export function getCoachingPattern(
  id: ExpertiseRatioId,
): CoachingPattern | null {
  return COACHING_PATTERNS[id] ?? null;
}
