import type { RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import type { ObjectiveBreakdown } from "@/types/objectives";

/**
 * Hypothèse métier — Taux de conversion Mandat → Acte
 *
 * Le modèle socle ne porte plus de ratio direct mandat→acte (les anciens
 * `mandats_simples_vente` / `mandats_exclusifs_vente` ont été retirés du
 * référentiel). Pour garder une chaîne funnel cohérente, on introduit une
 * hypothèse métier fixe et documentée :
 *
 *   60 % des mandats signés aboutissent à un acte (sur l'horizon annuel).
 *
 * Cela couvre :
 *   - les mandats simples abandonnés / vendus par un autre agent,
 *   - les mandats exclusifs non menés à terme,
 *   - les retraits vendeurs.
 *
 * Conséquence : `mandats = actes / 0.6`.
 *
 * À recalibrer dès qu'un ratio `mandats_actes` explicite sera introduit.
 */
const MANDAT_TO_ACTE_RATE = 0.6;

/**
 * Calcule le funnel d'objectifs nécessaires pour atteindre un CA annuel cible.
 *
 * Logique : on remonte le funnel depuis le CA.
 *   CA cible ─ honoraires moyens ─▶ actes
 *          actes × compromis_actes ─▶ compromis
 *      compromis × offres_compromis ─▶ offres
 *          offres × visites_offre ─▶ visites
 *         mandats = actes / MANDAT_TO_ACTE_RATE
 *         rdv estim. = mandats × rdv_mandats
 *
 * Les ratios de la forme "X par Y" (contacts_rdv, rdv_mandats,
 * visites_offre, offres_compromis, compromis_actes) se multiplient
 * directement quand on remonte (plus grand = plus d'effort en amont).
 *
 * @param annualCA CA annuel cible (€)
 * @param averageActValue Honoraires moyens cibles par acte (€) — en
 *   général le seuil `honoraires_moyens` pour la catégorie.
 * @param category Catégorie de l'utilisateur (Junior / Confirmé / Expert).
 * @param ratioConfigs Configuration des seuils par ratio.
 */
export function calculateObjectiveBreakdown(
  annualCA: number,
  averageActValue: number,
  category: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig>
): ObjectiveBreakdown {
  const t = (id: RatioId) => ratioConfigs[id].thresholds[category];

  // 1. Actes nécessaires : CA / honoraires moyens par acte.
  const actesNecessaires = Math.max(1, Math.ceil(annualCA / averageActValue));

  // 2. Remontée aval → amont sur la partie acquéreur.
  const compromisNecessaires = Math.ceil(actesNecessaires * t("compromis_actes"));
  const offresNecessaires = Math.ceil(compromisNecessaires * t("offres_compromis"));
  const visitesNecessaires = Math.ceil(offresNecessaires * t("visites_offre"));

  // 3. Mandats nécessaires — hypothèse métier fixe (cf. MANDAT_TO_ACTE_RATE).
  const mandatsNecessaires = Math.ceil(actesNecessaires / MANDAT_TO_ACTE_RATE);

  // 4. RDV estimation nécessaires : mandats × (RDV par mandat).
  //    `rdv_mandats` est exprimé en "RDV pour 1 mandat" donc on multiplie.
  //    On expose ce volume sous le champ `estimationsNecessaires` de
  //    `ObjectiveBreakdown` (1 RDV estimation == 1 estimation réalisée dans
  //    le modèle socle actuel).
  const estimationsNecessaires = Math.ceil(mandatsNecessaires * t("rdv_mandats"));

  const pourcentageExclusivite = t("pct_mandats_exclusifs");

  return {
    estimationsNecessaires,
    mandatsNecessaires,
    pourcentageExclusivite,
    visitesNecessaires,
    offresNecessaires,
    compromisNecessaires,
    actesNecessaires,
  };
}
