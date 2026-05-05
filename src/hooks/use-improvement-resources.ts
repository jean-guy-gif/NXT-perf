"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import {
  PLAN_30J_DURATION_DAYS,
  DEBRIEF_OFFERED_EXPIRY_DAYS,
  type Plan30jPayload,
} from "@/config/coaching";
import {
  detectBiggestPainPoint,
  FEASIBILITY_SCORE,
  type MeasuredRatio,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import {
  generatePlan30j,
  planToPayload,
  type GeneratedPlan30j,
} from "@/lib/plan-30-jours";
import type { ExpertiseRatioId, ProfileLevel } from "@/data/ratio-expertise";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import {
  getAdapter,
  type ImprovementResourcesAdapter,
} from "@/lib/improvement-resources-adapters";
import { useAdvisorOverride } from "@/contexts/advisor-override-context";

// Re-export the shared row type so existing consumers of this hook keep working.
export type { ImprovementResource } from "@/lib/improvement-resources-adapters";
import type { ImprovementResource } from "@/lib/improvement-resources-adapters";

export interface CreatePlanInput {
  mode: "auto" | "targeted";
  ratioId?: ExpertiseRatioId;
  measuredRatios: MeasuredRatio[];
  profile: ProfileLevel;
  avgCommissionEur: number;
}

/**
 * PR3.7.9 — broadcast cross-instances. Toute mutation d'une ressource (plan
 * ou nxt_coaching) émet cet event. Toutes les instances du hook
 * `useImprovementResources` montées ailleurs dans l'app l'écoutent et
 * déclenchent leur propre `refresh()` — garantit que le sidebar badge,
 * ContinuityBlock, PersistentPlanBanner se synchronisent immédiatement
 * avec la mutation faite dans Plan30Jours.
 *
 * No-op côté serveur (SSR).
 */
const RESOURCES_MUTATED_EVENT = "nxt:plan-resources-mutated";

function broadcastResourcesMutated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RESOURCES_MUTATED_EVENT));
}

// ─── Hook principal ───────────────────────────────────────────────────

