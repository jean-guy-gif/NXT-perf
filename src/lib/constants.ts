export const NXT_COLORS = {
  blue: "#3375FF",
  green: "#39C97E",
  violet: "#A055FF",
  orange: "#FFA448",
  red: "#EF7550",
  yellow: "#FFD967",
} as const;

export const STATUS_COLORS = {
  ok: "text-green-500",
  warning: "text-orange-500",
  danger: "text-red-500",
} as const;

export const STATUS_BG_COLORS = {
  ok: "bg-green-500/10",
  warning: "bg-orange-500/10",
  danger: "bg-red-500/10",
} as const;

export const STATUS_BORDER_COLORS = {
  ok: "border-green-500/30",
  warning: "border-orange-500/30",
  danger: "border-red-500/30",
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  debutant: "Junior",
  confirme: "Confirmé",
  expert: "Expert",
};

export const CATEGORY_COLORS: Record<string, string> = {
  debutant: "bg-blue-500/20 text-blue-400",
  confirme: "bg-yellow-500/20 text-yellow-400",
  expert: "bg-green-500/20 text-green-400",
};

export const FORMATION_AREA_LABELS: Record<string, string> = {
  prospection: "Prospection",
  estimation: "Estimation",
  exclusivite: "Exclusivité",
  suivi_mandat: "Suivi Mandat",
  accompagnement_acheteur: "Accompagnement Acheteur",
  negociation: "Négociation",
};

export const PERIOD_LABELS: Record<string, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
};

export const FIELD_TOOLTIPS: Record<string, string> = {
  // Prospection
  contactsTotaux: "Tous vos contacts confondus sur la période : entrants (portails, vitrine) + prospection active (téléphone, porte-à-porte, pige, farming, réseaux sociaux, partenaires).",
  rdvEstimation: "Nombre de rendez-vous physiques réalisés chez un vendeur pour évaluer le prix de son bien. Un appel ou un échange par email ne compte pas comme un RDV estimation.",
  // Vendeurs
  estimationsRealisees: "Nombre d'estimations effectivement réalisées sur la période (RDV chez le vendeur avec remise d'un avis de valeur). Chaque estimation compte, même si elle ne débouche pas sur un mandat.",
  mandatsSignes: "Nombre de mandats signés sur la période, qu'ils soient simples ou exclusifs. Précisez ensuite le type de chaque mandat dans le détail ci-dessous.",
  rdvSuivi: "Rendez-vous de suivi avec un vendeur ayant déjà un mandat en cours : compte-rendu de visites, retour du marché, ajustement de stratégie ou de prix.",
  requalification: "Passage d'un mandat simple en mandat exclusif. Comptez chaque transformation obtenue grâce à votre argumentation et votre suivi vendeur.",
  baissePrix: "Nombre de vendeurs ayant accepté une baisse de prix sur la période, suite à votre recommandation basée sur le retour du marché.",
  // Acheteurs
  acheteursSortisVisite: "Nombre d'acheteurs distincts que vous avez emmenés en visite sur la période. Un même acheteur emmené 3 fois compte pour 1.",
  nombreVisites: "Nombre total de visites réalisées sur la période. Un acheteur emmené visiter 3 biens compte pour 3 visites.",
  offresRecues: "Offres d'achat écrites et formalisées reçues sur la période. Une intention verbale ou une discussion de prix ne constitue pas une offre.",
  compromisSignes: "Nombre de compromis de vente (ou promesses synallagmatiques) signés sur la période. Le compromis engage juridiquement acheteur et vendeur.",
  chiffreAffairesCompromis: "Montant total des honoraires d'agence sur les compromis signés (CA déjà engagé mais non encore acté chez le notaire).",
  // Ventes
  actesSignes: "Nombre d'actes authentiques signés chez le notaire sur la période. C'est la vente définitive et irrévocable. Un compromis n'est pas un acte.",
  chiffreAffaires: "Montant total de vos honoraires d'agence (HT ou TTC selon votre convention) sur les actes signés de la période. C'est le prix de votre prestation, pas le prix de vente du bien.",
};

/**
 * Monthly objectives by category — used for agency GPS calculations and the
 * Vue Réseau v2.0 "ruissellement total" (sum of CATEGORY_OBJECTIVES[c.category]
 * over every conseiller in every agency of the network).
 *
 * Conventions :
 * - exclusivite : pourcentage cible (0..100) du mix exclusif/simple sur les mandats
 * - ca          : chiffre d'affaires (€) cible des actes signés (CA Acte)
 * - caCompromis : honoraires moyens cibles (€) sur les compromis signés —
 *                 calculé comme `compromis × 7 500€/compromis`. Ne pas confondre
 *                 avec le champ mock `chiffreAffairesCompromis` qui représente
 *                 la VALEUR DES BIENS en compromis (`compromis × 15 000€`).
 *                 Voir docs/TECH_DEBT.md.
 *
 * Les 4 champs `contactsTotaux`, `rdvEstimation`, `acheteursSortis`, `caCompromis`
 * ont été ajoutés en Phase 1 du tableau de bord réseau v2.0 (Task 2) pour couvrir
 * les 12 étapes de la chaîne de production.
 */
export const CATEGORY_OBJECTIVES: Record<string, {
  contactsTotaux: number;
  rdvEstimation: number;
  estimations: number;
  mandats: number;
  exclusivite: number;
  acheteursSortis: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
  caCompromis: number;
  ca: number;
}> = {
  debutant: {
    contactsTotaux: 200, rdvEstimation: 12, estimations: 8, mandats: 4, exclusivite: 30,
    acheteursSortis: 15, visites: 20, offres: 3, compromis: 1, actes: 1,
    caCompromis: 7500, ca: 8000,
  },
  confirme: {
    contactsTotaux: 300, rdvEstimation: 18, estimations: 15, mandats: 8, exclusivite: 50,
    acheteursSortis: 25, visites: 30, offres: 5, compromis: 3, actes: 2,
    caCompromis: 22500, ca: 20000,
  },
  expert: {
    contactsTotaux: 400, rdvEstimation: 25, estimations: 20, mandats: 12, exclusivite: 70,
    acheteursSortis: 35, visites: 40, offres: 8, compromis: 5, actes: 4,
    caCompromis: 37500, ca: 40000,
  },
};

export type GPSTheme = "estimations" | "mandats" | "exclusivite" | "visites" | "offres" | "compromis" | "actes" | "ca_compromis" | "ca_acte";

export const GPS_THEME_LABELS: Record<GPSTheme, string> = {
  estimations: "Estimations",
  mandats: "Mandats",
  exclusivite: "% Exclusivité",
  visites: "Visites",
  offres: "Offres",
  compromis: "Compromis",
  actes: "Actes",
  ca_compromis: "CA Compromis",
  ca_acte: "CA Acte",
};
