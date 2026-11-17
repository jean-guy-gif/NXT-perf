import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { isLever } from "@/data/ratio-expertise";
import type { MeasuredRatio, PainVolumes } from "@/lib/pain-point-detector";

export const RATIO_ID_TO_EXPERTISE_ID: Record<RatioId, ExpertiseRatioId | null> = {
  contacts_rdv: "contacts_estimations",
  rdv_mandats: "estimations_mandats",
  pct_mandats_exclusifs: "pct_exclusivite",
  acheteurs_visites: "acheteurs_tournee",
  visites_offre: "visites_offres",
  offres_compromis: "offres_compromis",
  compromis_actes: "compromis_actes",
  honoraires_moyens: null,
};

/**
 * `true` si ce ratio (legacy RatioId) est un levier actionnable — filtre sur
 * `estLevier` de l'expertise, jamais sur une liste en dur.
 * `honoraires_moyens` n'a pas d'expertise mappée → `false`.
 */
export function isLeverRatioId(ratioId: RatioId): boolean {
  const expertiseId = RATIO_ID_TO_EXPERTISE_ID[ratioId];
  return expertiseId ? isLever(expertiseId) : false;
}

/**
 * `true` UNIQUEMENT pour les ratios explicitement NON-leviers (ex.
 * `compromis_actes`, résultante). Les ratios sans expertise mappée
 * (`honoraires_moyens`) renvoient `false` → ils ne sont PAS filtrés par ce
 * garde (leur traitement reste inchangé).
 */
export function isNonLeverRatioId(ratioId: RatioId): boolean {
  const expertiseId = RATIO_ID_TO_EXPERTISE_ID[ratioId];
  return expertiseId !== null && !isLever(expertiseId);
}

function getVolumeBase(
  expertiseId: ExpertiseRatioId,
  results: PeriodResults
): number {
  switch (expertiseId) {
    case "contacts_estimations":
      return results.prospection.contactsTotaux;
    case "estimations_mandats":
      return results.vendeurs.estimationsRealisees || results.vendeurs.rdvEstimation;
    case "pct_exclusivite":
      return results.vendeurs.mandats.length || results.vendeurs.mandatsSignes;
    case "acheteurs_tournee":
    case "visites_par_acheteur":
      return results.acheteurs.acheteursSortisVisite;
    case "visites_offres":
      return results.acheteurs.nombreVisites;
    case "offres_compromis":
      return results.acheteurs.offresRecues;
    case "compromis_actes":
      return results.acheteurs.compromisSignes;
  }
}

/**
 * Extrait les volumes bruts servant au détecteur de point de douleur V3.
 * La plupart des volumes viennent de la fenêtre 3 mois (`results`) ; compromis
 * et actes viennent de la fenêtre 6 mois (`results6m`) quand elle est fournie.
 *
 * NB : le modèle KPI ne stocke pas de « total acheteurs » distinct des
 * acheteurs sortis en visite — on utilise donc `acheteursSortisVisite` comme
 * proxy pour les deux (le ratio acheteurs_tournee reste alors neutre).
 */
function painVolumesFromResults(
  results: PeriodResults,
  results6m?: PeriodResults | null
): PainVolumes {
  const six = results6m ?? results;
  return {
    contacts: results.prospection.contactsTotaux,
    estimations:
      results.vendeurs.estimationsRealisees || results.vendeurs.rdvEstimation,
    mandats: results.vendeurs.mandatsSignes,
    exclusifs: results.vendeurs.mandats.filter((m) => m.type === "exclusif")
      .length,
    acheteurs: results.acheteurs.acheteursSortisVisite,
    acheteursSortis: results.acheteurs.acheteursSortisVisite,
    visites: results.acheteurs.nombreVisites,
    offres: results.acheteurs.offresRecues,
    compromis: six.acheteurs.compromisSignes,
    actes: six.ventes.actesSignes,
  };
}

/**
 * Construit le pool MeasuredRatio alimentant le détecteur de point de douleur.
 * @param results   Agrégat 3 mois glissants (volumes de base).
 * @param results6m Agrégat 6 mois (compromis + actes). Optionnel : si absent,
 *                  compromis/actes sont lus sur `results`.
 */
export function buildMeasuredRatios(
  computedRatios: ComputedRatio[],
  results: PeriodResults | null | undefined,
  results6m?: PeriodResults | null
): MeasuredRatio[] {
  if (!results) return [];
  const volumes = painVolumesFromResults(results, results6m);
  const measured: MeasuredRatio[] = [];
  for (const computed of computedRatios) {
    const expertiseId = RATIO_ID_TO_EXPERTISE_ID[computed.ratioId as RatioId];
    if (!expertiseId) continue;
    measured.push({
      expertiseId,
      volumes,
      currentValue: computed.value,
      volumeBase: getVolumeBase(expertiseId, results),
      legacyStatus: computed.status,
    });
  }
  return measured;
}
