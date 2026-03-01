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

export function getActionsForRatio(
  ratioId: RatioId
): { label: string; description: string }[] {
  const actionsMap: Record<RatioId, { label: string; description: string }[]> = {
    contacts_rdv: [
      { label: "Relancer les prospects non contactés", description: "Reprendre la liste des contacts entrants non traités et les recontacter sous 48h." },
      { label: "Préparer un script d'appel", description: "Rédiger un script structuré pour qualifier rapidement les leads au téléphone." },
      { label: "Qualifier les leads entrants", description: "Classer chaque contact par niveau d'urgence et potentiel de conversion." },
      { label: "Diversifier les canaux de prospection", description: "Explorer de nouveaux canaux : réseaux sociaux, partenariats locaux, événements." },
    ],
    estimations_mandats: [
      { label: "Revoir l'argumentation prix", description: "Préparer des arguments solides basés sur les comparables récents du secteur." },
      { label: "Préparer un dossier comparatif", description: "Constituer un book de ventes récentes à présenter lors de chaque estimation." },
      { label: "Former à la présentation exclusivité", description: "Travailler le pitch de transformation d'estimation en mandat signé." },
      { label: "Améliorer le suivi post-estimation", description: "Mettre en place un protocole de relance systématique après chaque RDV estimation." },
    ],
    pct_mandats_exclusifs: [
      { label: "Renforcer l'argumentaire exclusivité", description: "Valoriser les avantages concrets de l'exclusivité : visibilité, engagement, résultats." },
      { label: "Préparer des témoignages clients", description: "Collecter des retours de vendeurs satisfaits ayant choisi l'exclusivité." },
      { label: "Proposer des garanties exclusivité", description: "Offrir des engagements concrets : plan marketing dédié, reporting hebdomadaire." },
    ],
    visites_offre: [
      { label: "Mieux qualifier les acheteurs avant visite", description: "Vérifier budget, financement et critères avant de programmer une visite." },
      { label: "Préparer les visites avec soin", description: "Préparer un dossier complet du bien et anticiper les objections des acheteurs." },
      { label: "Améliorer le suivi post-visite", description: "Appeler chaque visiteur sous 24h pour recueillir ses impressions et relancer." },
    ],
    offres_compromis: [
      { label: "Travailler les techniques de négociation", description: "S'entraîner aux techniques de closing et de gestion des objections prix." },
      { label: "Accélérer le traitement des offres", description: "Réduire le délai entre la réception d'une offre et sa présentation au vendeur." },
      { label: "Sécuriser le financement acheteur", description: "Vérifier la solidité du dossier financier avant de formaliser l'offre." },
      { label: "Maintenir le lien avec les parties", description: "Communiquer régulièrement avec acheteur et vendeur pour éviter les désistements." },
    ],
    mandats_simples_vente: [
      { label: "Intensifier le suivi des mandats simples", description: "Planifier des points réguliers avec les vendeurs pour maintenir leur confiance." },
      { label: "Revoir la stratégie de prix", description: "Analyser les mandats simples sans offre et proposer un ajustement de prix." },
      { label: "Augmenter la visibilité des biens", description: "Multiplier les canaux de diffusion et améliorer la qualité des annonces." },
    ],
    mandats_exclusifs_vente: [
      { label: "Maximiser le plan marketing exclusif", description: "Déployer le plan marketing complet prévu pour chaque mandat exclusif." },
      { label: "Organiser des visites groupées", description: "Créer un effet de rareté en regroupant les visites sur des créneaux serrés." },
      { label: "Faire un reporting vendeur hebdomadaire", description: "Envoyer un compte-rendu détaillé chaque semaine au vendeur exclusif." },
    ],
  };

  return actionsMap[ratioId] ?? [];
}

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
