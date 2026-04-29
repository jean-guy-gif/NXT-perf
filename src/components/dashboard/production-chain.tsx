"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useResults, useAllResults } from "@/hooks/use-results";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { CATEGORY_OBJECTIVES, CATEGORY_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";
import type { RatioId } from "@/types/ratios";
import type { FormationArea } from "@/types/formation";
import { generatePlan30Days } from "@/lib/plan-30-jours";
import type { Plan30Days, PlanPriority, ActionStatus } from "@/lib/plan-30-jours";
import { usePlans } from "@/hooks/use-plans";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useRouter } from "next/navigation";
import { RATIO_ID_TO_EXPERTISE_ID, buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import { useRatios } from "@/hooks/use-ratios";
import { CheckCircle2, XCircle, AlertTriangle as AlertIcon, Minus } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = "volumes" | "ratios" | "both";
export type Status = "surperf" | "stable" | "sousperf";

export interface StepVolume {
  num: number;
  label: string;
  realise: number;
  objectif: number;
  unit?: string;
}

export interface StepRatio {
  num: number;
  label: string;
  from: string;
  to: string;
  realise: number; // ratio value (e.g. 10 contacts per RDV)
  objectif: number;
  realisePct: number; // transformation %
  objectifPct: number;
  isLowerBetter: boolean;
  status: Status;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pure helper exporté pour réutilisation (NetworkProductionChain Phase 1) :
 * détermine le status d'un ratio (mode "ratios"), avec support isLowerBetter
 * pour les ratios où une valeur basse est meilleure (ex: visites par offre).
 * Seuils : surperf > 110 % objectif, sousperf < 90 %, stable entre les deux.
 */
export function getStatus(realise: number, objectif: number, isLowerBetter: boolean): Status {
  if (objectif === 0) return "stable";
  if (isLowerBetter) {
    if (realise < objectif * 0.9) return "surperf";
    if (realise > objectif * 1.1) return "sousperf";
    return "stable";
  }
  if (realise > objectif * 1.1) return "surperf";
  if (realise < objectif * 0.9) return "sousperf";
  return "stable";
}

/**
 * Pure helper exporté pour réutilisation (NetworkProductionChain Phase 1) :
 * détermine le status d'une carte de volume (mode "volumes"), où plus c'est
 * haut mieux c'est. Mêmes seuils que getStatus mais sans inversion possible.
 */
export function getVolumeStatus(realise: number, objectif: number): Status {
  if (objectif === 0) return "stable";
  const pct = realise / objectif;
  if (pct >= 1.1) return "surperf";
  if (pct >= 0.9) return "stable";
  return "sousperf";
}

// Status tokens — colored 2px border + status badge top-right.
// Exception au DS standard "border-border neutre" : usage spécifique chaîne de production
// (lecture comparative rapide de ~12 cards en flux), le signal status doit être plus fort.
// Border classes statiques pour purge Tailwind.
const STATUS_CONFIG = {
  surperf: {
    progressColor: "var(--success)",
    badgeBg: "bg-green-500/10",
    text: "text-green-500",
    borderClass: "border-2 border-green-500/40 hover:border-green-500/70",
    icon: CheckCircle2, label: "Surperf",   arrow: "↑",
  },
  stable: {
    progressColor: "var(--warning)",
    badgeBg: "bg-orange-500/10",
    text: "text-orange-500",
    borderClass: "border-2 border-orange-500/40 hover:border-orange-500/70",
    icon: Minus,        label: "Stable",    arrow: "=",
  },
  sousperf: {
    progressColor: "var(--danger)",
    badgeBg: "bg-red-500/10",
    text: "text-red-500",
    borderClass: "border-2 border-red-500/40 hover:border-red-500/70",
    icon: AlertIcon,    label: "Sous-perf", arrow: "↓",
  },
};

// ── Ratio → FormationArea mapping for action panels ─────────────────

const chainRatioToArea: Record<number, { ratioId: RatioId; area: FormationArea; areaLabel: string }> = {
  2: { ratioId: "contacts_rdv", area: "prospection", areaLabel: "Prospection" },
  3: { ratioId: "rdv_mandats", area: "estimation", areaLabel: "Estimation" },
  4: { ratioId: "rdv_mandats", area: "estimation", areaLabel: "Estimation" },
  5: { ratioId: "pct_mandats_exclusifs", area: "exclusivite", areaLabel: "Exclusivité" },
  7: { ratioId: "visites_offre", area: "accompagnement_acheteur", areaLabel: "Accompagnement acheteur" },
  8: { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation" },
  9: { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation" },
};

// ── Solutions d'amélioration — mapping intelligent outil → problématique ────

interface SolutionForRatio {
  id: string;
  name: string;
  icon: string;
  cost: string;
  url?: string;
  highlight: boolean;
  description: string;
  roiDetail: { ratio: string; chaine: string };
  // ROI multiplier (0 to 1) — how much of the computed deltaCA this tool can contribute
  roiMultiplier: number;
}

const TOOL_BASE = {
  coaching:  { id: "coaching",  name: "Coaching",      icon: "\uD83C\uDFAF",      cost: "9 \u20AC", url: "https://train-my-agent.vercel.app/" },
  training:  { id: "training",  name: "Training",      icon: "\uD83C\uDFCB\uFE0F", cost: "9 \u20AC", url: "https://train-my-agent.vercel.app/" },
  profiling: { id: "profiling", name: "NXT Profiling", icon: "\uD83D\uDD0D",      cost: "9 \u20AC", url: "https://nxt-profiling.fr/login" },
  juridique: { id: "juridique", name: "Juridique",     icon: "\u2696\uFE0F",       cost: "9 \u20AC", url: "https://nestenn-juridique.vercel.app/login" },
  formation: { id: "formation", name: "Formation",     icon: "\uD83D\uDCDA",      cost: "Selon financement" },
} as const;

/** Map plan action keywords to external tool URLs */
const actionToolKeywords: Array<{ keywords: string[]; url: string; label: string }> = [
  { keywords: ["simulation", "entraînement", "exercice nxt", "mise en situation", "jeu de rôle"], url: "https://train-my-agent.vercel.app/", label: "Training NXT" },
  { keywords: ["profil", "qualification", "profiling"], url: "https://nxt-profiling.fr/login", label: "NXT Profiling" },
  { keywords: ["juridique", "conformité", "clause", "condition suspensive"], url: "https://nestenn-juridique.vercel.app/login", label: "Juridique NXT" },
];

function getToolForAction(actionLabel: string): { url: string; label: string } | null {
  const lower = actionLabel.toLowerCase();
  for (const tool of actionToolKeywords) {
    if (tool.keywords.some((kw) => lower.includes(kw))) return tool;
  }
  return null;
}

// ── Volume card → area mapping for plan 30 jours on volume insufficiency ──

const volumeToArea: Record<number, { ratioId: RatioId; area: FormationArea; areaLabel: string; diagnostic: string }> = {
  1:  { ratioId: "contacts_rdv", area: "prospection", areaLabel: "Prospection", diagnostic: "Pas assez de contacts" },
  2:  { ratioId: "contacts_rdv", area: "prospection", areaLabel: "Prospection", diagnostic: "Pas assez de RDV estimation" },
  3:  { ratioId: "rdv_mandats", area: "estimation", areaLabel: "Estimation", diagnostic: "Pas assez d'estimations" },
  4:  { ratioId: "rdv_mandats", area: "estimation", areaLabel: "Estimation", diagnostic: "Pas assez de mandats" },
  7:  { ratioId: "visites_offre", area: "accompagnement_acheteur", areaLabel: "Accompagnement acheteur", diagnostic: "Pas assez de visites" },
  8:  { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation", diagnostic: "Pas assez d'offres" },
  9:  { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation", diagnostic: "Pas assez de compromis" },
  10: { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation", diagnostic: "Pas assez d'actes" },
  11: { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation", diagnostic: "CA compromis insuffisant" },
  12: { ratioId: "offres_compromis", area: "negociation", areaLabel: "Négociation", diagnostic: "CA insuffisant" },
};

// ── Labels métier lisibles pour les ratioIds ──
const ratioIdLabels: Record<string, string> = {
  contacts_rdv: "Contacts → RDV",
  rdv_mandats: "RDV → Mandat",
  pct_mandats_exclusifs: "% Exclusivité",
  acheteurs_visites: "Acheteurs → Visites",
  visites_offre: "Visites → Offre",
  offres_compromis: "Offres → Compromis",
  compromis_actes: "Compromis → Acte",
  honoraires_moyens: "Honoraires moyens",
};

// ── Mapping intelligent outil → problématique ──
// Chaque step num a une liste ordonnée d'outils pertinents avec :
// - description contextuelle
// - roiDetail (ratio + chaîne) textuels
// - roiMultiplier : part du deltaCA attribuable à cet outil (total ~1.0 sur les outils pertinents)
// - highlight : mise en avant
// Seuls les outils pertinents sont affichés (pas 5 outils systématiques)

interface ToolEntry {
  toolId: keyof typeof TOOL_BASE;
  description: string;
  roiDetail: { ratio: string; chaine: string };
  roiMultiplier: number; // 0-1, part du gain attribuable
  highlight: boolean;
}

// Volume steps (problème de volume, pas de transformation)
// Priorité : actions terrain / prospection / relance d'abord, coaching/training en soutien
// Formation JAMAIS sur volume pur
const volumeToolMap: Record<number, ToolEntry[]> = {
  1:  [ // Contacts entrants insuffisants — problème de prospection pure
    { toolId: "coaching",  description: "Plan de prospection terrain : pige, porte-à-porte, farming, relances systématiques", roiDetail: { ratio: "Augmentation du flux de contacts entrants", chaine: "Plus de contacts alimentent toute la chaîne" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "profiling", description: "Identifiez les profils de prospects à cibler en priorité", roiDetail: { ratio: "Meilleur ciblage des contacts à fort potentiel", chaine: "Contacts mieux qualifiés dès l'entrée" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "training",  description: "Entraînement aux techniques de prospection active", roiDetail: { ratio: "Amélioration des réflexes de prise de contact", chaine: "Prospection plus régulière" }, roiMultiplier: 0.2, highlight: false },
  ],
  2:  [ // RDV insuffisants en volume — relancer les contacts existants
    { toolId: "coaching",  description: "Plan de relance contacts : rappels, priorisation, scripts de conversion", roiDetail: { ratio: "Plus de contacts convertis en RDV", chaine: "Plus de RDV alimentent estimations et mandats" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "profiling", description: "Priorisez vos relances selon le profil du prospect", roiDetail: { ratio: "Relances ciblées sur les prospects les plus chauds", chaine: "Meilleur rendement des contacts existants" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "training",  description: "Entraînement à la prise de RDV et relance téléphonique", roiDetail: { ratio: "Meilleur taux de prise de RDV", chaine: "Plus de RDV planifiés chaque semaine" }, roiMultiplier: 0.2, highlight: false },
  ],
  3:  [ // Estimations insuffisantes en volume
    { toolId: "coaching",  description: "Plan d'action : générer plus de RDV estimation via prospection et relances", roiDetail: { ratio: "Plus de RDV estimation décrochés", chaine: "Plus d'estimations réalisées chaque mois" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "training",  description: "Entraînement à la transformation contact en RDV estimation", roiDetail: { ratio: "Réflexes de qualification et prise de RDV", chaine: "Pipeline estimations mieux alimenté" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "profiling", description: "Identifiez les vendeurs potentiels à approcher en priorité", roiDetail: { ratio: "Ciblage amélioré des vendeurs", chaine: "Estimation auprès des vendeurs les plus motivés" }, roiMultiplier: 0.2, highlight: false },
  ],
  4:  [ // Mandats insuffisants en volume
    { toolId: "coaching",  description: "Plan d'action : augmenter le volume d'estimations et le taux de signature", roiDetail: { ratio: "Plus d'estimations et meilleure conversion", chaine: "Plus de mandats signés chaque mois" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "training",  description: "Entraînement au closing mandat et argumentation prix", roiDetail: { ratio: "Amélioration du taux estimation vers mandat", chaine: "Moins de déperdition après estimation" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "profiling", description: "Identifiez les vendeurs les plus susceptibles de signer", roiDetail: { ratio: "Effort concentré sur les profils les plus chauds", chaine: "Meilleur rendement de l'effort commercial" }, roiMultiplier: 0.2, highlight: false },
  ],
  6:  [ // Acheteurs chauds insuffisants
    { toolId: "coaching",  description: "Plan d'action acheteurs : sourcing, relances, partenariats locaux", roiDetail: { ratio: "Plus d'acheteurs qualifiés dans le pipeline", chaine: "Plus de visites possibles, plus d'offres" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "profiling", description: "Profilez vos acheteurs pour mieux comprendre leurs attentes", roiDetail: { ratio: "Qualification acheteur plus fine", chaine: "Visites mieux ciblées" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "training",  description: "Techniques de relance et fidélisation acheteur", roiDetail: { ratio: "Meilleur suivi des acheteurs existants", chaine: "Pipeline plus actif et plus chaud" }, roiMultiplier: 0.2, highlight: false },
  ],
  7:  [ // Visites insuffisantes en volume
    { toolId: "coaching",  description: "Plan d'action visites : organisation, créneaux, relances acheteurs", roiDetail: { ratio: "Plus de visites organisées chaque semaine", chaine: "Plus d'offres potentielles" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "profiling", description: "Priorisez les acheteurs à emmener en visite", roiDetail: { ratio: "Visites avec les acheteurs les plus motivés", chaine: "Meilleur taux de conversion visite vers offre" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "training",  description: "Entraînement à l'organisation et la conduite de visite", roiDetail: { ratio: "Visites mieux préparées et plus efficaces", chaine: "Moins de visites sans suite" }, roiMultiplier: 0.2, highlight: false },
  ],
  8:  [ // Offres insuffisantes en volume
    { toolId: "coaching",  description: "Plan d'action : augmenter les visites et améliorer la conversion visite vers offre", roiDetail: { ratio: "Plus de visites et meilleure transformation", chaine: "Plus d'offres reçues chaque mois" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "training",  description: "Techniques de closing post-visite et déclenchement d'offre", roiDetail: { ratio: "Meilleur réflexe de closing après visite", chaine: "Moins de visites sans offre" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "juridique", description: "Préparez des modèles d'offre solides et conformes", roiDetail: { ratio: "Offres mieux structurées", chaine: "Acheteurs plus confiants pour se positionner" }, roiMultiplier: 0.2, highlight: false },
  ],
  9:  [ // Compromis insuffisants en volume
    { toolId: "coaching",  description: "Plan d'action : augmenter les offres et sécuriser leur transformation", roiDetail: { ratio: "Plus d'offres et meilleure conversion", chaine: "Plus de compromis signés" }, roiMultiplier: 0.4, highlight: true },
    { toolId: "juridique", description: "Sécurisez les conditions et la rédaction des compromis", roiDetail: { ratio: "Compromis juridiquement solides", chaine: "Moins d'offres qui tombent avant compromis" }, roiMultiplier: 0.35, highlight: false },
    { toolId: "training",  description: "Simulations de négociation et closing compromis", roiDetail: { ratio: "Meilleur taux de closing", chaine: "Négociations plus efficaces" }, roiMultiplier: 0.25, highlight: false },
  ],
  10: [ // Actes insuffisants en volume
    { toolId: "juridique", description: "Suivi juridique des dossiers : conditions suspensives, délais, blocages", roiDetail: { ratio: "Moins de compromis qui tombent avant l'acte", chaine: "Plus d'actes signés" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "coaching",  description: "Plan de suivi dossiers : anticipation, relance notaire, coordination", roiDetail: { ratio: "Dossiers mieux suivis jusqu'à l'acte", chaine: "Réduction des pertes en fin de chaîne" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "training",  description: "Gestion des blocages et accélération des dossiers", roiDetail: { ratio: "Meilleure gestion des situations complexes", chaine: "Délais réduits, actes sécurisés" }, roiMultiplier: 0.2, highlight: false },
  ],
  11: [ // CA compromis insuffisant
    { toolId: "coaching",  description: "Plan d'action global : volume + transformation sur toute la chaîne", roiDetail: { ratio: "Amélioration des volumes en amont", chaine: "Plus de compromis, CA en hausse" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "training",  description: "Renforcement des compétences commerciales sur les étapes clés", roiDetail: { ratio: "Meilleure efficacité à chaque étape", chaine: "Progression globale du CA" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "juridique", description: "Sécurisation des dossiers pour protéger le CA", roiDetail: { ratio: "Moins de pertes sur les dossiers en cours", chaine: "CA mieux sécurisé" }, roiMultiplier: 0.2, highlight: false },
  ],
  12: [ // CA acte insuffisant — identique à 11
    { toolId: "coaching",  description: "Plan d'action global : volume + transformation sur toute la chaîne", roiDetail: { ratio: "Amélioration des volumes en amont", chaine: "Plus d'actes, CA en hausse" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "training",  description: "Renforcement des compétences commerciales sur les étapes clés", roiDetail: { ratio: "Meilleure efficacité à chaque étape", chaine: "Progression globale du CA" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "juridique", description: "Sécurisation des dossiers pour protéger le CA", roiDetail: { ratio: "Moins de pertes sur les dossiers en cours", chaine: "CA mieux sécurisé" }, roiMultiplier: 0.2, highlight: false },
  ],
};

// Ratio steps (problème de transformation)
const ratioToolMap: Record<number, ToolEntry[]> = {
  2:  [ // Contacts → RDV
    { toolId: "coaching",  description: "Scripts d'appel et qualification de vos contacts", roiDetail: { ratio: "Amélioration du taux contacts → RDV", chaine: "Plus de RDV à volume de contacts constant" }, roiMultiplier: 0.4, highlight: false },
    { toolId: "profiling", description: "Adaptez votre approche au profil comportemental du prospect", roiDetail: { ratio: "Meilleure conversion sur les contacts profilés", chaine: "Approche personnalisée dès le premier contact" }, roiMultiplier: 0.35, highlight: true },
    { toolId: "training",  description: "Mises en situation d'appels avec feedback immédiat", roiDetail: { ratio: "Progression des réflexes de prise de RDV", chaine: "Prospection plus efficace au quotidien" }, roiMultiplier: 0.25, highlight: false },
  ],
  3:  [ // RDV → Estimation
    { toolId: "profiling", description: "Adaptez votre présentation au profil décisionnel du vendeur", roiDetail: { ratio: "Meilleur taux de conversion RDV → estimation", chaine: "Moins de RDV sans suite" }, roiMultiplier: 0.35, highlight: true },
    { toolId: "coaching",  description: "Travail sur l'argumentaire et la posture vendeur", roiDetail: { ratio: "Meilleure qualité du RDV estimation", chaine: "Plus d'estimations réalisées" }, roiMultiplier: 0.35, highlight: false },
    { toolId: "training",  description: "Simulations de RDV estimation avec débrief", roiDetail: { ratio: "Maîtrise du pitch estimation", chaine: "Moins de déperdition à cette étape" }, roiMultiplier: 0.3, highlight: false },
  ],
  4:  [ // Estimation → Mandat
    { toolId: "coaching",  description: "Argumentaire prix et techniques de closing mandat", roiDetail: { ratio: "Amélioration du taux estimation → mandat", chaine: "Plus de mandats à nombre d'estimations constant" }, roiMultiplier: 0.4, highlight: false },
    { toolId: "training",  description: "Simulations de transformation estimation → mandat", roiDetail: { ratio: "Meilleure maîtrise du closing vendeur", chaine: "Réduction de la déperdition à cette étape" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "formation", description: "Méthodologie ACV, book comparables, techniques de transformation", roiDetail: { ratio: "Montée en compétence structurelle", chaine: "Maîtrise durable du processus estimation → mandat" }, roiMultiplier: 0.3, highlight: false },
  ],
  5:  [ // % Exclusivité
    { toolId: "coaching",  description: "Argumentaire exclusivité personnalisé pour votre marché", roiDetail: { ratio: "Hausse du taux d'exclusivité", chaine: "Plus de mandats exclusifs, meilleur taux de vente" }, roiMultiplier: 0.4, highlight: false },
    { toolId: "training",  description: "Jeux de rôle requalification simple → exclusif", roiDetail: { ratio: "Confiance renforcée sur l'argumentation", chaine: "Plus de requalifications réussies" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "formation", description: "Plan marketing exclusif, témoignages, pitch structuré", roiDetail: { ratio: "Taux d'exclusivité > 50% visé sous 45 jours", chaine: "Portefeuille plus vendable" }, roiMultiplier: 0.3, highlight: false },
  ],
  7:  [ // Visites → Offre
    { toolId: "profiling", description: "Comprenez les motivations profondes de l'acheteur", roiDetail: { ratio: "Meilleure conversion visite → offre sur les acheteurs profilés", chaine: "Visites mieux ciblées, décision d'offre accélérée" }, roiMultiplier: 0.35, highlight: true },
    { toolId: "coaching",  description: "Techniques de qualification et de closing post-visite", roiDetail: { ratio: "Amélioration du taux visite → offre", chaine: "Plus d'offres à nombre de visites constant" }, roiMultiplier: 0.35, highlight: false },
    { toolId: "training",  description: "Simulations de visites et relances post-visite", roiDetail: { ratio: "Réflexes de closing visite renforcés", chaine: "Moins de visites sans suite" }, roiMultiplier: 0.3, highlight: false },
  ],
  8:  [ // Offres → Compromis
    { toolId: "juridique", description: "Sécurisez offres et conditions : clauses, délais, montage", roiDetail: { ratio: "Offres juridiquement solides, moins de refus", chaine: "Passage offre → compromis sécurisé" }, roiMultiplier: 0.35, highlight: true },
    { toolId: "coaching",  description: "Maîtrise du closing, gestion des objections, ancrage prix", roiDetail: { ratio: "Amélioration du taux offre → compromis", chaine: "Plus de compromis signés" }, roiMultiplier: 0.35, highlight: false },
    { toolId: "training",  description: "Simulations de négociation acheteur/vendeur", roiDetail: { ratio: "Réflexes de closing renforcés", chaine: "Moins de négociations qui échouent" }, roiMultiplier: 0.3, highlight: false },
  ],
  9:  [ // Compromis → Acte
    { toolId: "juridique", description: "Sécurisez le passage compromis → acte : suivi, conditions suspensives", roiDetail: { ratio: "Moins de compromis qui tombent avant l'acte", chaine: "Fluidification de la fin de chaîne" }, roiMultiplier: 0.5, highlight: true },
    { toolId: "coaching",  description: "Suivi de dossier et anticipation des blocages", roiDetail: { ratio: "Meilleur taux de conversion compromis → acte", chaine: "Plus d'actes signés" }, roiMultiplier: 0.3, highlight: false },
    { toolId: "formation", description: "Sécurisation juridique et suivi de transaction", roiDetail: { ratio: "Montée en compétence sur le suivi transactionnel", chaine: "Dossiers mieux suivis, moins de pertes" }, roiMultiplier: 0.2, highlight: false },
  ],
};

/**
 * Get relevant solutions for a given step, ordered by pertinence.
 * Volume steps → volumeToolMap, Ratio steps → ratioToolMap.
 * Falls back to generic if no specific mapping exists.
 */
function getSolutionsForRatio(stepNum: number, _area: FormationArea, isVolumeMode: boolean): SolutionForRatio[] {
  const entries = isVolumeMode
    ? (volumeToolMap[stepNum] ?? ratioToolMap[stepNum])
    : (ratioToolMap[stepNum] ?? volumeToolMap[stepNum]);

  if (!entries) {
    // Fallback: coaching + training
    return [
      { ...TOOL_BASE.coaching, description: "Accompagnement personnalisé sur cette problématique", roiDetail: { ratio: "Amélioration progressive", chaine: "Impact positif sur la chaîne" }, roiMultiplier: 0.5, highlight: false },
      { ...TOOL_BASE.training, description: "Entraînement ciblé avec feedback", roiDetail: { ratio: "Montée en compétence", chaine: "Meilleure performance" }, roiMultiplier: 0.5, highlight: false },
    ];
  }

  return entries.map((e) => ({
    ...TOOL_BASE[e.toolId],
    description: e.description,
    roiDetail: e.roiDetail,
    roiMultiplier: e.roiMultiplier,
    highlight: e.highlight,
  }));
}

// ── Simulation d'impact ROI — logique métier vendeur/mandat ─────────
//
// Tunnel vendeur :
//   contacts → RDV → mandats → split exclu/simple → ventes par type → CA
//
// Taux de transformation par type de mandat (règle métier fixe) :
//   - 1 mandat exclusif sur 2 aboutit à une vente
//   - 1 mandat simple sur 5 aboutit à une vente
//
// Tunnel acheteur :
//   visites → offres → compromis → actes
//
// Les ratios contacts→RDV, RDV→mandat, % exclu sont paramétrés par profil.

const TAUX_VENTE_EXCLU = 0.5;   // 1 exclu sur 2 → vente
const TAUX_VENTE_SIMPLE = 0.2;  // 1 simple sur 5 → vente

interface RatioImpact {
  ratioLabel: string;
  currentRatio: number;
  targetRatio: number;
  upstreamVolume: number;
  upstreamLabel: string;
  currentDownstream: number;
  projectedDownstream: number;
  deltaDownstream: number;
  downstreamLabel: string;
  deltaActes: number;
  deltaCA: number;
  isPct: boolean;
  propagation: Array<{ label: string; delta: number; unit?: string }>;
  avgCAperActe: number;
}

/**
 * Compute mandats → ventes using exclu/simple split + fixed conversion rates.
 */
function mandatsToVentes(mandats: number, pctExclu: number): {
  exclusifs: number; simples: number; ventesExclu: number; ventesSimples: number; totalVentes: number;
} {
  const exclusifs = Math.round(mandats * pctExclu / 100 * 10) / 10;
  const simples = Math.round((mandats - exclusifs) * 10) / 10;
  const ventesExclu = Math.round(exclusifs * TAUX_VENTE_EXCLU * 10) / 10;
  const ventesSimples = Math.round(simples * TAUX_VENTE_SIMPLE * 10) / 10;
  return { exclusifs, simples, ventesExclu, ventesSimples, totalVentes: Math.round((ventesExclu + ventesSimples) * 10) / 10 };
}

function computeRatioImpact(
  stepNum: number,
  currentVolumes: {
    contacts: number; rdvEstim: number; estimations: number; mandats: number;
    visites: number; offres: number; compromis: number; actes: number; ca: number;
    pctExclu: number;
  },
  targetRatioValue: number,
): RatioImpact | null {
  const v = currentVolumes;
  const avgCA = v.actes > 0 ? v.ca / v.actes : 8000;

  // Current ratios (input per 1 output)
  const curRatios = {
    contacts_rdv: v.rdvEstim > 0 ? v.contacts / v.rdvEstim : 15,
    rdv_mandat: v.mandats > 0 ? v.rdvEstim / v.mandats : 1.5,
    visites_offre: v.offres > 0 ? v.visites / v.offres : 10,
    offres_compromis: v.compromis > 0 ? v.offres / v.compromis : 2,
    compromis_acte: v.actes > 0 ? v.compromis / v.actes : 1.5,
  };

  // ── Tunnel vendeur : steps 2, 3, 4, 5 propagent via mandats → ventes ──

  // Steps 2-4: ratio improvement → more downstream → propagate to mandats → split → ventes → CA
  if (stepNum === 2 || stepNum === 3 || stepNum === 4) {
    const labels: Record<number, { label: string; upLabel: string; downLabel: string; upVol: number; curDown: number; curRatio: number }> = {
      2: { label: "Contacts \u2192 RDV", upLabel: "contacts", downLabel: "RDV", upVol: v.contacts, curDown: v.rdvEstim, curRatio: curRatios.contacts_rdv },
      3: { label: "RDV \u2192 Estimation", upLabel: "RDV", downLabel: "estimations", upVol: v.rdvEstim, curDown: v.estimations, curRatio: v.estimations > 0 ? v.rdvEstim / v.estimations : 1.5 },
      4: { label: "RDV \u2192 Mandat", upLabel: "RDV", downLabel: "mandats", upVol: v.rdvEstim, curDown: v.mandats, curRatio: curRatios.rdv_mandat },
    };
    const cfg = labels[stepNum];
    if (!cfg || cfg.upVol === 0) return null;

    const projectedDown = targetRatioValue > 0 ? cfg.upVol / targetRatioValue : cfg.curDown;
    const deltaDown = Math.round((projectedDown - cfg.curDown) * 10) / 10;
    if (deltaDown <= 0) return null;

    // Propagate delta downstream to mandats
    let deltaMandats = deltaDown;
    const propagation: Array<{ label: string; delta: number; unit?: string }> = [
      { label: cfg.downLabel, delta: deltaDown },
    ];

    if (stepNum === 2) {
      // +RDV → +mandats via rdv_mandat ratio
      deltaMandats = Math.round(deltaDown / curRatios.rdv_mandat * 10) / 10;
      propagation.push({ label: "mandats", delta: deltaMandats });
    }
    if (stepNum === 3) {
      // +estimations → +mandats (estimations → mandats is roughly 1:1 in this context since RDV~=estimations)
      deltaMandats = Math.round(deltaDown / (v.mandats > 0 ? v.estimations / v.mandats : 2) * 10) / 10;
      propagation.push({ label: "mandats", delta: deltaMandats });
    }

    // Split mandats → exclu/simple → ventes
    const split = mandatsToVentes(deltaMandats, v.pctExclu);
    propagation.push({ label: `${split.exclusifs} exclu + ${split.simples} simples`, delta: deltaMandats });
    propagation.push({ label: `ventes (${split.ventesExclu} exclu + ${split.ventesSimples} simples)`, delta: split.totalVentes });

    const cappedVentes = Math.min(split.totalVentes, 10);
    const deltaCA = Math.min(Math.round(cappedVentes * avgCA), 100000);
    propagation.push({ label: "CA", delta: deltaCA, unit: "€" });

    return {
      ratioLabel: cfg.label, currentRatio: cfg.curRatio, targetRatio: targetRatioValue,
      upstreamVolume: cfg.upVol, upstreamLabel: cfg.upLabel,
      currentDownstream: Math.round(cfg.curDown), projectedDownstream: Math.round(projectedDown),
      deltaDownstream: Math.round(deltaDown), downstreamLabel: cfg.downLabel,
      deltaActes: cappedVentes, deltaCA, isPct: false, propagation, avgCAperActe: Math.round(avgCA),
    };
  }

  // Step 5: % Exclusivité — more exclusifs means better conversion rate
  if (stepNum === 5) {
    if (v.mandats === 0) return null;
    const curSplit = mandatsToVentes(v.mandats, v.pctExclu);
    const projSplit = mandatsToVentes(v.mandats, targetRatioValue);
    const deltaVentes = Math.round((projSplit.totalVentes - curSplit.totalVentes) * 10) / 10;
    if (deltaVentes <= 0) return null;

    const cappedVentes = Math.min(deltaVentes, 10);
    const deltaCA = Math.min(Math.round(cappedVentes * avgCA), 100000);

    return {
      ratioLabel: "% Exclusivité", currentRatio: v.pctExclu, targetRatio: targetRatioValue,
      upstreamVolume: v.mandats, upstreamLabel: "mandats",
      currentDownstream: Math.round(curSplit.exclusifs), projectedDownstream: Math.round(projSplit.exclusifs),
      deltaDownstream: Math.round(projSplit.exclusifs - curSplit.exclusifs), downstreamLabel: "mandats exclusifs",
      deltaActes: cappedVentes, deltaCA, isPct: true,
      propagation: [
        { label: `${Math.round(projSplit.exclusifs)} exclu + ${Math.round(projSplit.simples)} simples`, delta: v.mandats },
        { label: `ventes (${projSplit.ventesExclu} exclu + ${projSplit.ventesSimples} simples)`, delta: projSplit.totalVentes },
        { label: `gain net : +${deltaVentes} ventes`, delta: deltaVentes },
      ],
      avgCAperActe: Math.round(avgCA),
    };
  }

  // ── Tunnel acheteur : steps 7, 8, 9 propagent linéairement ──

  if (stepNum === 7 || stepNum === 8 || stepNum === 9) {
    const acheteurConfigs: Record<number, { label: string; upLabel: string; downLabel: string; upVol: number; curDown: number; curRatio: number; propagateSteps: Array<{ ratioKey: string; label: string }> }> = {
      7: { label: "Visites \u2192 Offre", upLabel: "visites", downLabel: "offres", upVol: v.visites, curDown: v.offres, curRatio: curRatios.visites_offre,
        propagateSteps: [{ ratioKey: "offres_compromis", label: "compromis" }, { ratioKey: "compromis_acte", label: "actes" }] },
      8: { label: "Offres \u2192 Compromis", upLabel: "offres", downLabel: "compromis", upVol: v.offres, curDown: v.compromis, curRatio: curRatios.offres_compromis,
        propagateSteps: [{ ratioKey: "compromis_acte", label: "actes" }] },
      9: { label: "Compromis \u2192 Acte", upLabel: "compromis", downLabel: "actes", upVol: v.compromis, curDown: v.actes, curRatio: curRatios.compromis_acte,
        propagateSteps: [] },
    };

    const cfg = acheteurConfigs[stepNum];
    if (!cfg || cfg.upVol === 0) return null;

    const projectedDown = targetRatioValue > 0 ? cfg.upVol / targetRatioValue : cfg.curDown;
    const deltaDown = Math.round((projectedDown - cfg.curDown) * 10) / 10;
    if (deltaDown <= 0) return null;

    // Propagate through remaining steps
    let val = deltaDown;
    const propagation: Array<{ label: string; delta: number; unit?: string }> = [{ label: cfg.downLabel, delta: val }];
    for (const ps of cfg.propagateSteps) {
      const ratio = curRatios[ps.ratioKey as keyof typeof curRatios];
      if (ratio > 0) val = Math.round(val / ratio * 10) / 10;
      propagation.push({ label: ps.label, delta: val });
    }

    const cappedActes = Math.min(val, 10);
    const deltaCA = Math.min(Math.round(cappedActes * avgCA), 100000);

    return {
      ratioLabel: cfg.label, currentRatio: cfg.curRatio, targetRatio: targetRatioValue,
      upstreamVolume: cfg.upVol, upstreamLabel: cfg.upLabel,
      currentDownstream: Math.round(cfg.curDown), projectedDownstream: Math.round(projectedDown),
      deltaDownstream: Math.round(deltaDown), downstreamLabel: cfg.downLabel,
      deltaActes: cappedActes, deltaCA, isPct: false, propagation, avgCAperActe: Math.round(avgCA),
    };
  }

  return null;
}

/**
 * Pure helper exporté pour réutilisation : division arrondie au dixième,
 * avec garde-fou b=0. Utilisé pour calculer les ratios de transformation.
 */
export function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 10) / 10;
}

/**
 * Pure helper exporté pour réutilisation : formate une valeur avec son unité
 * (€ avec séparateur fr-FR, %, ou nombre brut).
 */
export function formatVal(v: number, unit?: string): string {
  if (unit === "€") return v.toLocaleString("fr-FR") + " €";
  if (unit === "%") return v + "%";
  return String(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical ratios computation — extracted for reuse (Vue Réseau v2.0 Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inputs nécessaires au calcul des 7 ratios de transformation de la chaîne.
 * Tous des entiers/percents agrégés sur le scope (individuel, équipe, agence
 * ou réseau).
 */
export interface ChainRatioInputs {
  /** Σ contacts totaux. */
  contacts: number;
  /** Σ RDV estimation. */
  rdvEstim: number;
  /** Σ estimations réalisées. */
  estimations: number;
  /** Σ mandats signés. */
  mandats: number;
  /** % exclusivité (0..100) — moyenne pondérée Σ exclusifs / Σ mandats × 100. */
  pctExclu: number;
  /** Σ visites réalisées. */
  visites: number;
  /** Σ offres reçues. */
  offres: number;
  /** Σ compromis signés. */
  compromis: number;
  /** Σ actes signés. */
  actes: number;
  /** Objectif % exclusivité (0..100) — utilisé pour le ratio num 5. */
  exclusiviteObjectif: number;
}

/**
 * Calcule les 7 ratios de transformation canoniques (numéros 2-9, saute 1, 6,
 * 10-12 qui sont volumes-only ou agrégats).
 *
 * Convention métier (alignée avec <ProductionChain> directeur) :
 * - `realise` = ratio inverse type (combien de "from" pour 1 "to") via safeDiv,
 *   sauf pour % Exclusivité (num 5) qui est un % direct.
 * - `objectif` = constantes métier hardcodées (15 contacts/RDV, 1.5 RDV/Estim,
 *   2 RDV/Mandat, 10 visites/offre, 2 offres/compromis, 1.5 compromis/acte),
 *   sauf % Exclusivité qui prend `exclusiviteObjectif`.
 * - `isLowerBetter: true` (moins = mieux) sauf % Exclusivité (plus = mieux).
 * - `realisePct` / `objectifPct` = % de transformation (plus = mieux),
 *   utilisés pour l'affichage uniquement, pas pour le status.
 * - `status` calculé sur (realise, objectif, isLowerBetter) via getStatus.
 *
 * Garde-fous division par zéro : `safeDiv(a, 0) = 0`. Pour les `realisePct`,
 * la condition `to > 0` protège la plupart des cas, sauf edge case où le
 * numérateur est non-zéro alors que le dénominateur est zéro (situation
 * théorique en données réelles, ignorée dans le directeur historique).
 */
export function computeChainRatios(inputs: ChainRatioInputs): StepRatio[] {
  const {
    contacts, rdvEstim, estimations, mandats, pctExclu,
    visites, offres, compromis, actes, exclusiviteObjectif,
  } = inputs;

  return [
    { num: 2, label: "Contacts → RDV", from: "contacts", to: "RDV", realise: safeDiv(contacts, rdvEstim), objectif: 15, realisePct: rdvEstim > 0 ? Math.round((rdvEstim / contacts) * 100) : 0, objectifPct: Math.round((1 / 15) * 100), isLowerBetter: true, status: "stable" as Status },
    { num: 3, label: "RDV → Estimation", from: "RDV", to: "estimation", realise: safeDiv(rdvEstim, estimations), objectif: 1.5, realisePct: estimations > 0 ? Math.round((estimations / rdvEstim) * 100) : 0, objectifPct: Math.round((1 / 1.5) * 100), isLowerBetter: true, status: "stable" as Status },
    { num: 4, label: "RDV → Mandat", from: "RDV", to: "mandat", realise: safeDiv(rdvEstim, mandats), objectif: 2, realisePct: mandats > 0 ? Math.round((mandats / rdvEstim) * 100) : 0, objectifPct: 50, isLowerBetter: true, status: "stable" as Status },
    { num: 5, label: "% Exclusivité", from: "mandats", to: "exclusifs", realise: pctExclu, objectif: exclusiviteObjectif, realisePct: pctExclu, objectifPct: exclusiviteObjectif, isLowerBetter: false, status: "stable" as Status },
    { num: 7, label: "Visites → Offre", from: "visites", to: "offre", realise: safeDiv(visites, offres), objectif: 10, realisePct: offres > 0 ? Math.round((offres / visites) * 100) : 0, objectifPct: 10, isLowerBetter: true, status: "stable" as Status },
    { num: 8, label: "Offres → Compromis", from: "offres", to: "compromis", realise: safeDiv(offres, compromis), objectif: 2, realisePct: compromis > 0 ? Math.round((compromis / offres) * 100) : 0, objectifPct: 50, isLowerBetter: true, status: "stable" as Status },
    { num: 9, label: "Compromis → Acte", from: "compromis", to: "acte", realise: safeDiv(compromis, actes), objectif: 1.5, realisePct: actes > 0 ? Math.round((actes / compromis) * 100) : 0, objectifPct: 67, isLowerBetter: true, status: "stable" as Status },
  ].map((r) => ({ ...r, status: getStatus(r.realise, r.objectif, r.isLowerBetter) }));
}

// ── Aggregate helper ─────────────────────────────────────────────────────────

function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  const b = results[0];
  return {
    ...b,
    prospection: {
      contactsTotaux: results.reduce((s, r) => s + r.prospection.contactsTotaux, 0),
      rdvEstimation: results.reduce((s, r) => s + r.prospection.rdvEstimation, 0),
    },
    vendeurs: {
      ...b.vendeurs,
      estimationsRealisees: results.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0),
      mandatsSignes: results.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: results.reduce((s, r) => s + r.vendeurs.rdvSuivi, 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + r.vendeurs.requalificationSimpleExclusif, 0),
      baissePrix: results.reduce((s, r) => s + r.vendeurs.baissePrix, 0),
    },
    acheteurs: {
      nombreVisites: results.reduce((s, r) => s + r.acheteurs.nombreVisites, 0),
      offresRecues: results.reduce((s, r) => s + r.acheteurs.offresRecues, 0),
      compromisSignes: results.reduce((s, r) => s + r.acheteurs.compromisSignes, 0),
      acheteursSortisVisite: results.reduce((s, r) => s + r.acheteurs.acheteursSortisVisite, 0),
      chiffreAffairesCompromis: results.reduce((s, r) => s + r.acheteurs.chiffreAffairesCompromis, 0),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + r.ventes.actesSignes, 0),
      chiffreAffaires: results.reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
    },
  };
}

// ── Props ────────────────────────────────────────────────────────────────────

/**
 * Mode de période passé en prop à <ProductionChain> et exporté pour réutilisation.
 * - "mois"   : valeurs du mois courant uniquement
 * - "ytd"    : Year-To-Date (cumul depuis janvier)
 * - "custom" : période personnalisée (combinée à periodMonths)
 */
export type PeriodMode = "mois" | "ytd" | "custom";

interface ProductionChainProps {
  scope: "individual" | "team" | "agency";
  userId?: string;
  teamId?: string;
  agencyId?: string;
  profile?: UserCategory;
  /** Override results data (e.g. YTD aggregated). When provided, skips internal result resolution. */
  resultsOverride?: PeriodResults | null;
  /** Number of months for objective scaling. 1 = monthly, 4 = Jan-Apr YTD, etc. Default: 1. */
  periodMonths?: number;
  /** Current period mode for label display */
  periodMode?: PeriodMode;
}

// ── Objectifs : GPS (Supabase) > Catégorie (constantes) ─────────────────────
//
// Résolution par métrique :
//   1. Si l'utilisateur a rempli le GPS onboarding cette année
//      → table `objectives`, champ `breakdown` (jsonb)
//      → on utilise la valeur GPS pour chaque métrique présente et > 0
//   2. Sinon, ou si une métrique GPS est absente / à 0
//      → fallback sur CATEGORY_OBJECTIVES[category] (Junior / Confirmé / Expert)
//
// Le GPS ne collecte pas offres, compromis, actes
// → ces 3 métriques tombent toujours en fallback catégorie.

interface GpsBreakdown {
  estimations?: number;
  mandats?: number;
  exclusivite?: number;
  visites?: number;
  ca?: number;
  offres?: number;
  compromis?: number;
  actes?: number;
}

/** Pour chaque métrique : GPS si > 0, sinon catégorie. */
function resolveObjectives(
  gps: GpsBreakdown | null,
  fallback: typeof CATEGORY_OBJECTIVES["confirme"],
) {
  if (!gps) return { source: "category" as const, values: fallback };

  const values = {
    estimations: (gps.estimations && gps.estimations > 0) ? gps.estimations : fallback.estimations,
    mandats:     (gps.mandats && gps.mandats > 0)         ? gps.mandats     : fallback.mandats,
    exclusivite: (gps.exclusivite && gps.exclusivite > 0) ? gps.exclusivite : fallback.exclusivite,
    visites:     (gps.visites && gps.visites > 0)         ? gps.visites     : fallback.visites,
    offres:      (gps.offres && gps.offres > 0)           ? gps.offres      : fallback.offres,
    compromis:   (gps.compromis && gps.compromis > 0)     ? gps.compromis   : fallback.compromis,
    actes:       (gps.actes && gps.actes > 0)             ? gps.actes       : fallback.actes,
    ca:          (gps.ca && gps.ca > 0)                   ? gps.ca          : fallback.ca,
  };

  return { source: "gps" as const, values };
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProductionChain({ scope, userId, teamId, profile: profileProp, resultsOverride, periodMonths = 1, periodMode = "mois" }: ProductionChainProps) {
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("nxt-chain-view", "volumes");
  const [gpsBreakdown, setGpsBreakdown] = useState<GpsBreakdown | null>(null);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const { getPlan, savePlan, updateActionStatus, updateActionNote } = usePlans();
  const router = useRouter();
  const { getActivePlan, getActivePlanForRatio, createPlan30j } = useImprovementResources();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { computedRatios } = useRatios(userId);
  const [boostToast, setBoostToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [boosting, setBoosting] = useState(false);

  const allResults = useAllResults();
  const individualResult = useResults(userId);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const category: UserCategory = profileProp ?? currentUser?.category ?? "confirme";
  const categoryObj = CATEGORY_OBJECTIVES[category];

  const navigateToPlan = () => router.push("/formation?tab=plan30");

  const handleBoostRatio = async (expertiseId: string) => {
    if (boosting) return;
    if (!individualResult) {
      setBoostToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }
    setBoosting(true);
    setBoostToast(null);
    try {
      const userHistory = allResults.filter((r) => r.userId === (userId ?? currentUser?.id));
      const measuredRatios = buildMeasuredRatios(computedRatios, individualResult);
      const profile = deriveProfileLevel(category);
      const avgCommissionEur = getAvgCommissionEur(agencyObjective?.avgActValue, userHistory);
      await createPlan30j({
        mode: "targeted",
        ratioId: expertiseId as Parameters<typeof createPlan30j>[0]["ratioId"],
        measuredRatios,
        profile,
        avgCommissionEur,
      });
      setBoostToast({ type: "success", message: "Plan 30 jours généré" });
      router.push("/formation?tab=plan30");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setBoostToast({
          type: "info",
          message: "Vous avez déjà un plan actif, voici votre plan actuel",
        });
        router.push("/formation?tab=plan30");
      } else if (msg.startsWith("NO_PAIN_POINT")) {
        setBoostToast({ type: "info", message: "Aucun ratio en sous-performance détecté" });
      } else {
        setBoostToast({ type: "error", message: "Erreur lors de la création du plan" });
      }
    } finally {
      setBoosting(false);
    }
  };

  const daysElapsedSince = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));

  // Charger les objectifs GPS depuis Supabase (scope individual uniquement)
  const targetUserId = scope === "individual" ? (userId ?? currentUser?.id) : null;
  useEffect(() => {
    if (isDemo || !targetUserId) return;
    const supabase = createClient();
    const currentYear = new Date().getFullYear();
    supabase.from("objectives").select("breakdown")
      .eq("user_id", targetUserId).eq("year", currentYear).single()
      .then(({ data }) => {
        if (data?.breakdown && typeof data.breakdown === "object") {
          const b = data.breakdown as unknown as Record<string, number>;
          // Au moins une métrique significative → considérer comme GPS valide
          if (b.estimations > 0 || b.mandats > 0 || b.ca > 0) {
            setGpsBreakdown(b as GpsBreakdown);
          }
        }
      });
  }, [isDemo, targetUserId]);

  // Résolution explicite : GPS > catégorie, par métrique
  const { source: objectifSource, values: obj } = useMemo(
    () => resolveObjectives(gpsBreakdown, categoryObj),
    [gpsBreakdown, categoryObj],
  );

  // Scope-based result (override takes priority)
  const scopedResult = useMemo((): PeriodResults | null => {
    if (resultsOverride !== undefined) return resultsOverride;
    if (scope === "individual") return individualResult;
    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      const teamUsers = users.filter((u) => u.role === "conseiller" && (isDemo ? u.teamId === tid : u.managerId === currentUser?.id));
      return aggregateResults(teamUsers.map((u) => allResults.find((r) => r.userId === u.id)).filter(Boolean) as PeriodResults[]);
    }
    if (scope === "agency") {
      const orgId = currentUser?.institutionId;
      const agencyUsers = users.filter((u) => (u.role === "conseiller" || u.role === "manager") && u.institutionId === orgId);
      return aggregateResults(agencyUsers.map((u) => allResults.find((r) => r.userId === u.id)).filter(Boolean) as PeriodResults[]);
    }
    return null;
  }, [scope, userId, teamId, individualResult, allResults, users, currentUser, isDemo, resultsOverride]);

  const headcount = useMemo(() => {
    if (scope === "individual") return 1;
    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      return users.filter((u) => u.role === "conseiller" && (isDemo ? u.teamId === tid : u.managerId === currentUser?.id)).length || 1;
    }
    return users.filter((u) => (u.role === "conseiller" || u.role === "manager") && u.institutionId === currentUser?.institutionId).length || 1;
  }, [scope, teamId, users, currentUser, isDemo]);

  // Extract values (0 if no data — always show objectives)
  const r = scopedResult;
  const contacts = r?.prospection.contactsTotaux ?? 0;
  const rdvEstim = r?.prospection.rdvEstimation ?? 0;
  const estimations = r?.vendeurs.estimationsRealisees ?? 0;
  const mandats = r?.vendeurs.mandatsSignes ?? 0;
  const mandatsExclu = r?.vendeurs.mandats.filter((m) => m.type === "exclusif").length ?? 0;
  const pctExclu = mandats > 0 ? Math.round((mandatsExclu / mandats) * 100) : 0;
  const acheteursSortis = r?.acheteurs.acheteursSortisVisite ?? 0;
  const visites = r?.acheteurs.nombreVisites ?? 0;
  const offres = r?.acheteurs.offresRecues ?? 0;
  const compromis = r?.acheteurs.compromisSignes ?? 0;
  const actes = r?.ventes.actesSignes ?? 0;
  const ca = r?.ventes.chiffreAffaires ?? 0;
  const caParActe = actes > 0 ? Math.round(ca / actes) : 0;

  // Volumes — objectifs mensuels × periodMonths × headcount
  // % Exclusivité is a percentage target, not a cumulative volume → no period scaling
  const pm = periodMonths;
  const volumes: StepVolume[] = [
    { num: 1, label: "Contacts totaux", realise: contacts, objectif: obj.estimations * 15 * pm * headcount },
    { num: 2, label: "RDV Estimation", realise: rdvEstim, objectif: obj.estimations * pm * headcount },
    { num: 3, label: "Estimations réalisées", realise: estimations, objectif: obj.estimations * pm * headcount },
    { num: 4, label: "Mandats signés", realise: mandats, objectif: obj.mandats * pm * headcount },
    { num: 5, label: "% Exclusivité", realise: pctExclu, objectif: obj.exclusivite, unit: "%" },
    { num: 6, label: "Acheteurs sortis", realise: acheteursSortis, objectif: obj.mandats * 2 * pm * headcount },
    { num: 7, label: "Visites réalisées", realise: visites, objectif: obj.visites * pm * headcount },
    { num: 8, label: "Offres reçues", realise: offres, objectif: obj.offres * pm * headcount },
    { num: 9, label: "Compromis signés", realise: compromis, objectif: obj.compromis * pm * headcount },
    { num: 10, label: "Actes signés", realise: actes, objectif: obj.actes * pm * headcount },
    { num: 11, label: "CA Compromis", realise: compromis > 0 ? Math.round(ca * (compromis / Math.max(1, actes))) : 0, objectif: obj.ca * pm * headcount, unit: "€" },
    { num: 12, label: "CA Acte", realise: ca, objectif: obj.ca * pm * headcount, unit: "€" },
  ];

  // Ratios — only real transformation steps (7 ratios). Définition canonique
  // extraite en `computeChainRatios` pour réutilisation côté Vue Réseau v2.0
  // (Phase 1 Task 3-bis). Exclus du tableau : Contacts entrants (num 1) =
  // volume only, Acheteurs chauds (num 6) = volume only, CA par Acte (num 12)
  // = pas un ratio de transformation.
  const ratios: StepRatio[] = computeChainRatios({
    contacts, rdvEstim, estimations, mandats, pctExclu,
    visites, offres, compromis, actes,
    exclusiviteObjectif: obj.exclusivite,
  });

  const showVolumes = viewMode === "volumes" || viewMode === "both";
  const showRatios = viewMode === "ratios" || viewMode === "both";

  // Summary counts — only from the 7 displayed ratios
  const surperfCount = ratios.filter((r) => r.status === "surperf").length;
  const stableCount = ratios.filter((r) => r.status === "stable").length;
  const sousperfCount = ratios.filter((r) => r.status === "sousperf").length;

  // Build visible steps for rendering
  const visibleSteps = volumes
    .map((vol) => {
      const ratio = ratios.find((r) => r.num === vol.num);
      if (viewMode === "ratios" && !ratio) return null;
      const volStatus = vol.unit === "%" ? getStatus(vol.realise, vol.objectif, false) : getVolumeStatus(vol.realise, vol.objectif);
      return { vol, ratio, status: ratio ? ratio.status : volStatus, volStatus };
    })
    .filter(Boolean) as Array<{ vol: StepVolume; ratio: StepRatio | undefined; status: Status; volStatus: Status }>;

  // Group into 3 phases for visual flow
  const phases = [
    { label: "Prospection", color: "#3375FF", steps: visibleSteps.filter((s) => s.vol.num <= 4) },
    { label: "Transformation", color: "#A055FF", steps: visibleSteps.filter((s) => s.vol.num >= 5 && s.vol.num <= 9) },
    { label: "Résultat", color: "#22c55e", steps: visibleSteps.filter((s) => s.vol.num >= 10) },
  ].filter((p) => p.steps.length > 0);

  const objLabel = objectifSource === "gps" ? "GPS" : CATEGORY_LABELS[category];
  const objPeriodTag = periodMode === "ytd" ? "obj. YTD" : periodMode === "custom" ? `obj. ${periodMonths} mois` : "obj. mensuel";

  return (
    <div className="space-y-4">
      {boostToast && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3",
            boostToast.type === "success" && "border-green-500/30 bg-green-500/5",
            boostToast.type === "error" && "border-red-500/30 bg-red-500/5",
            boostToast.type === "info" && "border-amber-500/30 bg-amber-500/5"
          )}
        >
          {boostToast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
          ) : boostToast.type === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          ) : (
            <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          )}
          <p className="flex-1 text-sm text-foreground">{boostToast.message}</p>
          <button
            type="button"
            onClick={() => setBoostToast(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Toggle + info */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["volumes", "ratios", "both"] as ViewMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setViewMode(m)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {m === "volumes" ? "Volumes" : m === "ratios" ? "Ratios" : "Les deux"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {scope !== "individual" && <>{headcount} collaborateur{headcount > 1 ? "s" : ""} · </>}
          Objectifs {objLabel} · {periodMode === "ytd" ? `${periodMonths} mois cumulés` : periodMode === "custom" ? `${periodMonths} mois` : "ce mois-ci"}
        </span>
      </div>

      {/* ═══ CHAIN FLOW ═══ */}
      <div className="space-y-1">
        {phases.map((phase, phaseIdx) => (
          <div key={phase.label}>
            {/* Phase header */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phase.color }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: phase.color }}>
                {phase.label}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Horizontal scroll flow */}
            <div className="flex gap-0 overflow-x-auto pb-4 px-0.5">
              {phase.steps.map((step, stepIdx) => {
                const { vol, ratio, volStatus } = step;
                const sc = STATUS_CONFIG[showRatios && ratio ? ratio.status : volStatus];
                const isLast = stepIdx === phase.steps.length - 1;

                return (
                  <div key={vol.num} className="flex items-stretch shrink-0">
                    {/* Step card */}
                    <div
                      className={cn(
                        "relative flex h-full w-[176px] flex-col rounded-xl bg-card p-3.5 transition-colors",
                        sc.borderClass,
                      )}
                    >
                      {/* Status pill */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {String(vol.num).padStart(2, "0")}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", sc.badgeBg, sc.text)}>
                          <sc.icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </div>

                      {/* Label */}
                      <p className="text-xs font-semibold text-foreground leading-snug mb-2">
                        {vol.label}
                      </p>

                      {/* Volume */}
                      {showVolumes && (
                        <div className="mb-2 flex flex-1 flex-col">
                          <span className="text-xl font-extrabold tabular-nums leading-none tracking-tight text-foreground">
                            {formatVal(vol.realise, vol.unit)}
                          </span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {objPeriodTag} {formatVal(vol.objectif, vol.unit)}
                            </span>
                            <span className={cn("text-[10px] font-bold tabular-nums", sc.text)}>
                              {vol.realise - vol.objectif >= 0 ? "+" : ""}
                              {formatVal(vol.realise - vol.objectif, vol.unit)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/40">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, vol.objectif > 0 ? (vol.realise / vol.objectif) * 100 : 0)}%`,
                                backgroundColor: sc.progressColor,
                              }}
                            />
                          </div>

                          {/* CTA volume — on volume-only cards in sousperf */}
                          {!ratio && volStatus === "sousperf" && scope === "individual" && volumeToArea[vol.num] && (() => {
                            const vMapping = volumeToArea[vol.num];
                            const expertiseId = RATIO_ID_TO_EXPERTISE_ID[vMapping.ratioId];
                            const planForThis = expertiseId ? getActivePlanForRatio(expertiseId) : null;
                            const anyActivePlan = getActivePlan();
                            const hasPlanForThis = !!planForThis;
                            const hasPlanForOther = !hasPlanForThis && !!anyActivePlan;
                            const jPlus = planForThis ? Math.min(30, daysElapsedSince(planForThis.created_at)) : 0;
                            const label = hasPlanForThis
                              ? `Reprendre mon plan (J+${jPlus}/30)`
                              : hasPlanForOther
                              ? "Voir mon plan actif"
                              : "Booster ce volume";
                            return (
                              <button
                                type="button"
                                disabled={boosting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasPlanForThis || hasPlanForOther) navigateToPlan();
                                  else if (expertiseId) handleBoostRatio(expertiseId);
                                }}
                                className={cn(
                                  "mt-auto w-full py-2 text-[11px] font-bold transition-all",
                                  hasPlanForThis || hasPlanForOther
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-red-500 text-white hover:bg-red-600",
                                  boosting && "opacity-60 cursor-not-allowed"
                                )}
                                style={{ borderRadius: "var(--radius-button)" }}
                              >
                                {label}
                              </button>
                            );
                          })()}
                        </div>
                      )}

                      {/* Ratio */}
                      {showRatios && ratio && (
                        <div className={cn("flex flex-1 flex-col", showVolumes && "border-t border-border/20 pt-2 mt-1")}>
                          <p className="text-[11px] leading-snug text-foreground">
                            <span className="font-bold tabular-nums">{ratio.realise}</span> {ratio.from} → 1 {ratio.to}
                            {ratio.realisePct > 0 && (
                              <span className="text-muted-foreground"> · {ratio.realisePct}%</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                            Obj. {objLabel} : {ratio.objectif} → 1
                            {ratio.objectifPct > 0 && <span> · {ratio.objectifPct}%</span>}
                          </p>

                          {/* CTA — visible on stable and sousperf ratios */}
                          {(ratio.status === "sousperf" || ratio.status === "stable") && scope === "individual" && (() => {
                            const mapping = chainRatioToArea[vol.num];
                            const expertiseId = mapping ? RATIO_ID_TO_EXPERTISE_ID[mapping.ratioId] : null;
                            const planForThis = expertiseId ? getActivePlanForRatio(expertiseId) : null;
                            const anyActivePlan = getActivePlan();
                            const hasPlanForThis = !!planForThis;
                            const hasPlanForOther = !hasPlanForThis && !!anyActivePlan;
                            const jPlus = planForThis ? Math.min(30, daysElapsedSince(planForThis.created_at)) : 0;
                            const label = hasPlanForThis
                              ? `Reprendre mon plan (J+${jPlus}/30)`
                              : hasPlanForOther
                              ? "Voir mon plan actif"
                              : "Améliorer ce ratio";
                            return (
                              <button
                                type="button"
                                disabled={boosting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasPlanForThis || hasPlanForOther) navigateToPlan();
                                  else if (expertiseId) handleBoostRatio(expertiseId);
                                }}
                                className={cn(
                                  "mt-auto w-full py-2 text-[11px] font-bold transition-all",
                                  hasPlanForThis || hasPlanForOther
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : ratio.status === "sousperf"
                                      ? "bg-red-500 text-white hover:bg-red-600"
                                      : "bg-orange-500 text-white hover:bg-orange-600",
                                  boosting && "opacity-60 cursor-not-allowed"
                                )}
                                style={{ borderRadius: "var(--radius-button)" }}
                              >
                                {label}
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Connector */}
                    {!isLast && (
                      <div className="flex items-center px-1 shrink-0">
                        <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-foreground/30">
                          <path d="M4 8 L10 8 M7 5 L11 8 L7 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ═══ ACTION PANEL — expands below the flow ═══ */}
            {phase.steps.some((s) => s.vol.num === expandedAction) && (() => {
              const step = phase.steps.find((s) => s.vol.num === expandedAction);
              if (!step) return null;

              // Resolve mapping: ratio card → chainRatioToArea, volume card → volumeToArea
              const mapping = step.ratio
                ? chainRatioToArea[step.vol.num]
                : volumeToArea[step.vol.num];
              if (!mapping) return null;

              const isVolumeMode = !step.ratio;
              const solutions = getSolutionsForRatio(step.vol.num, mapping.area, isVolumeMode);
              const ratioConfLocal = useAppStore.getState().ratioConfigs;
              const existingPlan = getPlan(mapping.ratioId);
              const volDiag = isVolumeMode ? (volumeToArea[step.vol.num]?.diagnostic ?? "") : "";

              // ROI concret : simulation d'impact
              // For ratio cards: use ratio improvement simulation
              // For volume cards: estimate CA gain from reaching volume objective
              const impact = step.ratio
                ? computeRatioImpact(
                    step.vol.num,
                    { contacts, rdvEstim, estimations, mandats, visites, offres, compromis, actes, ca, pctExclu },
                    step.ratio.objectif,
                  )
                : (() => {
                    // Volume mode: propagate delta through the real chain with actual ratios
                    const volDelta = step.vol.objectif - step.vol.realise;
                    if (volDelta <= 0) return null;
                    const avgCAVal = actes > 0 ? ca / actes : 8000;

                    // Current ratios (same as computeRatioImpact)
                    const cr = {
                      contacts_rdv: rdvEstim > 0 ? contacts / rdvEstim : 15,
                      rdv_estim: estimations > 0 ? rdvEstim / estimations : 1.5,
                      estim_mandat: mandats > 0 ? estimations / mandats : 2,
                      visites_offre: offres > 0 ? visites / offres : 10,
                      offres_compromis: compromis > 0 ? offres / compromis : 2,
                      compromis_acte: actes > 0 ? compromis / actes : 1.5,
                    };

                    // Map each volume step to its position in the chain and propagate forward
                    const chainSteps = [
                      { num: 1,  label: "contacts",    next: "rdv",         ratio: cr.contacts_rdv },
                      { num: 2,  label: "RDV",         next: "estimations", ratio: cr.rdv_estim },
                      { num: 3,  label: "estimations", next: "mandats",     ratio: cr.estim_mandat },
                      // 4 (mandats) → no direct chain to visites (different flow)
                      { num: 6,  label: "acheteurs",   next: "visites",     ratio: 3 },   // ~1 acheteur sur 3 génère des visites
                      { num: 7,  label: "visites",     next: "offres",      ratio: cr.visites_offre },
                      { num: 8,  label: "offres",      next: "compromis",   ratio: cr.offres_compromis },
                      { num: 9,  label: "compromis",   next: "actes",       ratio: cr.compromis_acte },
                      { num: 10, label: "actes",        next: "",            ratio: 1 },
                    ];

                    const startIdx = chainSteps.findIndex((s) => s.num === step.vol.num);
                    if (startIdx < 0) {
                      // CA cards (11, 12): simple — delta is already in €
                      return null;
                    }

                    // Propagate through remaining chain steps
                    let val = volDelta;
                    const propagationSteps: Array<{ label: string; delta: number }> = [
                      { label: chainSteps[startIdx].label, delta: Math.round(val * 10) / 10 },
                    ];

                    for (let i = startIdx; i < chainSteps.length; i++) {
                      if (!chainSteps[i].next) break;
                      const ratio = chainSteps[i].ratio;
                      if (ratio > 0) val = val / ratio;
                      // Find next step in chain
                      const nextStep = chainSteps.find((s) => s.label === chainSteps[i].next);
                      if (nextStep) {
                        propagationSteps.push({ label: nextStep.label, delta: Math.round(val * 100) / 100 });
                      }
                    }

                    // The last value is the delta in actes
                    let estDeltaActes = Math.round(val * 10) / 10;

                    // Guard rails: cap at reasonable values
                    estDeltaActes = Math.min(estDeltaActes, 10); // max 10 actes from a single volume improvement
                    const estDeltaCA = Math.min(Math.round(estDeltaActes * avgCAVal), 100000); // max 100k€

                    return {
                      ratioLabel: step.vol.label, currentRatio: step.vol.realise, targetRatio: step.vol.objectif,
                      upstreamVolume: 0, upstreamLabel: "", currentDownstream: step.vol.realise,
                      projectedDownstream: step.vol.objectif, deltaDownstream: volDelta,
                      downstreamLabel: step.vol.label, deltaActes: estDeltaActes, deltaCA: estDeltaCA, isPct: false,
                      propagation: propagationSteps,
                      avgCAperActe: Math.round(avgCAVal),
                    };
                  })();

              const handleGeneratePlan = () => {
                const priority: PlanPriority = {
                  ratioId: mapping.ratioId,
                  area: mapping.area,
                  label: mapping.areaLabel,
                  currentValue: step.ratio?.realise ?? step.vol.realise,
                  targetValue: step.ratio?.objectif ?? step.vol.objectif,
                  status: (step.ratio?.status === "sousperf" || step.volStatus === "sousperf") ? "danger" : "warning",
                };
                const plan = generatePlan30Days([priority], ratioConfLocal);
                savePlan(mapping.ratioId, plan);
              };

              const cycleStatus = (actionId: string, current: ActionStatus) => {
                const next: ActionStatus = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
                updateActionStatus(mapping.ratioId, actionId, next);
              };

              const statusIcon = (s: ActionStatus) =>
                s === "done" ? "✅" : s === "in_progress" ? "🔄" : "⬜";
              const statusLabel = (s: ActionStatus) =>
                s === "done" ? "Terminé" : s === "in_progress" ? "En cours" : "À faire";

              // Plan stats
              const planActions = existingPlan?.weeks.flatMap((w) => w.actions) ?? [];
              const planDone = planActions.filter((a) => a.status === "done").length;
              const planInProgress = planActions.filter((a) => a.status === "in_progress").length;
              const planTotal = planActions.length;
              const planPct = planTotal > 0 ? Math.round((planDone / planTotal) * 100) : 0;

              return (
                <div className="rounded-xl border border-border bg-card p-4 mb-2 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {isVolumeMode ? `Booster : ${step.vol.label}` : `Améliorer : ${step.ratio!.label}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isVolumeMode
                          ? `${volDiag} — ${mapping.areaLabel}`
                          : `${mapping.areaLabel} — Actuellement ${step.ratio!.realise} pour 1, objectif ${step.ratio!.objectif} pour 1`
                        }
                      </p>
                    </div>
                    <button type="button" onClick={() => setExpandedAction(null)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </button>
                  </div>

                  {/* ═══ ROI — Projection si objectif atteint ═══ */}
                  {impact && impact.deltaDownstream > 0 && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">{"Projection si objectif atteint"}</p>

                      {/* Ratio : actuel → cible */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="text-center">
                            <p className="text-[8px] text-muted-foreground mb-0.5">{"Actuel"}</p>
                            <span className="rounded-lg bg-red-500/10 px-2 py-1 font-bold text-red-500">
                              {impact.isPct ? `${impact.currentRatio}%` : `${impact.currentRatio} pour 1`}
                            </span>
                          </div>
                          <span className="text-muted-foreground mt-3">{"\u2192"}</span>
                          <div className="text-center">
                            <p className="text-[8px] text-muted-foreground mb-0.5">{"Objectif"}</p>
                            <span className="rounded-lg bg-green-500/10 px-2 py-1 font-bold text-green-600">
                              {impact.isPct ? `${impact.targetRatio}%` : `${impact.targetRatio} pour 1`}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-3">
                          {impact.ratioLabel}
                        </span>
                      </div>

                      {/* 3 colonnes : actuel / cible / gain incrémental */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg bg-card border border-border p-2.5">
                          <p className="text-[9px] text-muted-foreground uppercase">{impact.downstreamLabel}</p>
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {impact.currentDownstream} {"\u2192"} {impact.projectedDownstream}
                          </p>
                          <p className="text-[10px] font-bold text-green-600 tabular-nums">
                            {"gain : +"}{impact.deltaDownstream} {impact.downstreamLabel}
                          </p>
                        </div>

                        {impact.deltaActes > 0 && (
                          <div className="rounded-lg bg-card border border-border p-2.5">
                            <p className="text-[9px] text-muted-foreground uppercase">{"Ventes si objectif atteint"}</p>
                            <p className="text-sm font-bold text-foreground tabular-nums">
                              +{impact.deltaActes < 1 ? impact.deltaActes.toFixed(1) : Math.round(impact.deltaActes)} {"ventes"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{"à volumes constants"}</p>
                          </div>
                        )}

                        {impact.deltaCA > 0 && (
                          <div className="rounded-lg bg-card border border-green-500/30 p-2.5">
                            <p className="text-[9px] text-muted-foreground uppercase">{"CA si objectif atteint"}</p>
                            <p className="text-sm font-bold text-green-600 tabular-nums">
                              +{impact.deltaCA.toLocaleString("fr-FR")} {"€"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{`honoraires moyens : ${impact.avgCAperActe.toLocaleString("fr-FR")} €/acte`}</p>
                          </div>
                        )}
                      </div>

                      {/* Détail de la propagation */}
                      {impact.propagation && impact.propagation.length > 1 && (
                        <div className="rounded-lg bg-card border border-border p-3">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-2">{"Détail du calcul"}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {impact.propagation.map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600 tabular-nums">
                                  {"unit" in p && p.unit === "€" ? `+${p.delta.toLocaleString("fr-FR")} €` : `+${p.delta < 1 ? p.delta.toFixed(1) : Math.round(p.delta)} ${p.label}`}
                                </span>
                                {i < impact.propagation.length - 1 && (
                                  <span className="text-muted-foreground text-xs">{"\u2192"}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[9px] text-muted-foreground italic">
                        {"Projection théorique si l'objectif est atteint, à volumes et autres ratios constants. Honoraires basés sur votre moyenne réelle."}
                      </p>
                    </div>
                  )}

                  {/* Plan 30 jours — Offert */}
                  {!existingPlan ? (
                    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                            <span className="text-lg">{"\uD83D\uDCC5"}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-foreground">Plan 30 jours</p>
                              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase">Offert</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              4 semaines d&apos;actions terrain + exercices ciblés sur {mapping.areaLabel.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={handleGeneratePlan}
                          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                          Générer mon plan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-primary/30 bg-card space-y-0 overflow-hidden">
                      {/* Plan header with progress */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">Mon plan 30 jours</p>
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-600 uppercase">Offert</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-medium text-green-500">{planDone} terminé{planDone > 1 ? "s" : ""}</span>
                            <span>·</span>
                            <span className="font-medium text-amber-500">{planInProgress} en cours</span>
                            <span>·</span>
                            <span>{planTotal - planDone - planInProgress} à faire</span>
                          </div>
                          <button type="button" onClick={handleGeneratePlan}
                            className="text-[10px] text-muted-foreground hover:text-foreground">Régénérer</button>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mx-4 mb-3 h-1.5 rounded-full bg-border/50 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${planPct}%` }} />
                      </div>

                      {/* Weeks with clickable actions */}
                      {existingPlan.weeks.map((week) => (
                        <div key={week.weekNumber} className="border-t border-border/50 px-4 py-3">
                          <p className="text-[10px] font-bold text-primary uppercase mb-2">Semaine {week.weekNumber}</p>
                          <div className="space-y-1">
                            {week.actions.map((action) => {
                              const isExpanded = expandedActionId === action.id;
                              return (
                                <div key={action.id}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                                    className={cn(
                                      "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                                      action.status === "done" && "opacity-60",
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); cycleStatus(action.id, action.status); }}
                                      className="mt-0.5 shrink-0 text-sm leading-none"
                                      title={statusLabel(action.status)}
                                    >
                                      {statusIcon(action.status)}
                                    </button>
                                    <span className={cn(
                                      "text-[11px] leading-snug",
                                      action.status === "done" ? "text-muted-foreground line-through" : "text-foreground"
                                    )}>
                                      {action.label}
                                    </span>
                                    <span className={cn(
                                      "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                                      action.status === "done" ? "bg-green-500/10 text-green-500"
                                        : action.status === "in_progress" ? "bg-orange-500/10 text-orange-500"
                                          : "bg-muted text-muted-foreground"
                                    )}>
                                      {statusLabel(action.status)}
                                    </span>
                                  </button>
                                  {/* Expanded action detail */}
                                  {isExpanded && (
                                    <div className="ml-7 mr-2 mt-1 mb-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-foreground">Statut :</span>
                                        <div className="flex gap-1">
                                          {(["todo", "in_progress", "done"] as ActionStatus[]).map((s) => (
                                            <button key={s} type="button"
                                              onClick={() => cycleStatus(action.id, action.status === s ? (s === "todo" ? "todo" : s === "in_progress" ? "todo" : "in_progress") : (() => { updateActionStatus(mapping.ratioId, action.id, s); return s; })() as never)}
                                              className="sr-only" />
                                          ))}
                                          {(["todo", "in_progress", "done"] as ActionStatus[]).map((s) => (
                                            <button key={s} type="button"
                                              onClick={() => updateActionStatus(mapping.ratioId, action.id, s)}
                                              className={cn(
                                                "rounded-full px-2 py-0.5 text-[9px] font-bold transition-colors",
                                                action.status === s
                                                  ? s === "done" ? "bg-green-500 text-white" : s === "in_progress" ? "bg-amber-500 text-white" : "bg-muted-foreground text-white"
                                                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                                              )}>
                                              {statusLabel(s)}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-bold text-foreground">Note :</span>
                                        <textarea
                                          value={action.note ?? ""}
                                          onChange={(e) => updateActionNote(mapping.ratioId, action.id, e.target.value)}
                                          placeholder="Ajouter une note..."
                                          rows={2}
                                          className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                                        />
                                      </div>
                                      {/* Lien outil externe si pertinent */}
                                      {(() => {
                                        const tool = getToolForAction(action.label);
                                        if (!tool) return null;
                                        return (
                                          <a
                                            href={tool.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors w-fit"
                                          >
                                            Ouvrir {tool.label}
                                            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M7 3H4M7 3v3" /></svg>
                                          </a>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {week.exercice && (
                            <div className="mt-2 flex items-center gap-2">
                              <p className="text-[10px] text-primary font-medium">{week.exercice}</p>
                              <a
                                href="https://train-my-agent.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20 transition-colors"
                              >
                                Ouvrir Training
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M7 3H4M7 3v3" /></svg>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Autres solutions — 5 produits */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Solutions de progression</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {solutions.map((sol) => (
                        <div key={sol.id} className={cn(
                          "rounded-xl border p-3 space-y-2 transition-colors",
                          sol.highlight
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border bg-muted/30 hover:border-primary/30"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{sol.icon}</span>
                              <p className="text-xs font-bold text-foreground">{sol.name}</p>
                            </div>
                            {sol.highlight && (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold text-primary uppercase">{"Recommandé"}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-snug">{sol.description}</p>

                          {/* ROI structuré en 3 lignes */}
                          {(() => {
                            const toolCA = impact && impact.deltaCA > 0 ? Math.round(impact.deltaCA * sol.roiMultiplier) : 0;
                            return (
                              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-2 space-y-1">
                                <div className="flex items-start gap-1.5">
                                  <span className="text-green-500 text-[9px] mt-px shrink-0">{"▲"}</span>
                                  <p className="text-[9px] text-foreground leading-snug"><span className="font-bold text-green-600">Ratio </span>{sol.roiDetail.ratio}</p>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-green-500 text-[9px] mt-px shrink-0">{"→"}</span>
                                  <p className="text-[9px] text-foreground leading-snug"><span className="font-bold text-green-600">{"Chaîne "}</span>{sol.roiDetail.chaine}</p>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <span className="text-green-500 text-[9px] mt-px shrink-0">{"€"}</span>
                                  <p className="text-[9px] text-foreground leading-snug">
                                    <span className="font-bold text-green-600">CA </span>
                                    {toolCA > 0
                                      ? <span className="font-bold text-green-700">{`+${toolCA.toLocaleString("fr-FR")} € si objectif atteint`}</span>
                                      : <span className="text-muted-foreground">{"Impact indirect sur le CA"}</span>
                                    }
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Prix + CTA */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                            <span className={cn(
                              "text-[11px] font-bold",
                              sol.cost === "Selon financement" ? "text-muted-foreground" : "text-foreground"
                            )}>{sol.cost}</span>
                            {sol.url && (
                              <a
                                href={sol.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                              >
                                {"Ouvrir l'outil"}
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M7 3H4M7 3v3" /></svg>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Phase connector */}
            {phaseIdx < phases.length - 1 && (
              <div className="flex justify-center py-2">
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-foreground/25">
                  <path d="M8 3 L8 11 M5 8 L8 12 L11 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary bar */}
      {showRatios && (
        <div className="flex items-center justify-center gap-8 py-3 text-xs" style={{ borderRadius: "var(--radius-card)", background: "var(--surface-2, var(--muted))" }}>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="font-semibold text-green-500 tabular-nums">Surperf : {surperfCount}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="font-semibold text-amber-500 tabular-nums">Stable : {stableCount}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-red-500 tabular-nums">Sous-perf : {sousperfCount}</span>
          </span>
        </div>
      )}
    </div>
  );
}
