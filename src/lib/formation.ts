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
  rdv_mandats: "estimation",
  pct_mandats_exclusifs: "exclusivite",
  acheteurs_visites: "accompagnement_acheteur",
  visites_offre: "accompagnement_acheteur",
  offres_compromis: "negociation",
  compromis_actes: "negociation",
  honoraires_moyens: "negociation",
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
    rdv_mandats: [
      { label: "Revoir l'argumentation prix", description: "Préparer des arguments solides basés sur les comparables récents du secteur." },
      { label: "Préparer un dossier comparatif", description: "Constituer un book de ventes récentes à présenter lors de chaque estimation." },
      { label: "Former à la présentation exclusivité", description: "Travailler le pitch de transformation de RDV en mandat signé." },
      { label: "Améliorer le suivi post-RDV", description: "Mettre en place un protocole de relance systématique après chaque RDV estimation." },
    ],
    pct_mandats_exclusifs: [
      { label: "Renforcer l'argumentaire exclusivité", description: "Valoriser les avantages concrets de l'exclusivité : visibilité, engagement, résultats." },
      { label: "Préparer des témoignages clients", description: "Collecter des retours de vendeurs satisfaits ayant choisi l'exclusivité." },
      { label: "Proposer des garanties exclusivité", description: "Offrir des engagements concrets : plan marketing dédié, reporting hebdomadaire." },
    ],
    acheteurs_visites: [
      { label: "Multiplier les visites par acheteur", description: "Proposer plusieurs biens pertinents à chaque acheteur qualifié pour augmenter le volume de visites." },
      { label: "Mieux matcher bien et acheteur", description: "Affiner la qualification du besoin pour éviter les visites de pure courtoisie." },
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
    compromis_actes: [
      { label: "Sécuriser les dossiers de financement", description: "Vérifier la solidité du financement acheteur dès le compromis pour éviter les désistements." },
      { label: "Accélérer la levée des conditions suspensives", description: "Maintenir un contact hebdomadaire avec le notaire et la banque pour fluidifier le dossier." },
      { label: "Anticiper les blocages", description: "Identifier dès le compromis les risques potentiels (diagnostics, mitoyenneté, indivision)." },
    ],
    honoraires_moyens: [
      { label: "Renforcer l'argumentation honoraires", description: "Travailler le pitch de valeur pour justifier un barème premium." },
      { label: "Cibler les biens haut de gamme", description: "Diriger la prospection vers des segments avec des honoraires plus élevés." },
    ],
  };

  return actionsMap[ratioId] ?? [];
}

export type SaisieSection = "prospection" | "vendeurs" | "acheteurs" | "ventes";

export function getSaisieTips(
  section: SaisieSection
): { label: string; description: string }[] {
  const tipsMap: Record<SaisieSection, { label: string; description: string }[]> = {
    prospection: [
      { label: "Comptez tous vos contacts", description: "Les contacts totaux incluent les entrants (portails, vitrine) ET vos actions de prospection active (téléphone, porte-à-porte, réseau)." },
      { label: "Différenciez entrants et totaux", description: "Les contacts entrants sont ceux qui viennent à vous spontanément. Les contacts totaux incluent aussi votre prospection active." },
      { label: "Définition du RDV estimation", description: "Un RDV estimation est un rendez-vous physique chez le vendeur pour évaluer le prix de son bien. Un simple appel ne compte pas." },
      { label: "Qu'est-ce qu'une info de vente ?", description: "Une information de vente est un projet vendeur identifié mais pas encore transformé en RDV estimation. Notez le nom du contact et le contexte." },
    ],
    vendeurs: [
      { label: "Renseignez le type de mandat", description: "Précisez pour chaque mandat s'il est simple ou exclusif. Cela impacte directement vos ratios de performance." },
      { label: "Définition de la requalification", description: "Une requalification est le passage d'un mandat simple en mandat exclusif. Comptez chaque transformation obtenue sur la période." },
      { label: "Quand compter une baisse de prix ?", description: "Comptez une baisse de prix chaque fois qu'un vendeur accepte de réviser son prix à la baisse suite à votre recommandation." },
      { label: "RDV de suivi vendeur", description: "Comptez chaque rendez-vous de suivi réalisé avec un vendeur ayant déjà un mandat en cours (compte-rendu, ajustement stratégie)." },
    ],
    acheteurs: [
      { label: "Définition acheteur chaud", description: "Un acheteur chaud est un acquéreur qualifié avec un projet concret, un financement validé et prêt à visiter. Renseignez son nom et un commentaire." },
      { label: "Sortis en visite vs nombre de visites", description: "« Sortis en visite » = nombre d'acheteurs distincts emmenés en visite. « Nombre de visites » = total de visites réalisées (un acheteur peut en faire plusieurs)." },
      { label: "Offre formelle uniquement", description: "Ne comptez que les offres écrites et formalisées. Une intention verbale ou une discussion de prix ne constitue pas une offre." },
    ],
    ventes: [
      { label: "Acte signé = vente définitive", description: "Ne comptez un acte que lorsque la signature définitive chez le notaire a eu lieu. Un compromis n'est pas un acte." },
      { label: "CA = honoraires nets", description: "Le chiffre d'affaires correspond à vos honoraires d'agence sur les actes signés, pas au prix de vente du bien." },
      { label: "Une vente par acte", description: "Chaque acte notarié signé compte pour une vente, même si plusieurs compromis ont été nécessaires en amont." },
    ],
  };

  return tipsMap[section];
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