export function useImprovementResources() {
  const user = useAppStore((s) => s.user);
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const { advisorId } = useAdvisorOverride();
  const [resources, setResources] = useState<ImprovementResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PR3.8.5 — Sous un AdvisorOverrideProvider (mode Manager → Individuel),
  // l'override prend le pas sur l'utilisateur courant : les plans/ressources
  // lus et créés ciblent alors le conseiller sélectionné.
  const userId = advisorId ?? user?.id;

  const refresh = useCallback(async () => {
    if (!userId) {
      setResources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const adapter = getAdapter(isDemoMode);

    let rows: ImprovementResource[];
    try {
      // PR3.5 : on inclut les archivés pour exposer l'historique complet à
      // Ma Progression (Bloc Historique + ROI cumulé). Les filtres "actif"
      // sont appliqués côté getters dérivés (getActivePlan, etc.).
      rows = await adapter.list(userId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return;
    }

    // Lazy expiration : check plan_30j > 30j
    const now = new Date();
    const plansToExpire = rows.filter(
      (r) =>
        r.resource_type === "plan_30j" &&
        r.status === "active" &&
        r.expires_at &&
        new Date(r.expires_at) < now
    );

    if (plansToExpire.length > 0) {
      await handlePlanExpiration(plansToExpire, userId, adapter);
      const refreshed = await adapter.list(userId, true);
      setResources(refreshed);
    } else {
      setResources(rows);
    }

    setLoading(false);
  }, [userId, isDemoMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * PR3.7.9 — Broadcast cross-instances.
   *
   * Plusieurs composants consomment ce hook en parallèle (Plan30Jours,
   * PlanProgressBadge sidebar, ContinuityBlock, PersistentPlanBanner). Chaque
   * instance a son propre cache `resources`. Quand l'un mute (toggle action),
   * les autres ne le voient pas — d'où des compteurs qui restent désynchros.
   *
   * Solution minimale : un custom event window que toute mutation émet, et
   * que toute instance écoute pour déclencher son propre refresh.
   *
   * Évite : nouveau store global, refactor de l'API du hook, dépendance
   * Zustand cross-cutting.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      refresh();
    };
    window.addEventListener(RESOURCES_MUTATED_EVENT, handler);
    return () => {
      window.removeEventListener(RESOURCES_MUTATED_EVENT, handler);
    };
  }, [refresh]);

  // ─── Getters utilitaires ─────────────────────────────────────────

  /** Tous les plans 30j (actif + completed + expired + archived). */
  const allPlans = useMemo<ImprovementResource[]>(
    () => resources.filter((r) => r.resource_type === "plan_30j"),
    [resources]
  );

  /** Plans archivés uniquement (archived_at !== null). */
  const archivedPlans = useMemo<ImprovementResource[]>(
    () => allPlans.filter((p) => p.archived_at !== null),
    [allPlans]
  );

  const getActivePlan = useCallback((): ImprovementResource | null => {
    return (
      resources.find(
        (r) =>
          r.resource_type === "plan_30j" &&
          r.status === "active" &&
          r.archived_at === null
      ) ?? null
    );
  }, [resources]);

  const getActivePlanForRatio = useCallback(
    (ratioId: ExpertiseRatioId): ImprovementResource | null => {
      return (
        resources.find(
          (r) =>
            r.resource_type === "plan_30j" &&
            r.status === "active" &&
            r.pain_ratio_id === ratioId
        ) ?? null
      );
    },
    [resources]
  );

  const getNxtCoachingResource = useCallback((): ImprovementResource | null => {
    return (
      resources.find((r) => r.resource_type === "nxt_coaching") ?? null
    );
  }, [resources]);

  // ─── Créer un plan 30j (auto ou targeted) ────────────────────────

  const createPlan30j = useCallback(
    async (input: CreatePlanInput): Promise<GeneratedPlan30j> => {
      if (!userId) throw new Error("User not authenticated");

      // Blocage (µQ2 option C) : refuser si plan actif
      const existingActive = getActivePlan();
      if (existingActive) {
        throw new Error(
          `PLAN_ACTIVE_ALREADY: un plan est deja actif (${existingActive.pain_ratio_id}). Terminez-le ou attendez son expiration.`
        );
      }

      // Détection de la douleur ciblée
      let painPoint: PainPointResult | null;
      if (input.mode === "auto") {
        painPoint = detectBiggestPainPoint(
          input.measuredRatios,
          input.profile,
          input.avgCommissionEur
        );
      } else {
        if (!input.ratioId) {
          throw new Error("targeted mode requires ratioId");
        }
        const measured = input.measuredRatios.find(
          (m) => m.expertiseId === input.ratioId
        );
        if (!measured) {
          throw new Error(
            `Ratio ${input.ratioId} not found in measured ratios`
          );
        }
        const expertise = RATIO_EXPERTISE[input.ratioId];
        const target = expertise.thresholds[input.profile];
        // Mode "targeted" : V2 dérivé de l'expertise (chantier A.1).
        const feasibilityScore = FEASIBILITY_SCORE[expertise.feasibility];
        const chainScore = expertise.chainPosition;
        painPoint = {
          expertiseId: input.ratioId,
          expertise,
          currentValue: measured.currentValue,
          targetValue: target,
          normalizedGap:
            Math.abs(measured.currentValue - target) / (target || 1),
          estimatedCaLossEur: 0,
          painScore: 0,
          painScoreV2: 0.4 * chainScore + 0.2 * feasibilityScore,
          impactScoreNormalized: 0,
          chainScore,
          feasibilityScore,
        };
      }

      if (!painPoint) {
        throw new Error(
          "NO_PAIN_POINT: aucun ratio en sous-performance detecte"
        );
      }

      const plan = generatePlan30j(painPoint);
      const payload: Plan30jPayload = {
        ...planToPayload(plan),
        baseline_ratio_value: painPoint.currentValue,
        baseline_captured_at: new Date().toISOString(),
      };

      const adapter = getAdapter(isDemoMode);
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + PLAN_30J_DURATION_DAYS * 24 * 60 * 60 * 1000
      );

      await adapter.insert({
        user_id: userId,
        resource_type: "plan_30j",
        status: "active",
        payload: payload as unknown as Record<string, unknown>,
        pain_ratio_id: painPoint.expertiseId,
        pain_score: painPoint.painScore,
        expires_at: expiresAt.toISOString(),
      });

      await refresh();
      broadcastResourcesMutated();
      return plan;
    },
    [userId, isDemoMode, getActivePlan, refresh]
  );

  const updateResource = useCallback(
    async (id: string, patch: Partial<ImprovementResource>): Promise<void> => {
      const adapter = getAdapter(isDemoMode);
      await adapter.update(id, patch);
      await refresh();
      broadcastResourcesMutated();
    },
    [isDemoMode, refresh]
  );

  // Demo-only: archive the full plan bundle (plan_30j + nxt_coaching)
  // so a new plan can be generated without waiting for the 30-day cycle.
  const resetPlan = useCallback(async (): Promise<void> => {
    if (!userId) throw new Error("User not authenticated");

    const adapter = getAdapter(isDemoMode);
    const rows = await adapter.list(userId);
    const now = new Date().toISOString();

    for (const row of rows) {
      if (row.archived_at !== null) continue;

      if (row.resource_type === "plan_30j") {
        await adapter.update(row.id, {
          status: "expired",
          archived_at: now,
        });
      } else if (row.resource_type === "nxt_coaching") {
        await adapter.update(row.id, {
          status: "cancelled",
          archived_at: now,
        });
      }
    }

    await refresh();
    broadcastResourcesMutated();
  }, [userId, isDemoMode, refresh]);

  const getArchivedPlanById = useCallback(
    async (planId: string): Promise<ImprovementResource | null> => {
      if (!userId) return null;
      const adapter = getAdapter(isDemoMode);
      const all = await adapter.list(userId, true);
      return all.find((r) => r.id === planId) ?? null;
    },
    [userId, isDemoMode]
  );

  return {
    resources,
    loading,
    error,
    refresh,
    allPlans,
    archivedPlans,
    getActivePlan,
    getActivePlanForRatio,
    getNxtCoachingResource,
    createPlan30j,
    updateResource,
    getArchivedPlanById,
    resetPlan,
  };
}

