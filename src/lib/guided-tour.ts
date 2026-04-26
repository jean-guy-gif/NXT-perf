import type { UserRole } from "@/types/user";

// ── Tour step definition ──

export interface TourStep {
  /** CSS selector for the target element (optional — if absent, centered modal) */
  target?: string;
  /** Short title */
  title: string;
  /** Description text */
  description: string;
  /** Sidebar nav href to navigate to before highlighting (optional) */
  navigateTo?: string;
}

// ── Tour state persistence ──

const TOUR_STORAGE_KEY = "nxt-guided-tour";

export type TourStatus = "unseen" | "completed" | "skipped";

interface TourState {
  [role: string]: TourStatus;
}

export function getTourStatus(role: UserRole): TourStatus {
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return "unseen";
    const state: TourState = JSON.parse(raw);
    return state[role] ?? "unseen";
  } catch {
    return "unseen";
  }
}

export function setTourStatus(role: UserRole, status: TourStatus): void {
  try {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    const state: TourState = raw ? JSON.parse(raw) : {};
    state[role] = status;
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fail silently
  }
}

/** Persist tour completion to Supabase (best-effort, non-blocking) */
export async function persistTourCompleted(userId: string): Promise<void> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("profiles").update({ tour_completed: true }).eq("id", userId);
  } catch { /* best-effort */ }
}

export function resetTourStatus(role: UserRole): void {
  setTourStatus(role, "unseen");
}

// ── Tour steps per role ──

const conseillerSteps: TourStep[] = [
  {
    title: "Bienvenue sur NXT Performance",
    description: "Cette visite rapide te présente les principales fonctionnalités de ton espace conseiller. Tu peux la passer à tout moment.",
  },
  {
    target: '[href="/dashboard"]',
    title: "Ta saisie d'activité",
    description: "Chaque lundi, un bilan rapide te permet de saisir ton activité : contacts, estimations, mandats, visites, offres, compromis et actes.",
  },
  {
    target: '[href="/dashboard"]',
    title: "Ton tableau de bord",
    description: "Ici, tu retrouves une vue synthétique de tes résultats : KPI, évolution du CA, répartition des mandats et progression mensuelle.",
  },
  {
    target: '[href="/performance"]',
    title: "Ta performance",
    description: "Ici, tu suis ta performance à travers tes 7 ratios clés. Chaque ratio t'indique si tu es conforme, en attention ou en zone critique.",
  },
  {
    target: '[href="/formation"]',
    title: "Ta formation",
    description: "Ici, tu identifies tes axes de progression prioritaires et les formations recommandées en fonction de tes ratios.",
  },
];

const managerSteps: TourStep[] = [
  {
    title: "Bienvenue sur NXT Performance",
    description: "Cette visite rapide te présente les principales fonctionnalités de ton espace manager. Tu peux la passer à tout moment.",
  },
  {
    target: '[href="/manager/dashboard"]',
    title: "Ton cockpit manager",
    description: "Ici, tu suis les résultats de ton équipe en un coup d'oeil : KPI collectifs, suivi des contacts et acheteurs chauds, alertes de performance.",
  },
  {
    target: '[href="/manager/equipe"]',
    title: "Gestion d'équipe",
    description: "Ici, tu gères la composition de ton équipe, tu consultes le détail de chaque conseiller et tu partages le code d'invitation.",
  },
  {
    target: '[href="/manager/classement"]',
    title: "Classement",
    description: "Ici, tu visualises le classement de tes conseillers et tu identifies les meilleurs performers et les axes de progression.",
  },
  {
    target: '[href="/manager/formation"]',
    title: "Ma Formation",
    description: "Ici, tu identifies les priorités de formation pour ton équipe en fonction des faiblesses collectives détectées par les ratios.",
  },
];

