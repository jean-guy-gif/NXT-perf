import type { RatioId, RatioConfig } from "@/types/ratios";
import type { FormationArea, FormationDiagnostic } from "@/types/formation";

// ─── Types ───────────────────────────────────────────────────────────

export type ActionStatus = "todo" | "in_progress" | "done";

export interface PlanAction {
  id: string;
  label: string;
  done: boolean;
  status: ActionStatus;
  note?: string;
}

export interface WeekPlan {
  weekNumber: 1 | 2 | 3 | 4;
  actions: PlanAction[];
  exercice: string;
}

export interface PlanPriority {
  ratioId: RatioId;
  area: FormationArea;
  label: string;
  currentValue: number;
  targetValue: number;
  status: "warning" | "danger";
}

export interface Plan30Days {
  id: string;
  generatedAt: string;
  priorities: PlanPriority[];
  weeks: WeekPlan[];
}

// ─── Actions terrain par FormationArea, réparties sur 4 semaines ─────

const weeklyActionsMap: Record<FormationArea, string[][]> = {
  prospection: [
    [
      "Lister 20 contacts non relancés et les rappeler",
      "Rédiger un script d'appel structuré",
      "Planifier 5 créneaux de prospection téléphonique",
    ],
    [
      "Tester le script sur 10 appels et noter les retours",
      "Identifier 3 nouveaux canaux de prospection",
      "Qualifier tous les leads entrants de la semaine",
    ],
    [
      "Organiser une session de prospection terrain (porte-à-porte)",
      "Mettre à jour le CRM avec tous les contacts en cours",
      "Relancer les prospects chauds non convertis",
    ],
    [
      "Analyser le taux de conversion appels → RDV du mois",
      "Ajuster le script selon les retours terrain",
      "Planifier le planning prospection du mois suivant",
    ],
  ],
  estimation: [
    [
      "Préparer un book de 5 comparables récents du secteur",
      "Revoir la méthodologie ACV pour les estimations",
      "Analyser 2 estimations passées non converties",
    ],
    [
      "Pratiquer le pitch estimation avec un collègue",
      "Préparer un dossier de présentation vendeur type",
      "Lister les objections fréquentes et préparer les réponses",
    ],
    [
      "Réaliser 2 RDV estimation avec le nouveau dossier",
      "Mettre en place un protocole de relance post-estimation",
      "Collecter les retours vendeurs sur la présentation",
    ],
    [
      "Analyser le taux estimation → mandat du mois",
      "Affiner le book comparables avec les dernières ventes",
      "Consolider la routine de suivi post-estimation",
    ],
  ],
  exclusivite: [
    [
      "Rédiger l'argumentaire exclusivité en 5 points clés",
      "Lister les avantages concrets pour le vendeur",
      "Préparer un plan marketing type pour mandat exclusif",
    ],
    [
      "Collecter 2 témoignages de vendeurs satisfaits",
      "Pratiquer le pitch exclusivité avec un collègue",
      "Identifier 3 mandats simples requalifiables",
    ],
    [
      "Proposer la requalification aux 3 vendeurs identifiés",
      "Présenter le plan marketing exclusif lors d'un RDV",
      "Envoyer un reporting hebdomadaire à un vendeur exclusif",
    ],
    [
      "Mesurer le taux de requalification du mois",
      "Ajuster l'argumentaire selon les retours terrain",
      "Formaliser le process exclusivité pour le mois suivant",
    ],
  ],
  suivi_mandat: [
    [
      "Lister tous les mandats en cours sans action récente",
      "Planifier un appel de suivi pour chaque mandat > 30 jours",
      "Préparer un template de compte-rendu vendeur",
    ],
    [
      "Réaliser les appels de suivi planifiés",
      "Analyser les mandats sans visite et proposer un ajustement prix",
      "Améliorer la qualité des annonces des 3 mandats les plus anciens",
    ],
    [
      "Envoyer un reporting vendeur pour chaque mandat actif",
      "Organiser un point stratégie avec les vendeurs en difficulté",
      "Multiplier les canaux de diffusion pour les mandats stagnants",
    ],
    [
      "Analyser le taux de vente des mandats simples du mois",
      "Identifier les mandats à renouveler ou abandonner",
      "Mettre en place une routine de suivi hebdomadaire",
    ],
  ],
  accompagnement_acheteur: [
    [
      "Revoir la fiche de qualification acheteur",
      "Vérifier le financement de chaque acheteur actif",
      "Préparer un dossier de visite complet pour 3 biens",
    ],
    [
      "Qualifier 5 acheteurs avec la nouvelle fiche",
      "Organiser des visites groupées sur un créneau serré",
      "Appeler chaque visiteur sous 24h après la visite",
    ],
    [
      "Relancer les acheteurs chauds n'ayant pas fait d'offre",
      "Proposer des biens alternatifs aux acheteurs indécis",
      "Travailler la présentation de l'offre avec un collègue",
    ],
    [
      "Analyser le taux visites → offres du mois",
      "Ajuster les critères de qualification acheteur",
      "Consolider le suivi post-visite systématique",
    ],
  ],
  negociation: [
    [
      "Réviser les techniques de closing (SPIN, ancrage)",
      "Analyser 2 négociations récentes perdues",
      "Préparer un argumentaire offre type",
    ],
    [
      "Pratiquer une simulation de négociation avec un collègue",
      "Réduire le délai de présentation offre → vendeur à 24h",
      "Vérifier la solidité financière de chaque offre en cours",
    ],
    [
      "Appliquer les techniques sur une vraie négociation",
      "Maintenir un contact quotidien acheteur/vendeur pendant la négo",
      "Anticiper les objections et préparer les contre-arguments",
    ],
    [
      "Analyser le taux offres → compromis du mois",
      "Identifier les causes de chute entre offre et compromis",
      "Formaliser un process de négociation standardisé",
    ],
  ],
};