// ─── Helper : expiration lazy + trigger debrief offert ────────────────

async function handlePlanExpiration(
  expiredPlans: ImprovementResource[],
  userId: string,
  adapter: ImprovementResourcesAdapter
): Promise<void> {
  const now = new Date();
  const debriefExpiresAt = new Date(
    now.getTime() + DEBRIEF_OFFERED_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Fetch fresh rows once to resolve existing nxt_coaching
  const allRows = await adapter.list(userId);

  for (const plan of expiredPlans) {
    // 1. Passer le plan en expired + archiver
    await adapter.update(plan.id, {
      status: "expired",
      archived_at: now.toISOString(),
    });

    // 2. Créer ou update la ressource nxt_coaching en debrief_offered
    const existingCoaching = allRows.find(
      (r) => r.resource_type === "nxt_coaching"
    );

    if (existingCoaching) {
      await adapter.update(existingCoaching.id, {
        status: "debrief_offered",
        expires_at: debriefExpiresAt.toISOString(),
        debrief_offered_count:
          (existingCoaching.debrief_offered_count ?? 0) + 1,
        payload: {
          ...(existingCoaching.payload as Record<string, unknown>),
          debrief_offered_at: now.toISOString(),
          source_plan_id: plan.id,
        },
      });
    } else {
      await adapter.insert({
        user_id: userId,
        resource_type: "nxt_coaching",
        status: "debrief_offered",
        expires_at: debriefExpiresAt.toISOString(),
        debrief_offered_count: 1,
        payload: {
          debrief_offered_at: now.toISOString(),
          source_plan_id: plan.id,
        },
      });
    }
  }
}
