/**
 * Team actions par levier — version manager des bonnes pratiques.
 *
 * Source : RATIO_EXPERTISE[*].bestPractices et TOP_PRACTICES (synthèse
 * conseiller). Ici on reformule en VOIX MANAGER : "Mettre en place /
 * Faire travailler / Suivre" — actions d'animation d'équipe.
 *
 * Règles rédactionnelles :
 *   - 3 bullets max par levier (cap dur côté coach-brain)
 *   - Formulation équipe à l'impératif (mettre en place, faire travailler,
 *     suivre, imposer, former)
 *   - Court (<= 1 ligne), actionnable par un manager
 *   - Pas de jargon, pas de théorie
 *
 * Ne PAS muter — source de vérité importée par coach-brain.ts uniquement.
 * Si une entrée manque, coach-brain bascule en fallback sur TOP_PRACTICES.
 */

import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export const TEAM_ACTIONS: Partial<Record<ExpertiseRatioId, string[]>> = {
  contacts_estimations: [
    "Définir un script de prospection commun et le faire pratiquer en équipe.",
    "Aligner les supports (flyer, carte, pitch) sur une identité agence cohérente.",
    "Suivre chaque semaine le nombre de contacts et de relances par conseiller.",
  ],

  estimations_mandats: [
    "Mettre en place un process commun R1 / R2 et le former en équipe.",
    "Faire travailler les objections en équipe (jeux de rôle bimensuels).",
    "Suivre les signatures chaque semaine et débriefer les R2 perdus.",
  ],

  pct_exclusivite: [
    "Convaincre l'équipe de la valeur de l'exclusivité (vendre les services associés).",
    "Travailler ensemble la différenciation mandat simple vs exclusif en jeu de rôle.",
    "Suivre le taux d'exclusivité hebdomadaire et célébrer chaque exclu signée.",
  ],

  acheteurs_tournee: [
    "Imposer un process de découverte acheteur avant toute visite.",
    "Former l'équipe au mandat de recherche exclusif.",
    "Suivre le ratio acheteurs reçus / tournées par conseiller.",
  ],

  visites_par_acheteur: [
    "Caler la règle des 3 biens par sortie (repoussoir + ciblé + confort).",
    "Limiter à 3 sorties max avec un même acheteur — formaliser cette règle.",
    "Réviser la découverte client en équipe si rien ne ressort après 3 sorties.",
  ],

  visites_offres: [
    "Standardiser le RDV agence avant les visites pour toute l'équipe.",
    "Imposer le débrief immédiat post-visite (agence ou brasserie).",
    "Suivre le taux d'offres / visites hebdomadaire en point d'équipe.",
  ],

  offres_compromis: [
    "Former l'équipe à aiguiller le montant d'offre AVANT la présentation au vendeur.",
    "Imposer le face-à-face vendeur en négociation (jamais par téléphone).",
    "Suivre les négociations en cours en point d'équipe hebdomadaire.",
  ],

  compromis_actes: [
    "Imposer la vérification de financement avant l'offre dans toute l'équipe.",
    "Mettre en place une checklist commune des pièces dossier client.",
    "Suivre la levée des conditions suspensives chaque semaine en équipe.",
  ],
};
