/**
 * Top pratiques par levier — synthèse terrain.
 *
 * Source : RATIO_EXPERTISE[*].bestPractices (paragraphes narratifs longs)
 * synthétisés en 3 bullets actionnables max par levier.
 *
 * Règles rédactionnelles :
 *   - 3 bullets max par levier (cap dur côté coach-brain)
 *   - Formulation terrain, à l'impératif quand possible, courte (<= 1 ligne)
 *   - Pas de théorie, pas de "on doit", pas de jargon
 *   - Si une synthèse est ambiguë → mieux vaut omettre que dénaturer
 *     (le coach-brain fait fallback automatique sur bestPractices narratif)
 *
 * Ne PAS muter — source de vérité importée par coach-brain.ts uniquement.
 */

import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export const TOP_PRACTICES: Partial<Record<ExpertiseRatioId, string[]>> = {
  contacts_estimations: [
    "Avoir un discours rodé : préparer chaque sortie de prospection (terrain, téléphone, digital) comme un vrai RDV.",
    "Aligner discours, supports et outils : flyer, carte de visite, script — tout cohérent, rien de générique.",
    "Relancer régulièrement les contacts pour alimenter la base : un même prospect finit par demander une estimation.",
  ],

  estimations_mandats: [
    "Process R1 / R2 hyper rodé : présentation des services, analyse comparative de marché, puis l'estimation.",
    "Répondre aux objections en visant la signature dès l'accord — ne jamais reporter la \"vente à plus tard\".",
    "Profiter de la signature électronique pour préparer le mandat à l'agence et l'envoyer signer dans la foulée.",
  ],

  pct_exclusivite: [
    "Présenter les services dans le cadre d'une exclusivité — tu en es convaincu·e, tu le défends.",
    "Différencier clairement mandat simple vs mandat exclusif (beaucoup plus de services en exclu).",
    "Aller chercher l'exclusivité : se battre pour elle, c'est la meilleure option pour le client.",
  ],

  acheteurs_tournee: [
    "Filtrer les clients : recevoir, faire une vraie découverte, comprendre le projet avant de visiter.",
    "Signer un mandat de recherche exclusif pour n'engager du temps qu'avec des clients qui te font confiance.",
    "Faire visiter plusieurs biens par sortie une fois la confiance installée et la recherche ciblée.",
  ],

  visites_par_acheteur: [
    "3 biens par sortie : 1 repoussoir, 1 ciblé, 1 de confort (+10 % de budget) — laisse choisir par contraste.",
    "3 sorties de visite max avec le même acheteur — soit 8 à 9 biens au total, pas plus.",
    "Si rien ne ressort après 3 sorties : revoir la découverte, pas continuer en boucle.",
  ],

  visites_offres: [
    "Aucune fiche envoyée au client : si le bien est sélectionné, c'est qu'il peut intéresser — sinon, pas de visite.",
    "RDV à l'agence avant les visites : tu es ensemble tout le long, pas séparé·es sur le terrain.",
    "Débrief immédiat après les visites (agence ou brasserie) — proposer de se positionner tout de suite si intérêt.",
  ],

  offres_compromis: [
    "Aiguiller l'acheteur sur le montant de l'offre AVANT la présentation au vendeur — ne pas la transmettre trop basse.",
    "Convoquer le vendeur en face-to-face pour expliquer le cheminement (dernière visite, retour, positionnement).",
    "Préparer la négociation comme un vrai RDV : pas de négociation par téléphone, jamais.",
  ],

  compromis_actes: [
    "Vérifier le financement avant même de faire l'offre — pas après.",
    "Avoir l'intégralité des pièces dossier dès la découverte client : il se positionne en toute connaissance.",
    "Suivre le client de la signature du compromis à la levée des conditions suspensives — pas de relâche.",
  ],
};
