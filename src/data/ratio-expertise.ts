/**
 * Matière experte sur les 8 ratios de transformation NXT Performance
 *
 * Source : doc d'expertise Jean-Guy (17/04/2026)
 * Cette matière alimente :
 *   - Le détecteur de plus grosse douleur (pain-point-detector.ts)
 *   - Le contenu des plans 30j focalisés (plan-30-jours.ts)
 *   - Les projections de gain CA affichées dans le DPI et le dashboard
 *
 * Éditeur unique : Jean-Guy. Évolutions = PR Git (pas d'UI admin).
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type ExpertiseRatioId =
  | "contacts_estimations"
  | "estimations_mandats"
  | "pct_exclusivite"
  | "acheteurs_tournee"
  | "visites_par_acheteur"
  | "visites_offres"
  | "offres_compromis"
  | "compromis_actes";

export type RatioDirection = "less_is_better" | "more_is_better";

export type ProfileLevel = "junior" | "confirme" | "expert";

/**
 * Type d'impact CA d'un ratio, dicte la formule d'estimation du gain potentiel.
 * - `direct_cascade` : gain multiplicateur sur toute la chaîne (contacts, estim)
 * - `direct_strong` : gain direct sur la conversion (mandats, visites→offres)
 * - `leverage_high` : effet de levier exceptionnel (exclusivité)
 * - `security` : sécurise du CA déjà engagé (compromis→actes)
 * - `indirect` : lien avec le CA moins direct (acheteurs→tournée, visites/acheteur)
 */
export type CaImpactType =
  | "direct_cascade"
  | "direct_strong"
  | "leverage_high"
  | "security"
  | "indirect";

export interface RatioExpertise {
  id: ExpertiseRatioId;
  label: string;
  formula: string;
  direction: RatioDirection;

  /** Seuils de référence par profil (source : doc expertise) */
  thresholds: Record<ProfileLevel, number>;

  /** Poids dans le calcul de la douleur (calibration Jean-Guy) */
  leverageWeight: number;

  /** Q1 — Ce que ça veut dire vraiment quand le ratio est dégradé */
  diagnosis: string;

  /** Q2 — Les 2-3 causes les plus fréquentes sur le terrain */
  commonCauses: string[];

  /** Q3 — Ce que les meilleurs font différemment */
  bestPractices: string;

  /** Q4 — La première action concrète pour corriger */
  firstAction: string;

  /** Type d'impact CA (détermine la formule d'estimation en €) */
  caImpactType: CaImpactType;

  /** Note calibration CA spécifique au ratio (source : section Projection de gain CA) */
  caImpactNote?: string;

  /** Délai d'impact attendu en jours (section E du doc : ~92j moyenne mandat) */
  expectedImpactDelayDays: number;
}

// ─── Contenu expert des 8 ratios ───────────────────────────────────────────

