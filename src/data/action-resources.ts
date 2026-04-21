import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";

export interface ActionResource {
  title: string;
  content: string;
  isPlaceholder: boolean;
}

// Map ratio → titre de fiche humain
const RATIO_TITLES: Record<ExpertiseRatioId, string> = {
  contacts_estimations: "Transformer un contact en estimation",
  estimations_mandats: "Transformer une estimation en mandat",
  pct_exclusivite: "Signer en exclusivité",
  acheteurs_tournee: "Activer ton portefeuille acheteurs",
  visites_par_acheteur: "Optimiser le volume de visites par acheteur",
  visites_offres: "Transformer une visite en offre",
  offres_compromis: "Closer une offre en compromis",
  compromis_actes: "Sécuriser le passage du compromis à l'acte",
};

/**
 * Génère une fiche markdown à partir du contenu expertise d'un ratio.
 * Source unique de vérité : RATIO_EXPERTISE de ratio-expertise.ts
 */
export function buildResourceFromExpertise(
  ratioId: string | undefined
): ActionResource {
  if (!ratioId || !(ratioId in RATIO_EXPERTISE)) {
    return {
      title: "Ressource non disponible",
      content: "",
      isPlaceholder: true,
    };
  }

  const expertise = RATIO_EXPERTISE[ratioId as ExpertiseRatioId];
  const title = RATIO_TITLES[ratioId as ExpertiseRatioId];

  const isPct = expertise.direction === "more_is_better";
  const suffixJunior = isPct ? "%" : " (moins c'est mieux)";
  const suffixOthers = isPct ? "%" : "";

  const content = `# ${title}

**Ratio ciblé** : ${expertise.label} (${expertise.formula})

**Seuils de référence** :
- Junior : ${expertise.thresholds.junior}${suffixJunior}
- Confirmé : ${expertise.thresholds.confirme}${suffixOthers}
- Expert : ${expertise.thresholds.expert}${suffixOthers}

## Ce que ça signifie vraiment

${expertise.diagnosis}

## Les causes les plus fréquentes

${expertise.commonCauses.map((c) => `- ${c}`).join("\n")}

## Ce que font les meilleurs

${expertise.bestPractices}

## Première action concrète

${expertise.firstAction}

${expertise.caImpactNote ? `## Impact sur ton CA

${expertise.caImpactNote}

` : ""}---

*Cette fiche synthétise l'expertise coaching NXT Performance sur ce ratio. Pour aller plus loin, NXT Training propose des sessions pratiques sur ce thème.*`;

  return {
    title,
    content,
    isPlaceholder: false,
  };
}

/**
 * @deprecated — conservé pour rétrocompatibilité. Utiliser
 * buildResourceFromExpertise(ratioId) qui dérive la fiche depuis
 * l'expertise du ratio ciblé par le plan.
 */
export const findResourceForAction = (actionTitle: string): ActionResource => {
  void actionTitle;
  return {
    title: "Ressource non disponible",
    content: "",
    isPlaceholder: true,
  };
};
