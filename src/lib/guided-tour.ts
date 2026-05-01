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
    title: "Bienvenue dans NXT Performance",
    description: "Découvrez la méthode en 4 étapes : Diagnostic → Améliorer → Progression → Comparaison. Vous pouvez passer cette visite à tout moment.",
  },
  {
    target: '[href="/conseiller/diagnostic"]',
    title: "Mon diagnostic",
    description: "Voici votre point critique du mois — chiffré en € de gain potentiel sur 30 jours. C'est votre point de départ.",
    navigateTo: "/conseiller/diagnostic",
  },
  {
    target: '[href="/conseiller/ameliorer"]',
    title: "M'améliorer",
    description: "Lancez un plan 30 jours sur votre levier prioritaire. Catalogue formations + financement CERFA intégrés.",
    navigateTo: "/conseiller/ameliorer",
  },
  {
    target: '[href="/conseiller/progression"]',
    title: "Ma progression",
    description: "Suivez votre ROI cumulé, l'évolution de votre CA vs marché et votre DPI mensuel.",
    navigateTo: "/conseiller/progression",
  },
  {
    target: '[href="/conseiller/comparaison"]',
    title: "Ma comparaison",
    description: "Comparez-vous à un confrère, un profil expert, le classement NXT ou un DPI.",
    navigateTo: "/conseiller/comparaison",
  },
  {
    target: '[data-tour="floating-copilote"]',
    title: "Copilote ambiant",
    description: "Bientôt : votre assistant ambiant pour pré-remplir votre saisie hebdomadaire et répondre à vos questions.",
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
    target: '[href="/manager/comparaison"]',
    title: "Ma Comparaison",
    description: "Ici, tu compares ton équipe à une autre, tu situes ton agence vs le réseau NXT et tu visualises le classement de tes collaborateurs.",
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
  // Prioritize: reseau > directeur > manager > conseiller
  if (mainRole === "reseau" || availableRoles.includes("reseau")) return "reseau";
  if (mainRole === "directeur" || availableRoles.includes("directeur")) return "directeur";
  if (mainRole === "manager" || availableRoles.includes("manager")) return "manager";
  return "conseiller";
}
