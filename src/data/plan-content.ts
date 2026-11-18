import type { ExpertiseRatioId } from "@/data/ratio-expertise";

/**
 * Contenu du plan d'action 30 jours, écrit POUR le conseiller.
 *
 * Contenu validé par Jean-Guy le 18/11/2026, source : document d'expertise
 * + enseignements coaching. Ne pas reformuler sans validation.
 *
 * Chaque levier (estLevier) porte 3 semaines rédigées (s1 « Comprendre »,
 * s2 « Corriger », s3 « Appliquer ») ; la semaine 4 « Mesurer » est générée.
 * Pour chaque semaine : un `geste` (objectif comportemental de la semaine)
 * et des `actions` (cases à cocher).
 */

export interface PlanWeekContent {
  /** Geste de la semaine — affiché sous « Geste de la semaine ». */
  geste: string;
  /** Actions concrètes de la semaine (cases à cocher). */
  actions: string[];
}

export interface PlanLeverContent {
  s1: PlanWeekContent;
  s2: PlanWeekContent;
  s3: PlanWeekContent;
}

/** Les 6 leviers actionnables. La semaine 4 est générée, pas stockée ici. */
export const PLAN_CONTENT: Partial<Record<ExpertiseRatioId, PlanLeverContent>> = {
  contacts_estimations: {
    s1: {
      geste:
        "À chaque contact de la semaine, note s'il s'est terminé par une proposition de RDV d'estimation (oui / non).",
      actions: [
        "Est-ce que je termine mes échanges sans proposer clairement un RDV d'estimation ?",
        "Est-ce que mon discours est le même que celui de tous les agents du secteur ?",
        "Est-ce que mon discours, mon flyer et mes supports racontent la même chose ?",
        "Est-ce que je relance mes contacts, ou est-ce que je les perds après le premier échange ?",
      ],
    },
    s2: {
      geste: "100 % de tes contacts se terminent par une proposition de RDV.",
      actions: [
        "Écris ta phrase de transition vers l'estimation et entraîne-toi jusqu'à la dire sans réfléchir.",
        "Réécris ton accroche : commence par le projet du propriétaire, pas par son bien.",
        "Jeu de rôle : avec un collègue qui joue un prospect méfiant, va jusqu'au RDV d'estimation.",
      ],
    },
    s3: {
      geste: "Tes créneaux de prospection sont tenus à 100 %.",
      actions: [
        "Bloque des créneaux fixes de prospection dans ton agenda, courts et fréquents (par exemple 4 × 1 h par semaine).",
        "Prépare chaque session : liste de contacts, objectif de RDV, script sous les yeux.",
        "Relance chaque contact chaud et note une date de rappel dans ton CRM.",
      ],
    },
  },

  estimations_mandats: {
    s1: {
      geste:
        "Pour chaque estimation de la semaine, note si tu as demandé le mandat en fin de RDV (oui / non).",
      actions: [
        "Est-ce que je remets mon estimation sans avoir présenté mes services ni l'analyse comparative ?",
        "Est-ce que je repars sans avoir demandé la signature du mandat ?",
        "Est-ce que j'évite les objections sur le prix au lieu de les traiter ?",
        "Est-ce que j'arrive en R2 sans livrables préparés ?",
      ],
    },
    s2: {
      geste: "0 R2 sans préparation.",
      actions: [
        "Relance toutes tes estimations des 3 derniers mois qui n'ont pas abouti : chacune peut devenir un mandat.",
        "Prépare chaque R2 en 3 temps : présentation de tes services, analyse comparative de marché, puis estimation.",
        "Jeu de rôle : rejoue un R2 avec un collègue qui joue le vendeur, de la présentation des services à la signature du mandat, objections comprises.",
      ],
    },
    s3: {
      geste:
        "Chaque accord obtenu = mandat envoyé en signature électronique le jour même.",
      actions: [
        "Dès l'accord du vendeur, prépare le mandat et envoie-le en signature électronique dans la journée. Plus de « on verra plus tard ».",
        "Prépare tes réponses aux 3 objections prix que tu entends le plus (« un autre agent m'a annoncé plus », etc.).",
        "Enregistre ton prochain R2 avec Plaud et réécoute le moment où tu demandes le mandat.",
      ],
    },
  },

  pct_exclusivite: {
    s1: {
      geste:
        "Pour chaque mandat de la semaine, note à quel moment tu as parlé d'exclusivité (R1 / R2 / jamais).",
      actions: [
        "Est-ce que j'aborde l'exclusivité dès le premier rendez-vous ?",
        "Est-ce que je montre clairement ce que le vendeur gagne en exclusif par rapport au mandat simple ?",
        "Est-ce que je prospecte surtout des biens déjà en vente, où l'exclusivité est plus dure à obtenir ?",
        "Est-ce que je cède dès que le vendeur veut « garder plusieurs agences » ?",
      ],
    },
    s2: {
      geste: "100 % de tes RDV vendeurs abordent l'exclusivité.",
      actions: [
        "Construis ton tableau « mandat simple / mandat exclusif » : ce que le vendeur obtient en plus en exclusif.",
        "Prépare ta réponse à « je veux plusieurs agences », avec un exemple de vente que tu as réalisée.",
        "Jeu de rôle : défends l'exclusivité face à un collègue qui joue le vendeur qui veut garder plusieurs agences.",
      ],
    },
    s3: {
      geste:
        "Chaque mandat simple a un RDV de suivi planifié pour le passer en exclusif.",
      actions: [
        "Présente tes services directement dans le cadre de l'exclusivité : le mandat simple devient l'option de repli.",
        "Planifie un RDV de suivi avec chacun de tes vendeurs en mandat simple pour le passer en exclusif.",
        "Enregistre ton prochain R1 ou R2 avec Plaud et réécoute-le avec ton manager ou ton formateur : où as-tu lâché sur l'exclusivité ?",
      ],
    },
  },

  acheteurs_tournee: {
    s1: {
      geste:
        "Pour chaque nouvel acheteur, note si tu as fait une vraie découverte avant de lui faire visiter (oui / non).",
      actions: [
        "Est-ce que je fais visiter le bien demandé sans connaître le projet de l'acheteur ?",
        "Est-ce que je montre un seul bien par sortie ?",
        "Est-ce que je fais visiter par peur de perdre l'acheteur, même mal qualifié ?",
      ],
    },
    s2: {
      geste: "0 visite sans découverte.",
      actions: [
        "Reçois chaque nouvel acheteur à l'agence (ou en visio) pour une découverte avant toute visite : projet, délai, financement, critères.",
        "Prépare ta grille de découverte acheteur, aussi complète que ta découverte vendeur.",
        "Jeu de rôle : mène un entretien de découverte avec un collègue qui joue l'acheteur, et amène-le à signer un mandat de recherche.",
      ],
    },
    s3: {
      geste: "2 biens minimum par tournée.",
      actions: [
        "Propose un mandat de recherche exclusif à tes acheteurs sérieux.",
        "Organise tes visites en tournées de 2 à 3 biens.",
        "Fais un point chaque semaine avec chaque acheteur actif sur les biens vus.",
      ],
    },
  },

  visites_offres: {
    s1: {
      geste:
        "Pour chaque visite, note si l'acheteur s'est positionné (oui / non / à relancer).",
      actions: [
        "Est-ce que je fais visiter sans vraie découverte (projet, délai, financement, critères non négociables) ?",
        "Est-ce que j'envoie des fiches au lieu de sélectionner moi-même les biens ?",
        "Est-ce que je laisse partir l'acheteur sans débrief ni demande de positionnement ?",
        "Est-ce que je fais visiter sans connaître sa capacité d'achat validée par une simulation bancaire ?",
      ],
    },
    s2: {
      geste: "0 visite sans simulation bancaire.",
      actions: [
        "Avant chaque visite, vérifie la simulation bancaire de l'acheteur. Pas de simulation, pas de visite.",
        "Donne RDV à l'acheteur à l'agence et faites la tournée ensemble.",
        "Jeu de rôle : rejoue un retour de visite avec un collègue qui joue l'acheteur intéressé, et amène-le à se positionner tout de suite.",
      ],
    },
    s3: {
      geste: "100 % de tes visites suivies d'un débrief à chaud.",
      actions: [
        "Après chaque visite, fais un débrief à l'agence ou au café avec 3 questions : qu'est-ce qui vous a plu ? qu'est-ce qui vous retient ? on fait une offre ?",
        "Montre 2 à 3 biens par tournée, jamais un seul, pour permettre le choix par contraste.",
        "Relance sous 48 h chaque acheteur qui ne s'est pas positionné.",
      ],
    },
  },

  offres_compromis: {
    s1: {
      geste:
        "Pour chaque offre de la semaine, note comment elle a été présentée au vendeur (face-à-face / téléphone / mail).",
      actions: [
        "Est-ce que je transmets des offres trop basses sans les retravailler avec l'acheteur ?",
        "Est-ce que je négocie par téléphone au lieu du face-à-face ?",
        "Est-ce que les conditions de l'offre (financement, délais, conditions suspensives) sont claires avant que je la présente ?",
        "Est-ce que je relance l'acheteur quand son offre est refusée ?",
      ],
    },
    s2: {
      geste: "0 offre transmise sans préparation avec l'acheteur.",
      actions: [
        "Avant de transmettre une offre basse, retravaille-la avec l'acheteur : justification, marge de manœuvre, plafond.",
        "Vérifie le financement de chaque offre (simulation, accord de principe) avant de la présenter.",
        "Jeu de rôle : négocie une offre trop basse en face-à-face avec un collègue qui joue le vendeur, jusqu'à la faire remonter.",
      ],
    },
    s3: {
      geste: "100 % de tes offres présentées en face-à-face.",
      actions: [
        "Convoque le vendeur pour lui présenter l'offre en face-à-face : dernières visites, retours, positionnement de l'offre.",
        "Relance sous 48 h chaque acheteur dont l'offre est refusée, avec une nouvelle proposition.",
        "Suis chaque offre acceptée jusqu'au compromis : dates, pièces, financement.",
      ],
    },
  },
};