const directeurSteps: TourStep[] = [
  {
    title: "Bienvenue sur NXT Performance",
    description: "Cette visite rapide te présente les principales fonctionnalités de ton espace directeur. Tu peux la passer à tout moment.",
  },
  {
    target: '[href="/directeur/pilotage"]',
    title: "Pilotage agence",
    description: "Ici, tu visualises la performance globale de ton agence : objectifs, réalisé, écart et projection sur chaque indicateur clé.",
  },
  {
    target: '[href="/directeur/equipes"]',
    title: "Vue équipes",
    description: "Ici, tu compares les résultats de tes équipes et tu identifies les leviers prioritaires de pilotage par manager.",
  },
  {
    target: '[href="/directeur/performance"]',
    title: "Performance globale",
    description: "Ici, tu analyses la performance détaillée de chaque collaborateur et tu accèdes aux ratios individuels.",
  },
  {
    target: '[href="/directeur/pilotage-financier"]',
    title: "Pilotage financier",
    description: "Ici, tu pilotes la rentabilité de ton agence : commissions, charges, seuil de rentabilité et projections financières.",
  },
  {
    target: '[href="/directeur/formation-collective"]',
    title: "Formation collective",
    description: "Ici, tu identifies les axes de formation prioritaires à l'échelle de l'agence pour améliorer la performance globale.",
  },
];

const coachSteps: TourStep[] = [
  {
    title: "Bienvenue sur NXT Performance",
    description: "Cette visite rapide te présente les principales fonctionnalités de ton espace coach. Tu peux la passer à tout moment.",
  },
  {
    target: '[href="/coach/dashboard"]',
    title: "Ton portefeuille clients",
    description: "Ici, tu retrouves tous les clients que tu accompagnes : agences, managers et agents. Tu visualises leur score, leurs volumes et leurs alertes.",
  },
  {
    title: "Clients prioritaires",
    description: "Les clients avec des alertes critiques ou un score faible remontent automatiquement en priorité pour t'aider à prioriser ton coaching.",
  },
  {
    title: "Détail individuel",
    description: "En cliquant sur un client, tu accèdes à son détail complet : diagnostic, ratios, volumes, progression et outils de coaching (notes, sessions, plan d'action).",
  },
];

const reseauSteps: TourStep[] = [
  {
    title: "Bienvenue sur NXT Performance",
    description: "Cette visite rapide te présente les principales fonctionnalités de ton espace réseau. Tu peux la passer à tout moment.",
  },
  {
    target: '[href="/reseau/dashboard"]',
    title: "Tableau de bord réseau",
    description: "Ici, tu visualises la performance consolidée de l'ensemble de tes agences : KPI globaux, classement des agences, alertes et top performers.",
  },
  {
    title: "Comparaison des agences",
    description: "Tu peux comparer les agences entre elles sur les indicateurs clés : CA, mandats, exclusivité, offres et score global.",
  },
  {
    title: "Détail agence",
    description: "En cliquant sur une agence, tu accèdes à son détail complet : résultats, équipes, collaborateurs et benchmark vs réseau.",
  },
];

export function getTourSteps(role: UserRole): TourStep[] {
  switch (role) {
    case "conseiller":
      return conseillerSteps;
    case "manager":
      return managerSteps;
    case "directeur":
      return directeurSteps;
    case "coach":
      return coachSteps;
    case "reseau":
      return reseauSteps;
    default:
      return conseillerSteps;
  }
}

/**
 * Determine which role's tour to show based on the user's primary/main role.
 * For multi-role users (e.g. directeur who is also manager+conseiller),
 * show the tour for their highest-level role.
 */
export function getTourRole(availableRoles: UserRole[], mainRole: UserRole): UserRole {
  // Prioritize: reseau > directeur > manager > coach > conseiller
  if (mainRole === "reseau" || availableRoles.includes("reseau")) return "reseau";
  if (mainRole === "directeur" || availableRoles.includes("directeur")) return "directeur";
  if (mainRole === "coach" || (availableRoles.includes("coach") && !availableRoles.includes("manager"))) return "coach";
  if (mainRole === "manager" || availableRoles.includes("manager")) return "manager";
  return "conseiller";
}
