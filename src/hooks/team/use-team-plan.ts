"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import {
  TEAM_PLAN_DURATION_DAYS,
  buildTeamPlanPayload,
  type BuildTeamPlanInput,
  type TeamPlanPayload,
} from "@/lib/manager/team-plan";

/**
 * Row Supabase `user_improvement_resources` filtrée sur `resource_type =
 * "team_plan_30j"`. Schéma exact issu de l'extension prod (audit Supabase MCP).
 */
export interface ActiveTeamPlan {
  id: string;
  team_id: string | null;
  user_id: string;
  payload: TeamPlanPayload;
  status: "active" | "completed" | "expired" | "archived";
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  archived_at: string | null;
}

interface UseTeamPlanReturn {
  activePlan: ActiveTeamPlan | null;
  loading: boolean;
  refresh: () => Promise<void>;
  createTeamPlan: (input: BuildTeamPlanInput & { teamId: string }) => Promise<ActiveTeamPlan | null>;
  archiveTeamPlan: (planId: string) => Promise<void>;
}

/**
 * useTeamPlan — chantier d.1.
 *
 * Lit le team plan actif courant pour `teamId` (resource_type =
 * "team_plan_30j", status = "active", archived_at NULL). Permet la création
 * et l'archivage côté manager.
 *
 * RLS prod :
 *   - `resources_team_plan_manager_write` (manager + directeur écrit pour
 *     son équipe via teams.manager_id = auth.uid())
 *   - `resources_team_plan_conseiller_read` (conseiller lit team_plan de
 *     sa team — non utilisé ici, sera consommé en d.2)
 *
 * Mode démo : pas de DB. Le hook retourne `null` + ne crée rien (le caller
 * conserve son fallback localStorage en d.1 V1). La persistance est ciblée
 * production.
 */
export function useTeamPlan(
  teamId: string | null | undefined,
): UseTeamPlanReturn {
  const isDemo = useAppStore((s) => s.isDemoMode);
  const [activePlan, setActivePlan] = useState<ActiveTeamPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!teamId || isDemo) {
      setActivePlan(null);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_improvement_resources")
        .select("*")
        .eq("resource_type", "team_plan_30j")
        .eq("team_id", teamId)
        .eq("status", "active")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[use-team-plan] fetch error", error.message);
        return;
      }
      setActivePlan((data as ActiveTeamPlan | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [teamId, isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTeamPlan = useCallback(
    async (
      input: BuildTeamPlanInput & { teamId: string },
    ): Promise<ActiveTeamPlan | null> => {
      if (isDemo) {
        // Mode démo : pas de DB. Le caller conserve son fallback localStorage.
        return null;
      }
      const supabase = createClient();
      const payload = buildTeamPlanPayload(input);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TEAM_PLAN_DURATION_DAYS);
      const { data, error } = await supabase
        .from("user_improvement_resources")
        .insert({
          user_id: input.managerId,
          team_id: input.teamId,
          resource_type: "team_plan_30j",
          status: "active",
          payload,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      if (error) {
        console.error("[use-team-plan] create error", error.message);
        throw error;
      }
      const created = data as ActiveTeamPlan;
      setActivePlan(created);
      return created;
    },
    [isDemo],
  );

  const archiveTeamPlan = useCallback(
    async (planId: string): Promise<void> => {
      if (isDemo) {
        setActivePlan(null);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("user_improvement_resources")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
        })
        .eq("id", planId);
      if (error) {
        console.error("[use-team-plan] archive error", error.message);
        throw error;
      }
      setActivePlan(null);
    },
    [isDemo],
  );

  return { activePlan, loading, refresh, createTeamPlan, archiveTeamPlan };
}
