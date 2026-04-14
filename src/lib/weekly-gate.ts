import type { PeriodResults } from "@/types/results";
import type { ExtractedFields, ExtractedArrays } from "@/lib/saisie-ai-client";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Pure business logic for the weekly performance gate.
 *
 * Rules:
 * - demo mode → gate always shown
 * - Friday → gate if no submission this week
 * - Monday → gate if Friday was missed (catchup)
 * - Tuesday–Thursday, Saturday, Sunday → no gate
 * - Only roles "conseiller" and "manager" see the gate
 *
 * Manager notifications:
 * - Monday, if an agent has no submission for last week → notification
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type GateContext = "demo" | "friday_required" | "monday_catchup" | "none";

export type WeeklySubmissionStatus = "done" | "pending" | "overdue";

export interface WeeklyGateInput {
  /** Is the app in demo mode? */
  isDemo: boolean;
  /** Is the dev ?gate=1 query param set? (dev only) */
  isDevForced: boolean;
  /** User's primary role */
  role: string;
  /** ISO date string (YYYY-MM-DD) of the last weekly submission, or null */
  lastWeeklySubmissionDate: string | null;
  /** The date to evaluate against (defaults to today) */
  today?: Date;
}

export interface WeeklyGateResult {
  /** Should the gate be shown? */
  showGate: boolean;
  /** Context for the gate */
  context: GateContext;
  /** Weekly submission status */
  submissionStatus: WeeklySubmissionStatus;
  /** Should the "complete my entry" button be shown on the dashboard? */
  showResumeButton: boolean;
}

export interface ManagerNotificationInput {
  /** ISO date string of agent's last weekly submission, or null */
  agentLastSubmissionDate: string | null;
  /** The date to evaluate against (defaults to today) */
  today?: Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Monday of the week containing `date`, as YYYY-MM-DD */
export function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

/** Returns the Friday of the week containing `date`, as YYYY-MM-DD */
export function getFridayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 5); // Monday + 4 = Friday
  return d.toISOString().split("T")[0];
}

/** Returns the Sunday of the week containing `date`, as YYYY-MM-DD */
export function getSundayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 7); // Monday + 6 = Sunday
  return d.toISOString().split("T")[0];
}

/** Check if a submission date falls within the same ISO week as `reference` */
function isSubmissionThisWeek(submissionDate: string | null, reference: Date): boolean {
  if (!submissionDate) return false;
  const refMonday = getMondayOfWeek(reference);
  const subMonday = getMondayOfWeek(new Date(submissionDate));
  return refMonday === subMonday;
}

/** Check if a submission date falls within the previous ISO week relative to `reference` */
function isSubmissionLastWeek(submissionDate: string | null, reference: Date): boolean {
  if (!submissionDate) return false;
  const prevWeek = new Date(reference);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevMonday = getMondayOfWeek(prevWeek);
  const subMonday = getMondayOfWeek(new Date(submissionDate));
  return prevMonday === subMonday;
}

// ── Core logic ───────────────────────────────────────────────────────────────

export function getWeeklyGateState(input: WeeklyGateInput): WeeklyGateResult {
  const today = input.today ?? new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // ── Dev force mode (dev env only) ────────────────────────────────────
  if (input.isDevForced) {
    return {
      showGate: true,
      context: "friday_required",
      submissionStatus: "pending",
      showResumeButton: true,
    };
  }

  // ── Demo mode → always show gate ─────────────────────────────────────
  if (input.isDemo) {
    return {
      showGate: true,
      context: "demo",
      submissionStatus: "pending",
      showResumeButton: false,
    };
  }

  // ── Role check ───────────────────────────────────────────────────────
  if (input.role !== "conseiller" && input.role !== "manager") {
    return { showGate: false, context: "none", submissionStatus: "done", showResumeButton: false };
  }

  const hasSubmittedThisWeek = isSubmissionThisWeek(input.lastWeeklySubmissionDate, today);

  // ── If already submitted this week → done ────────────────────────────
  if (hasSubmittedThisWeek) {
    return { showGate: false, context: "none", submissionStatus: "done", showResumeButton: false };
  }

  // ── Friday (day 5) → required ────────────────────────────────────────
  if (dayOfWeek === 5) {
    return {
      showGate: true,
      context: "friday_required",
      submissionStatus: "pending",
      showResumeButton: true,
    };
  }

  // ── Monday (day 1) → catchup if Friday was missed ───────────────────
  if (dayOfWeek === 1) {
    // Check if last week had a submission (the Friday that just passed)
    const hasSubmittedLastWeek = isSubmissionLastWeek(input.lastWeeklySubmissionDate, today);
    if (!hasSubmittedLastWeek) {
      return {
        showGate: true,
        context: "monday_catchup",
        submissionStatus: "overdue",
        showResumeButton: true,
      };
    }
    return { showGate: false, context: "none", submissionStatus: "done", showResumeButton: false };
  }

  // ── Tuesday–Thursday, Saturday, Sunday → no gate ─────────────────────
  // But show resume button if pending
  const isPending = !hasSubmittedThisWeek;
  return {
    showGate: false,
    context: "none",
    submissionStatus: isPending ? "pending" : "done",
    showResumeButton: isPending && (dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek >= 2),
  };
}

// ── Manager notification logic ───────────────────────────────────────────────

export function shouldNotifyManager(input: ManagerNotificationInput): boolean {
  const today = input.today ?? new Date();
  const dayOfWeek = today.getDay();

  // Only notify on Monday
  if (dayOfWeek !== 1) return false;

  // Check if agent submitted last week
  return !isSubmissionLastWeek(input.agentLastSubmissionDate, today);
}

// ── Convert extracted data → PeriodResults ───────────────────────────────────

export function convertExtractedToPeriodResults(
  userId: string,
  fields: ExtractedFields,
  arrays: ExtractedArrays,
): PeriodResults {
  const now = new Date();
  const iso = now.toISOString();

  return {
    id: generateId(),
    userId,
    periodType: "week",
    periodStart: getMondayOfWeek(now),
    periodEnd: getSundayOfWeek(now),
    prospection: {
      contactsTotaux: fields.contactsTotaux ?? 0,
      rdvEstimation: fields.rdvEstimation ?? 0,
    },
    vendeurs: {
      rdvEstimation: fields.rdvEstimation ?? 0,
      estimationsRealisees: fields.estimationsRealisees ?? 0,
      // mandatsSignes = nombre d'occurrences typées saisies
      mandatsSignes: (fields.mandatsTypes ?? []).length,
      mandats: (fields.mandatsTypes ?? []).map((type) => ({
        id: generateId(),
        type,
      })),
      rdvSuivi: fields.rdvSuivi ?? 0,
      requalificationSimpleExclusif: fields.requalificationSimpleExclusif ?? 0,
      baissePrix: fields.baissePrix ?? 0,
    },
    acheteurs: {
      acheteursSortisVisite: fields.acheteursSortisVisite ?? 0,
      nombreVisites: fields.nombreVisites ?? 0,
      offresRecues: fields.offresRecues ?? 0,
      compromisSignes: fields.compromisSignes ?? 0,
      chiffreAffairesCompromis: fields.chiffreAffairesCompromis ?? 0,
    },
    ventes: {
      actesSignes: fields.actesSignes ?? 0,
      chiffreAffaires: fields.chiffreAffaires ?? 0,
    },
    createdAt: iso,
    updatedAt: iso,
  };
}