export const RATIO_EXPERTISE: Record<ExpertiseRatioId, RatioExpertise> = {
  contacts_estimations: {
    id: "contacts_estimations",
    label: "Contacts → Estimations",
    formula: "contacts ÷ estimations",
    direction: "less_is_better",
    thresholds: { junior: 20, confirme: 15, expert: 10 },
    leverageWeight: 1.0,
    diagnosis:
      "Quand ce ratio est dégradé, il faut beaucoup de contacts pour obtenir une estimation. Cela peut relever de plusieurs sujets : un mauvais choix de source de prospection, un discours de prospection inadapté, ou des éléments de prospection (flyer, script d'appel, SMS, mail) qui n'impactent pas le volume d'estimations.",
    commonCauses: [
      "Un discours non adapté ou commun, déjà entendu par les prospects et qui n'impacte plus.",
      "Un défaut d'alignement entre le discours tenu en prospection terrain, le support distribué (flyer) et les outils utilisés (carte de visite seule, etc.).",
    ],
    bestPractices:
      "Les meilleurs ont un discours rodé parce qu'ils se sont entraînés à ce discours. Ils se préparent à leur prospection, qu'elle soit terrain, téléphonique ou digitale : il y a une vraie préparation. Surtout, ils relancent régulièrement leurs contacts et alimentent leur base de données pour qu'au fil des conversations, le même prospect finisse par demander une estimation.",
    firstAction:
      "Un vrai travail d'entraînement à la prospection : jeux de rôle, préparation, et travail sur l'état d'esprit.",
    caImpactType: "direct_cascade",
    caImpactNote:
      "Effet cascade fort : +contacts qualifiés → +estimations → +mandats → +ventes. Exemple doc : passer de 5 à 10 RDV d'estimation = +5 exclusivités potentielles = +3,5 ventes supplémentaires.",
    expectedImpactDelayDays: 90,
  },

  estimations_mandats: {
    id: "estimations_mandats",
    label: "Estimations → Mandats",
    formula: "estimations ÷ mandats",
    direction: "less_is_better",
    thresholds: { junior: 3, confirme: 2, expert: 1.5 },
    leverageWeight: 1.0,
    diagnosis:
      "Le conseiller ne met pas le client en position de décision au moment de passer au mandat : il évite trop les objections. Il a aussi tendance à croire que si son estimation est plus faible que celle d'un autre, le client choisira l'autre, et il ne sait pas répondre à cette objection.",
    commonCauses: [
      "Problème de prix face à la divergence du client, mais surtout : absence d'explication claire du process métier.",
      "Remise d'une estimation sans passer par la présentation des services ni par l'analyse comparative de marché.",
      "Manque de confiance installé dès le premier rendez-vous de découverte.",
    ],
    bestPractices:
      "Les meilleurs ont un process hyper rodé entre le R1 et le R2. En R2 : présentation des services, analyse comparative de marché, puis présentation de l'estimation. Derrière, ils répondent aux objections avec l'objectif de signer le mandat dès l'accord du client. Avec la signature électronique, une fois l'accord obtenu, ils repassent à l'agence préparer le mandat et l'envoyer en signature — plus de \"vente à plus tard\".",
    firstAction:
      "Relancer l'intégralité des estimations réalisées (elles peuvent devenir des mandats), et préparer chaque R2 par de l'entraînement et du jeu de rôle.",
    caImpactType: "direct_strong",
    caImpactNote:
      "Gain direct : chaque estimation non convertie est un mandat perdu. Impact proportionnel à (estimations réalisées × commission moyenne).",
    expectedImpactDelayDays: 90,
  },

  pct_exclusivite: {
    id: "pct_exclusivite",
    label: "% Exclusivité",
    formula: "mandats_exclusifs ÷ mandats × 100",
    direction: "more_is_better",
    thresholds: { junior: 30, confirme: 50, expert: 70 },
    leverageWeight: 1.2,
    diagnosis:
      "Le conseiller a du mal à être seul sur le dossier et à faire comprendre au client que l'exclusivité est la clé de la réussite. Soit il utilise des sources où les biens sont déjà en vente (plus difficile de se positionner en exclu), soit il ne répond pas aux objections du client sur l'exclusivité.",
    commonCauses: [
      "Le client veut travailler avec plusieurs agences, ne pas être bloqué, se garder l'opportunité de vendre de son côté.",
      "La culture de l'agence n'est pas tournée vers l'exclusivité.",
    ],
    bestPractices:
      "Les meilleurs sont persuadés que l'exclusivité est la meilleure option pour leurs clients. Ils présentent leurs services dans le cadre d'une exclusivité et différencient clairement les services offerts en mandat simple vs mandat exclusif (beaucoup plus de services en exclu). Ce sont des agents qui se battent pour aller chercher l'exclusivité.",
    firstAction:
      "Un échange concret avec son coach à la suite d'un rendez-vous, pour dérouler le RDV, identifier les oublis et manquements, et ajuster la méthode sur les rendez-vous suivants. Travailler aussi les rendez-vous de suivi pour requalifier les mandats simples en exclu.",
    caImpactType: "leverage_high",
    caImpactNote:
      "Calibration doc : passer de 30% à 40% d'exclusivité sur 100 mandats = 5 ventes supplémentaires (les exclus convertissent 2x mieux). Un des ratios les plus rentables à travailler.",
    expectedImpactDelayDays: 90,
  },

  acheteurs_tournee: {
    id: "acheteurs_tournee",
    label: "Acheteurs → Tournée visite",
    formula: "acheteurs ÷ sortis_visite",
    direction: "less_is_better",
    thresholds: { junior: 5, confirme: 4, expert: 3 },
    leverageWeight: 0.6,
    diagnosis:
      "L'agent fait du one-shot ou montre très peu de biens à son client. Il ne fait pas de découverte et répond directement au client qui l'a contacté sur un bien : il le renseigne et va visiter avec lui.",
    commonCauses: [
      "Plus personne ne refait un vrai travail de découverte avec les acquéreurs : les recevoir, parler de leur projet, prendre le temps.",
      "Acheteur mal qualifié et problème de suivi.",
      "Peur du conseiller de perdre une commission s'il ne visite pas avec ce client sans découvrir son projet.",
    ],
    bestPractices:
      "Les meilleurs filtrent les clients : ils reçoivent ou voient les clients pour faire une vraie découverte, et signent des mandats de recherche exclusifs pour n'engager du temps qu'avec des clients qui leur font pleinement confiance. Cela qualifie le client, cible mieux les recherches, crée la confiance, et permet de faire visiter plusieurs biens par sortie.",
    firstAction:
      "Une prise de conscience du conseiller par du e-learning ou de la formation : comprendre que l'important avec les acheteurs est de découvrir leur projet, comme on le fait avec les vendeurs.",
    caImpactType: "indirect",
    caImpactNote:
      "Section D du doc : ratios plus éloignés d'un ROI CA direct. Impact via amélioration de la qualité de suivi acheteur.",
    expectedImpactDelayDays: 120,
  },

  visites_par_acheteur: {
    id: "visites_par_acheteur",
    label: "Visites par acheteur",
    formula: "visites ÷ sortis_visite",
    direction: "less_is_better",
    thresholds: { junior: 3, confirme: 3, expert: 3 },
    leverageWeight: 0.6,
    diagnosis:
      "Avec un acheteur, le conseiller lui montre un ou deux biens : le client a du mal à choisir par contraste. Soit il n'a pas trouvé de bien correspondant, soit il a mal ciblé la recherche.",
    commonCauses: [
      "Découverte parfaitement insuffisante.",
      "Confusion entre les critères d'envie du client et ses critères de besoin : recherche permanente de la perle rare, ce qui restreint le filtre à très peu de biens.",
    ],
    bestPractices:
      "Les meilleurs font visiter 3 biens par sortie : un bien repoussoir (un critère important ne correspond pas), le bien ciblé qui correspond à la recherche, et un bien de confort (+10% de budget). Ils font 3 sorties de visite maximum avec le même acheteur, soit 8 à 9 biens maximum.",
    firstAction:
      "De la formation (présentielle ou e-learning) pour remettre les fondamentaux en place. Le coaching peut ensuite servir à déclencher la prise de conscience.",
    caImpactType: "indirect",
    caImpactNote:
      "Section D du doc : ratios plus éloignés d'un ROI CA direct. Impact via amélioration du taux de closing visites→offres en cascade.",
    expectedImpactDelayDays: 120,
  },

  visites_offres: {
    id: "visites_offres",
    label: "Visites → Offres",
    formula: "visites ÷ offres",
    direction: "less_is_better",
    thresholds: { junior: 12, confirme: 10, expert: 8 },
    leverageWeight: 1.0,
    diagnosis:
      "Trop de visites pour obtenir une offre. Mauvais ciblage de la recherche du client, ou mauvaise évaluation de sa maturité dans le projet, ou mauvais ciblage des critères.",
    commonCauses: [
      "Découverte insuffisante.",
      "Nombre de biens montrés trop faible pour permettre le choix par contraste.",
      "Question de qualité du client géré, pas seulement de prix.",
    ],
    bestPractices:
      "Les meilleurs n'envoient aucune fiche à leurs clients : quand ils ont sélectionné des biens, c'est qu'ils sont persuadés qu'ils peuvent intéresser. Ils donnent RDV à l'agence avant les visites pour être ensemble tout le long. Après les visites, ils reviennent à l'agence ou dans un lieu (brasserie) pour faire un débrief, et proposent au client de se positionner immédiatement s'il y a un intérêt.",
    firstAction:
      "Reprendre les fondamentaux du métier. Les leviers sont le coaching et la formation.",
    caImpactType: "direct_strong",
    caImpactNote:
      "Calibration doc : passer de 24 visites/2 offres à 18 visites/2 offres. Ou à 20 visites = 3 offres au lieu de 2 → +0,5 compromis supplémentaire × commission moyenne.",
    expectedImpactDelayDays: 90,
  },

  offres_compromis: {
    id: "offres_compromis",
    label: "Offres → Compromis",
    formula: "offres ÷ compromis",
    direction: "less_is_better",
    thresholds: { junior: 3, confirme: 2, expert: 1.5 },
    leverageWeight: 1.0,
    diagnosis:
      "L'offre est souvent prise trop basse : le client acheteur n'a pas été dirigé pour faire une offre défendable face au vendeur. Le vendeur ferme la porte.",
    commonCauses: [
      "Offre trop basse.",
      "Négociation par téléphone au lieu du face-to-face.",
    ],
    bestPractices:
      "Les meilleurs aiguillent l'acheteur au moment de l'offre : si l'offre est trop basse, les discussions pour la faire remonter commencent avant même la présentation au vendeur. Ils convoquent toujours leurs clients vendeurs (ou ceux d'un collègue) pour leur expliquer le cheminement du dossier : dernière visite, retour de visite, positionnement de l'offre. Vraie préparation et vraie négociation en face-to-face.",
    firstAction:
      "De la préparation par du jeu de rôle.",
    caImpactType: "direct_strong",
    caImpactNote:
      "Dernier mètre avant signature : chaque offre non transformée en compromis est une commission perdue. Impact proportionnel à (offres × commission moyenne × écart de ratio).",
    expectedImpactDelayDays: 60,
  },

  compromis_actes: {
    id: "compromis_actes",
    label: "Compromis → Actes",
    formula: "compromis ÷ actes",
    // Ratio brut : nombre de compromis pour 1 acte signé. 1.0 = parfait,
    // > 1 = compromis qui cassent. Aligné avec defaultRatioConfigs.
    direction: "less_is_better",
    thresholds: { junior: 1.3, confirme: 1.15, expert: 1.05 },
    leverageWeight: 1.1,
    diagnosis:
      "Le dossier n'est pas maîtrisé : tous les éléments ne sont pas réunis au moment du compromis. Le financement n'a pas été vu, ou l'offre a été forcée sous pression sur l'acheteur. Le compromis casse en rétractation ou à la levée d'une condition suspensive.",
    commonCauses: [
      "Problème de financement non vu au départ.",
      "Délai trop long entre offre et signature du compromis : au moment de signer, le client regarde déjà autre chose.",
    ],
    bestPractices:
      "Les meilleurs s'assurent que le financement est OK avant même de faire l'offre. Ils ont l'intégralité des pièces du dossier dès la découverte du client pour qu'il se positionne en toute connaissance. Passation rapide avec le service administratif ou le notaire pour une signature rapide. Suivi du client de la signature du compromis à la levée des conditions suspensives.",
    firstAction:
      "Action préventive : avoir l'intégralité du dossier complet, et se former spécifiquement sur : comment demander les pièces à la prise du mandat, comment constituer un dossier de vente complet, comment accompagner un acheteur pour sécuriser son financement.",
    caImpactType: "security",
    caImpactNote:
      "Sécurise du CA déjà engagé : chaque compromis cassé = commission intégralement perdue. Impact critique sur la régularité de trésorerie.",
    expectedImpactDelayDays: 60,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getExpertise(id: ExpertiseRatioId): RatioExpertise {
  return RATIO_EXPERTISE[id];
}

export function getThreshold(
  id: ExpertiseRatioId,
  profile: ProfileLevel
): number {
  return RATIO_EXPERTISE[id].thresholds[profile];
}

export const ALL_EXPERTISE_RATIOS = Object.values(RATIO_EXPERTISE);
