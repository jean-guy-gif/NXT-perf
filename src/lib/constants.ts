export const NXT_COLORS = {
  blue: "#3B85FF",
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
