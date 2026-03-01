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
  contactsEntrants: "Contacts issus des portails immobiliers (SeLoger, LeBonCoin…), de la notoriété de l'agence (vitrine, site web), du réseau de recommandation ou du bouche-à-oreille. Ce sont les contacts qui viennent à vous sans action de prospection directe.",
  contactsTotaux: "Tous vos contacts confondus : entrants + prospection active (téléphone, porte-à-porte, pige, farming, réseaux sociaux, partenaires). Ce chiffre est toujours ≥ aux contacts entrants.",
  rdvEstimation: "Nombre de rendez-vous physiques réalisés chez un vendeur pour évaluer le prix de son bien. Un appel ou un échange par email ne compte pas comme un RDV estimation.",
  infosVente: "Projet vendeur identifié mais pas encore transformé en RDV estimation. Exemple : un voisin qui mentionne vouloir vendre, une info captée en prospection terrain ou via votre réseau.",
  // Vendeurs
  estimationsRealisees: "Nombre d'estimations effectivement réalisées sur la période (RDV chez le vendeur avec remise d'un avis de valeur). Chaque estimation compte, même si elle ne débouche pas sur un mandat.",
  mandatsSignes: "Nombre de mandats signés sur la période, qu'ils soient simples ou exclusifs. Précisez ensuite le type de chaque mandat dans le détail ci-dessous.",
  rdvSuivi: "Rendez-vous de suivi avec un vendeur ayant déjà un mandat en cours : compte-rendu de visites, retour du marché, ajustement de stratégie ou de prix.",
  requalification: "Passage d'un mandat simple en mandat exclusif. Comptez chaque transformation obtenue grâce à votre argumentation et votre suivi vendeur.",
  baissePrix: "Nombre de vendeurs ayant accepté une baisse de prix sur la période, suite à votre recommandation basée sur le retour du marché.",
  // Acheteurs
  acheteursChauds: "Acquéreur qualifié avec un projet concret, un budget défini et un financement validé (ou en cours). Il est prêt à visiter et potentiellement à faire une offre rapidement.",
  acheteursSortisVisite: "Nombre d'acheteurs distincts que vous avez emmenés en visite sur la période. Un même acheteur emmené 3 fois compte pour 1.",
  nombreVisites: "Nombre total de visites réalisées sur la période. Un acheteur emmené visiter 3 biens compte pour 3 visites.",
  offresRecues: "Offres d'achat écrites et formalisées reçues sur la période. Une intention verbale ou une discussion de prix ne constitue pas une offre.",
  compromisSignes: "Nombre de compromis de vente (ou promesses synallagmatiques) signés sur la période. Le compromis engage juridiquement acheteur et vendeur.",
  // Ventes
  actesSignes: "Nombre d'actes authentiques signés chez le notaire sur la période. C'est la vente définitive et irrévocable. Un compromis n'est pas un acte.",
  chiffreAffaires: "Montant total de vos honoraires d'agence (HT ou TTC selon votre convention) sur les actes signés de la période. C'est le prix de votre prestation, pas le prix de vente du bien.",
};
