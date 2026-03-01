import type { Plan30Days } from "@/lib/plan-30-jours";

const PLAN_KEY = "nxt-plan-30-jours";
const AGEFICE_KEY = "nxt-agefice-draft";

// ─── Plan 30 jours ───────────────────────────────────────────────────

export function savePlan(plan: Plan30Days): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    // quota exceeded or private browsing
  }
}

export function loadPlan(): Plan30Days | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Plan30Days;
  } catch {
    return null;
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(PLAN_KEY);
  } catch {
    // ignore
  }
}

// ─── AGEFICE Draft ───────────────────────────────────────────────────

export interface AgeficeDraft {
  statut: "independant" | "salarie" | "";
  cotisantAgefice: "oui" | "non" | "ne_sais_pas" | "";
  organisme: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  formationChoisie: string;
  datesSouhaitees: string;
}

export const emptyAgeficeDraft: AgeficeDraft = {
  statut: "",
  organisme: "Start Academy",
  cotisantAgefice: "",
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  formationChoisie: "",
  datesSouhaitees: "",
};

export function saveAgeficeDraft(data: AgeficeDraft): void {
  try {
    localStorage.setItem(AGEFICE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or private browsing
  }
}

export function loadAgeficeDraft(): AgeficeDraft | null {
  try {
    const raw = localStorage.getItem(AGEFICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgeficeDraft;
  } catch {
    return null;
  }
}

export function clearAgeficeDraft(): void {
  try {
    localStorage.removeItem(AGEFICE_KEY);
  } catch {
    // ignore
  }
}
