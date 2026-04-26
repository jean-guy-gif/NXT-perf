import type { RatioId } from "@/types/ratios";

// Label rebrand for percentage view mode (mode "Pourcentages" sur /performance)
// — Transformations classiques : "Transformation X → Y"
// — Cas spéciaux (% Exclusivité, visites/acheteur, honoraires) : libellés métier
export const RATIO_PERCENT_LABELS: Record<RatioId, string> = {
  contacts_rdv: "Transformation Contact → RDV",
  rdv_mandats: "Transformation RDV → Mandat",
  pct_mandats_exclusifs: "Taux d'exclusivité",
  acheteurs_visites: "Nombre de visites par acheteur",
  visites_offre: "Transformation Visite → Offre",
  offres_compromis: "Transformation Offre → Compromis",
  compromis_actes: "Transformation Compromis → Acte",
  honoraires_moyens: "Honoraires moyens",
};

// Sub-text "Obj. {profile} : Z" — formatted threshold value for percentage view mode.
// — Transformations isLowerBetter : 1/threshold * 100 → "%" (ex: threshold 15 → 7%)
// — pct_mandats_exclusifs : threshold direct → "%" (ex: 50%)
// — acheteurs_visites : threshold + "visites/acheteur"
// — honoraires_moyens : threshold formaté en milliers + "€"
export function formatRatioObjectiveValue(
  ratioId: RatioId,
  threshold: number
): string {
  if (ratioId === "pct_mandats_exclusifs") {
    return `${threshold}%`;
  }
  if (ratioId === "acheteurs_visites") {
    return `${threshold} visites/acheteur`;
  }
  if (ratioId === "honoraires_moyens") {
    return `${new Intl.NumberFormat("fr-FR").format(threshold)} €`;
  }
  if (threshold <= 0) return "—";
  return `${Math.round((1 / threshold) * 100)}%`;
}

// Main value display in percentage view mode — taux de transformation BRUT (pas % de l'objectif).
// — Transformations isLowerBetter : 1/value * 100 → "%" (ex: value 9.7 → 10%)
// — pct_mandats_exclusifs : value direct → "%" (ex: 70%)
// — acheteurs_visites : value + "visites/acheteur" (ex: "2.5 visites/acheteur")
// — honoraires_moyens : value formaté en milliers + "€" (ex: "8 500 €")
export function formatRatioCurrentValue(
  ratioId: RatioId,
  value: number
): string {
  if (ratioId === "pct_mandats_exclusifs") {
    return `${Math.round(value)}%`;
  }
  if (ratioId === "acheteurs_visites") {
    return `${value.toFixed(1)} visites/acheteur`;
  }
  if (ratioId === "honoraires_moyens") {
    return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} €`;
  }
  if (value <= 0) return "—";
  return `${Math.round((1 / value) * 100)}%`;
}