const exerciceMap: Record<FormationArea, string[]> = {
  prospection: [
    "Exercice NXT : Simulation d'appel de prospection",
    "Exercice NXT : Qualification de lead en live",
    "Exercice NXT : Gestion des objections au téléphone",
    "Exercice NXT : Bilan prospection et plan d'action",
  ],
  estimation: [
    "Exercice NXT : Présentation d'estimation au vendeur",
    "Exercice NXT : Argumentation prix face aux objections",
    "Exercice NXT : Pitch de transformation estimation → mandat",
    "Exercice NXT : Analyse critique d'un dossier estimation",
  ],
  exclusivite: [
    "Exercice NXT : Pitch exclusivité en situation réelle",
    "Exercice NXT : Réponse aux objections « mandat simple »",
    "Exercice NXT : Simulation de requalification",
    "Exercice NXT : Présentation du plan marketing exclusif",
  ],
  suivi_mandat: [
    "Exercice NXT : Appel de suivi vendeur difficile",
    "Exercice NXT : Présentation d'une baisse de prix",
    "Exercice NXT : Rédaction de reporting vendeur efficace",
    "Exercice NXT : Gestion d'un mandat sans visite",
  ],
  accompagnement_acheteur: [
    "Exercice NXT : Qualification approfondie d'un acheteur",
    "Exercice NXT : Conduite de visite et présentation du bien",
    "Exercice NXT : Relance post-visite et closing",
    "Exercice NXT : Gestion d'un acheteur indécis",
  ],
  negociation: [
    "Exercice NXT : Simulation de négociation complète",
    "Exercice NXT : Présentation d'offre au vendeur",
    "Exercice NXT : Closing sous pression et objections",
    "Exercice NXT : Sécurisation du compromis",
  ],
};

// ─── Fonctions publiques ─────────────────────────────────────────────

const areaToRatioId: Record<FormationArea, RatioId> = {
  prospection: "contacts_rdv",
  estimation: "rdv_mandats",
  exclusivite: "pct_mandats_exclusifs",
  accompagnement_acheteur: "visites_offre",
  negociation: "offres_compromis",
  suivi_mandat: "compromis_actes",
};

const areaLabels: Record<FormationArea, string> = {
  prospection: "Prospection",
  estimation: "Estimation",
  exclusivite: "Exclusivité",
  suivi_mandat: "Suivi Mandat",
  accompagnement_acheteur: "Accompagnement Acheteur",
  negociation: "Négociation",
};

export function computeTopPriorities(
  diagnostic: FormationDiagnostic
): PlanPriority[] {
  const highPriority = diagnostic.recommendations
    .filter((r) => r.priority <= 2)
    .slice(0, 2);

  return highPriority.map((rec) => ({
    ratioId: areaToRatioId[rec.area],
    area: rec.area,
    label: areaLabels[rec.area],
    currentValue: rec.currentRatio,
    targetValue: rec.targetRatio,
    status: rec.priority === 1 ? ("danger" as const) : ("warning" as const),
  }));
}

export function generatePlan30Days(
  priorities: PlanPriority[],
  _ratioConfigs: Record<RatioId, RatioConfig>
): Plan30Days {
  const weeks: WeekPlan[] = ([1, 2, 3, 4] as const).map((weekNumber) => {
    const actions: PlanAction[] = [];
    let exercice = "";

    for (const priority of priorities) {
      const areaActions = weeklyActionsMap[priority.area]?.[weekNumber - 1] ?? [];
      for (const label of areaActions) {
        actions.push({
          id: `w${weekNumber}-${priority.area}-${actions.length}`,
          label,
          done: false,
          status: "todo",
        });
      }

      const areaExercice = exerciceMap[priority.area]?.[weekNumber - 1];
      if (areaExercice) {
        exercice = exercice ? `${exercice} | ${areaExercice}` : areaExercice;
      }
    }

    return { weekNumber, actions, exercice };
  });

  return {
    id: `plan-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    priorities,
    weeks,
  };
}
