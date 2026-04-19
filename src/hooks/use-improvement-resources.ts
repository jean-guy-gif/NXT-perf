"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import {
  PLAN_30J_DURATION_DAYS,
  DEBRIEF_OFFERED_EXPIRY_DAYS,
  type Plan30jPayload,
} from "@/config/coaching";
import {
  detectBiggestPainPoint,
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

// ─── Hook principal ───────────────────────────────────────────────────

export function useImprovementResources() {
  const user = useAppStore((s) => s.user);
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const [resources, setResources] = useState<ImprovementResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

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
      rows = await adapter.list(userId);
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
      const refreshed = await adapter.list(userId);
      setResources(refreshed);
    } else {
      setResources(rows);
    }

    setLoading(false);
  }, [userId, isDemoMode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Getters utilitaires ─────────────────────────────────────────

  const getActivePlan = useCallback((): ImprovementResource | null => {
    return (
      resources.find(
        (r) => r.resource_type === "plan_30j" && r.status === "active"
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
        painPoint = {
          expertiseId: input.ratioId,
          expertise,
          currentValue: measured.currentValue,
          targetValue: target,
          normalizedGap:
            Math.abs(measured.currentValue - target) / (target || 1),
          estimatedCaLossEur: 0,
          painScore: 0,
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
      return plan;
    },
    [userId, isDemoMode, getActivePlan, refresh]
  );

  const updateResource = useCallback(
    async (id: string, patch: Partial<ImprovementResource>): Promise<void> => {
      const adapter = getAdapter(isDemoMode);
      await adapter.update(id, patch);
      await refresh();
    },
    [isDemoMode, refresh]
  );

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
    getActivePlan,
    getActivePlanForRatio,
    getNxtCoachingResource,
    createPlan30j,
    updateResource,
    getArchivedPlanById,
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
