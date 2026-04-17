"use client";

import { useCallback, useMemo } from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAppStore } from "@/stores/app-store";
import type { Plan30Days, ActionStatus } from "@/lib/plan-30-jours";
import type { RatioId } from "@/types/ratios";

export type PlanStatus = "actif" | "termine" | "expire";

export interface PlanWithMeta {
  ratioId: RatioId;
  plan: Plan30Days;
  status: PlanStatus;
  createdAt: Date;
  endsAt: Date;
  daysRemaining: number;
  totalActions: number;
  doneActions: number;
  inProgressActions: number;
  progressPct: number;
}

function computePlanMeta(ratioId: RatioId, plan: Plan30Days): PlanWithMeta {
  const createdAt = new Date(plan.generatedAt);
  const endsAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const allActions = plan.weeks.flatMap((w) => w.actions);
  const totalActions = allActions.length;
  const doneActions = allActions.filter((a) => a.status === "done").length;
  const inProgressActions = allActions.filter((a) => a.status === "in_progress").length;
  const progressPct = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

  let status: PlanStatus;
  if (daysRemaining > 0) {
    status = progressPct === 100 ? "termine" : "actif";
  } else {
    status = progressPct === 100 ? "termine" : "expire";
  }

  return {
    ratioId, plan, status, createdAt, endsAt, daysRemaining,
    totalActions, doneActions, inProgressActions, progressPct,
  };
}

/** Generate automatic feedback for a completed or expired plan */
export function generatePlanFeedback(meta: PlanWithMeta): {
  title: string;
  summary: string;
  doneList: string[];
  missedList: string[];
  recommendation: string;
} {
  const allActions = meta.plan.weeks.flatMap((w) => w.actions);
  const doneList = allActions.filter((a) => a.status === "done").map((a) => a.label);
  const missedList = allActions.filter((a) => a.status !== "done").map((a) => a.label);
  const area = meta.plan.priorities[0]?.label ?? "Performance";

  const pct = meta.progressPct;
  let title: string;
  let summary: string;
  let recommendation: string;

  if (pct === 100) {
    title = `Plan ${area} terminé avec succès`;
    summary = `Vous avez réalisé ${meta.doneActions}/${meta.totalActions} actions en 30 jours. Excellente discipline.`;
    recommendation = `Continuez sur cette lancée. Un nouveau plan peut consolider vos acquis et cibler le ratio suivant.`;
  } else if (pct >= 70) {
    title = `Plan ${area} — bon avancement`;
    summary = `${meta.doneActions}/${meta.totalActions} actions réalisées (${pct}%). Quelques actions restent à finaliser.`;
    recommendation = `Finalisez les ${missedList.length} actions restantes cette semaine, puis passez au ratio suivant.`;
  } else if (pct >= 40) {
    title = `Plan ${area} — avancement partiel`;
    summary = `${meta.doneActions}/${meta.totalActions} actions réalisées (${pct}%). Le rythme peut être amélioré.`;
    recommendation = `Concentrez-vous sur 1 à 2 actions par jour. Un coaching ciblé peut vous aider à accélérer.`;
  } else {
    title = `Plan ${area} — à relancer`;
    summary = `${meta.doneActions}/${meta.totalActions} actions réalisées (${pct}%). Le plan n'a pas pu être mené à terme.`;
    recommendation = `Régénérez un nouveau plan adapté à votre rythme, ou envisagez un coaching pour vous accompagner.`;
  }

  return { title, summary, doneList, missedList, recommendation };
}

export function usePlans() {
  const userId = useAppStore((s) => s.user?.id) ?? "anonymous";
  const [plans, setPlans] = usePersistedState<Record<string, Plan30Days>>(
    `nxt-plans-30j-${userId}`,
    {}
  );

  const savePlan = useCallback(
    (ratioId: RatioId, plan: Plan30Days) => {
      setPlans((prev) => ({ ...prev, [ratioId]: plan }));
    },
    [setPlans]
  );

  const getPlan = useCallback(
    (ratioId: RatioId): Plan30Days | null => {
      return plans[ratioId] ?? null;
    },
    [plans]
  );

  const updateActionStatus = useCallback(
    (ratioId: RatioId, actionId: string, status: ActionStatus) => {
      setPlans((prev) => {
        const plan = prev[ratioId];
        if (!plan) return prev;
        return {
          ...prev,
          [ratioId]: {
            ...plan,
            weeks: plan.weeks.map((week) => ({
              ...week,
              actions: week.actions.map((a) =>
                a.id === actionId ? { ...a, status, done: status === "done" } : a
              ),
            })),
          },
        };
      });
    },
    [setPlans]
  );

  const updateActionNote = useCallback(
    (ratioId: RatioId, actionId: string, note: string) => {
      setPlans((prev) => {
        const plan = prev[ratioId];
        if (!plan) return prev;
        return {
          ...prev,
          [ratioId]: {
            ...plan,
            weeks: plan.weeks.map((week) => ({
              ...week,
              actions: week.actions.map((a) =>
                a.id === actionId ? { ...a, note } : a
              ),
            })),
          },
        };
      });
    },
    [setPlans]
  );

  const deletePlan = useCallback(
    (ratioId: RatioId) => {
      setPlans((prev) => {
        const next = { ...prev };
        delete next[ratioId];
        return next;
      });
    },
    [setPlans]
  );

  // All plans with computed metadata
  const plansWithMeta: PlanWithMeta[] = useMemo(
    () => Object.entries(plans).map(([ratioId, plan]) =>
      computePlanMeta(ratioId as RatioId, plan)
    ),
    [plans]
  );

  const activePlans = plansWithMeta.filter((p) => p.status === "actif");
  const terminatedPlans = plansWithMeta.filter((p) => p.status === "termine");
  const expiredPlans = plansWithMeta.filter((p) => p.status === "expire");

  // Global stats
  const totalActions = plansWithMeta.reduce((s, p) => s + p.totalActions, 0);
  const doneActions = plansWithMeta.reduce((s, p) => s + p.doneActions, 0);
  const inProgressActions = plansWithMeta.reduce((s, p) => s + p.inProgressActions, 0);

  return {
    plans,
    plansWithMeta,
    activePlans,
    terminatedPlans,
    expiredPlans,
    savePlan,
    getPlan,
    updateActionStatus,
    updateActionNote,
    deletePlan,
    totalActions,
    doneActions,
    inProgressActions,
    // Keep backward compat
    allPlans: plansWithMeta,
  };
}
