export type DPIQuestionId = string;

export interface DPIOption {
  label: string;
  value: number;
  detail?: string;
}

export interface DPIQuestion {
  id: DPIQuestionId;
  bloc: "contexte" | "performance";
  text: string;
  options: DPIOption[];
  axis?: string;
}

export const DPI_QUESTIONS: DPIQuestion[] = [
  // BLOC 1 — CONTEXTE (6 questions)
  { id: "ctx_experience", bloc: "contexte", text: "Depuis combien de temps exercez-vous dans l'immobilier ?", options: [
    { label: "Moins de 1 an", value: 1 },
    { label: "1 à 3 ans", value: 2 },
    { label: "3 à 7 ans", value: 3 },
    { label: "Plus de 7 ans", value: 4 },
  ]},
  { id: "ctx_statut", bloc: "contexte", text: "Quel est votre statut principal ?", options: [
    { label: "Mandataire indépendant", value: 1 },
    { label: "Salarié en agence", value: 2 },
    { label: "Agent commercial en agence", value: 3 },
    { label: "Dirigeant d'agence", value: 4 },
    { label: "Manager / Animateur réseau", value: 5 },
  ]},
  { id: "ctx_reseau", bloc: "contexte", text: "Travaillez-vous au sein d'un réseau ou d'un groupement ?", options: [
    { label: "Non", value: 1 },
    { label: "Oui", value: 2 },
  ]},
  { id: "ctx_zone", bloc: "contexte", text: "Sur quelle zone géographique exercez-vous principalement ?", options: [
    { label: "Zone rurale", value: 1 },
    { label: "Ville moyenne", value: 2 },
    { label: "Grande métropole", value: 3 },
    { label: "Zone touristique", value: 4 },
  ]},
  { id: "ctx_equipe", bloc: "contexte", text: "Travaillez-vous seul ou avec une équipe ?", options: [
    { label: "Seul", value: 1 },
    { label: "Petite équipe (2-5)", value: 2 },
    { label: "Agence structurée", value: 3 },
    { label: "Réseau multi-agences", value: 4 },
  ]},
  { id: "ctx_ca", bloc: "contexte", text: "Quel est votre niveau de production annuel approximatif ?", options: [
    { label: "Moins de 100k€ de CA", value: 1 },
    { label: "100 – 250k€", value: 2 },
    { label: "250 – 500k€", value: 3 },
    { label: "Plus de 500k€", value: 4 },
  ]},

  // BLOC 2 — PERFORMANCE (10 questions)
  { id: "perf_prospection", bloc: "performance", axis: "intensite_commerciale", text: "Combien d'heures par semaine consacrez-vous réellement à la prospection active ?", options: [
    { label: "Moins de 3h", value: 1 },
    { label: "3 à 6h", value: 2 },
    { label: "6 à 10h", value: 3 },
    { label: "Plus de 10h", value: 4 },
  ]},
  { id: "perf_estimations", bloc: "performance", axis: "generation_opportunites", text: "Combien d'estimations réalisez-vous en moyenne par mois ?", options: [
    { label: "0 à 2", value: 1 },
    { label: "3 à 5", value: 2 },
    { label: "6 à 10", value: 3 },
    { label: "Plus de 10", value: 4 },
  ]},
  { id: "perf_mandats_stock", bloc: "performance", axis: "solidite_portefeuille", text: "Combien de mandats actifs avez-vous actuellement en portefeuille ?", options: [
    { label: "Moins de 5", value: 1 },
    { label: "5 à 10", value: 2 },
    { label: "10 à 20", value: 3 },
    { label: "Plus de 20", value: 4 },
  ]},
  { id: "perf_exclusivite", bloc: "performance", axis: "maitrise_ratios", text: "Quel pourcentage de vos mandats sont en exclusivité ?", options: [
    { label: "Moins de 20%", value: 1 },
    { label: "20 à 40%", value: 2 },
    { label: "40 à 70%", value: 3 },
    { label: "Plus de 70%", value: 4 },
  ]},
  { id: "perf_taux_estim_mandats", bloc: "performance", axis: "maitrise_ratios", text: "Quel est votre taux estimations → mandats signés ?", options: [
    { label: "Moins de 30%", value: 1 },
    { label: "30 à 50%", value: 2 },
    { label: "50 à 70%", value: 3 },
    { label: "Plus de 70%", value: 4 },
  ]},
  { id: "perf_taux_mandats_ventes", bloc: "performance", axis: "maitrise_ratios", text: "Quel est votre taux mandats → ventes réalisées ?", options: [
    { label: "Moins de 30%", value: 1 },
    { label: "30 à 50%", value: 2 },
    { label: "50 à 70%", value: 3 },
    { label: "Plus de 70%", value: 4 },
  ]},
  { id: "perf_honoraires", bloc: "performance", axis: "valorisation_economique", text: "Quel est votre niveau moyen d'honoraires sur vos ventes ?", options: [
    { label: "Inférieur à 3%", value: 1 },
    { label: "Entre 3 et 4%", value: 2 },
    { label: "Entre 4 et 5%", value: 3 },
    { label: "Supérieur à 5%", value: 4 },
  ]},
  { id: "perf_suivi", bloc: "performance", axis: "pilotage_strategique", text: "Suivez-vous précisément vos indicateurs commerciaux chaque semaine ?", options: [
    { label: "Jamais", value: 1 },
    { label: "De temps en temps", value: 2 },
    { label: "Régulièrement", value: 3 },
    { label: "De façon structurée avec un outil", value: 4 },
  ]},
  { id: "perf_objectifs", bloc: "performance", axis: "pilotage_strategique", text: "Avez-vous un objectif chiffré mensuel ou annuel clair ?", options: [
    { label: "Non", value: 1 },
    { label: "Approximatif", value: 2 },
    { label: "Oui mais peu suivi", value: 3 },
    { label: "Oui et piloté activement", value: 4 },
  ]},
  { id: "perf_formation", bloc: "performance", axis: "pilotage_strategique", text: "Travaillez-vous aujourd'hui sur l'amélioration de vos compétences commerciales ?", options: [
    { label: "Jamais", value: 1 },
    { label: "Occasionnellement", value: 2 },
    { label: "Régulièrement", value: 3 },
    { label: "De manière structurée et continue", value: 4 },
  ]},
];
