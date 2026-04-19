"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import {
  PLAN_30J_DURATION_DAYS,
  DEBRIEF_OFFERED_EXPIRY_DAYS,
  type ImprovementResourceStatus,
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

// ─── Types ────────────────────────────────────────────────────────────

export interface ImprovementResource {
  id: string;
  user_id: string;
  resource_type: "plan_30j" | "nxt_coaching" | "nxt_training" | "agefice";
  status: ImprovementResourceStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  archived_at: string | null;
  pain_ratio_id: string | null;
  pain_score: number | null;
  debrief_offered_count: number;
}

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
  const [resources, setResources] = useState<ImprovementResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  // Fetch + lazy expiration check
  const refresh = useCallback(async () => {
    if (!userId) {
      setResources([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from("user_improvement_resources")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as ImprovementResource[];

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
      await handlePlanExpiration(plansToExpire, userId);
      // Re-fetch après expiration
      const { data: refreshed } = await supabase
        .from("user_improvement_resources")
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null);
      setResources((refreshed ?? []) as ImprovementResource[]);
    } else {
      setResources(rows);
    }

    setLoading(false);
  }, [userId]);

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
        // Mode targeted : construire un PainPointResult pour le ratio demandé
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

      // Génération du plan
      const plan = generatePlan30j(painPoint);
      const payload: Plan30jPayload = planToPayload(plan);

      // Insertion BDD
      const supabase = createClient();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + PLAN_30J_DURATION_DAYS * 24 * 60 * 60 * 1000
      );

      const { error: insertError } = await supabase
        .from("user_improvement_resources")
        .insert({
          user_id: userId,
          resource_type: "plan_30j",
          status: "active",
          payload: payload as unknown as Record<string, unknown>,
          pain_ratio_id: painPoint.expertiseId,
          pain_score: painPoint.painScore,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        throw new Error(`Failed to create plan: ${insertError.message}`);
      }

      await refresh();
      return plan;
    },
    [userId, getActivePlan, refresh]
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
  };
}

// ─── Helper : expiration lazy + trigger debrief offert ────────────────

async function handlePlanExpiration(
  expiredPlans: ImprovementResource[],
  userId: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date();
  const debriefExpiresAt = new Date(
    now.getTime() + DEBRIEF_OFFERED_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  for (const plan of expiredPlans) {
    // 1. Passer le plan en expired + archiver
    await supabase
      .from("user_improvement_resources")
      .update({
        status: "expired",
        archived_at: now.toISOString(),
      })
      .eq("id", plan.id);

    // 2. Créer ou update la ressource nxt_coaching en debrief_offered
    const { data: existingCoaching } = await supabase
      .from("user_improvement_resources")
      .select("*")
      .eq("user_id", userId)
      .eq("resource_type", "nxt_coaching")
      .is("archived_at", null)
      .maybeSingle();

    if (existingCoaching) {
      // Incrémenter le compteur
      await supabase
        .from("user_improvement_resources")
        .update({
          status: "debrief_offered",
          expires_at: debriefExpiresAt.toISOString(),
          debrief_offered_count:
            (existingCoaching.debrief_offered_count ?? 0) + 1,
          payload: {
            ...(existingCoaching.payload as Record<string, unknown>),
            debrief_offered_at: now.toISOString(),
            source_plan_id: plan.id,
          },
        })
        .eq("id", existingCoaching.id);
    } else {
      // Créer la ressource
      await supabase.from("user_improvement_resources").insert({
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
