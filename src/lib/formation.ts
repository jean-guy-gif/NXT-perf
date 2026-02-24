import type { ComputedRatio } from "@/types/ratios";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type {
  FormationArea,
  FormationRecommendation,
  FormationDiagnostic,
  Priority,
} from "@/types/formation";

const ratioToFormationArea: Record<RatioId, FormationArea> = {
  contacts_rdv: "prospection",
  estimations_mandats: "estimation",
  pct_mandats_exclusifs: "exclusivite",
  visites_offre: "accompagnement_acheteur",
  offres_compromis: "negociation",
  mandats_simples_vente: "suivi_mandat",
  mandats_exclusifs_vente: "exclusivite",
};

const formationAreaLabels: Record<FormationArea, string> = {
  prospection: "Prospection",
  estimation: "Estimation",
  exclusivite: "Exclusivité",
  suivi_mandat: "Suivi Mandat",
  accompagnement_acheteur: "Accompagnement Acheteur",
  negociation: "Négociation",
};

const formationAreaDescriptions: Record<FormationArea, string> = {
  prospection:
    "Techniques de prise de contact, qualification des leads, scripts d'appel",
  estimation:
    "Méthodologie d'estimation, argumentation prix, présentation comparative",
  exclusivite:
    "Argumentaire exclusivité, valorisation du service, engagement client",
  suivi_mandat:
    "Suivi régulier des mandats, reporting vendeur, ajustement stratégie",
  accompagnement_acheteur:
    "Qualification besoin, préparation visites, accompagnement projet",
  negociation:
    "Techniques de négociation, gestion des offres, closing",
};

export function generateFormationDiagnostic(
  computedRatios: ComputedRatio[],
  ratioConfigs: Record<RatioId, RatioConfig>,
  userId: string
): FormationDiagnostic {
  const gaps: FormationRecommendation[] = [];

  for (const ratio of computedRatios) {
    if (ratio.status === "ok") continue;

    const config = ratioConfigs[ratio.ratioId as RatioId];
    const area = ratioToFormationArea[ratio.ratioId as RatioId];

    let gapPercentage: number;
    if (config.isLowerBetter) {
      gapPercentage =
        ((ratio.value - ratio.thresholdForCategory) /
          ratio.thresholdForCategory) *
        100;
    } else {
      gapPercentage =
        ((ratio.thresholdForCategory - ratio.value) /
          ratio.thresholdForCategory) *
        100;
    }

    gaps.push({
      area,
      label: formationAreaLabels[area],
      priority: ratio.status === "danger" ? 1 : 2,
      currentRatio: ratio.value,
      targetRatio: ratio.thresholdForCategory,
      gapPercentage: Math.round(gapPercentage),
      description: `${formationAreaDescriptions[area]}. Votre ratio "${config.name}" est à ${ratio.value} ${config.unit}, l'objectif est ${ratio.thresholdForCategory} ${config.unit}.`,
    });
  }

  gaps.sort((a, b) => a.priority - b.priority || b.gapPercentage - a.gapPercentage);

  gaps.forEach((g, i) => {
    if (i >= 2 && g.priority !== 1) g.priority = 3 as Priority;
  });

  const seenAreas = new Set<FormationArea>();
  const deduped = gaps.filter((g) => {
    if (seenAreas.has(g.area)) return false;
    seenAreas.add(g.area);
    return true;
  });

  const overallStatus = deduped.some((g) => g.priority === 1)
    ? "danger"
    : deduped.length > 0
      ? "warning"
      : "ok";

  return {
    userId,
    generatedAt: new Date().toISOString(),
    overallStatus,
    recommendations: deduped,
  };
}
