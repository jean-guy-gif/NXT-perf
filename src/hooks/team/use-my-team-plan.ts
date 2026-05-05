"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import type { ActiveTeamPlan } from "@/hooks/team/use-team-plan";

interface UseMyTeamPlanReturn {
  activePlan: ActiveTeamPlan | null;
  loading: boolean;
  /** Map<action_id, completed_at ISO> — actions cochées par le conseiller courant. */
  myProgress: Map<string, string>;
  /** Toggle d'une action — INSERT/DELETE dans `team_plan_action_progress`. */
  toggleAction: (actionId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * useMyTeamPlan — chantier d.2.
 *
 * Lit le team plan actif de l'équipe du conseiller courant + sa propre
 * progression sur ce plan. Permet le toggle d'action (cocher / décocher).
 *
 * RLS prod :
 *   - Lecture plan : `resources_team_plan_conseiller_read` (filtre par
 *     `team_id` correspondant à `profile.team_id` du conseiller)
 *   - Lecture/écriture progress : `team_plan_progress_own` (filtre par
 *     `user_id = auth.uid()` — chacun gère ses propres cochages)
 *
 * Pattern toggle (Q4 validé) : optimistic update local + rollback
 * automatique si la requête Supabase échoue. UX fluide, robuste aux erreurs
 * réseau ponctuelles.
 *
 * Mode démo : pas de DB → `activePlan: null` + `myProgress` vide. Cohérent
 * avec `useTeamPlan` côté manager (chantier d.1).
 *
 * Cas conseiller solo (`teamId` vide) : early-return → banner caché par
 * le composant parent.
 */
export function useMyTeamPlan(): UseMyTeamPlanReturn {
  const { user } = useUser();
  const isDemo = useAppStore((s) => s.isDemoMode);
  const [activePlan, setActivePlan] = useState<ActiveTeamPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [myProgress, setMyProgress] = useState<Map<string, string>>(new Map());

  const fetchAll = useCallback(async () => {
    if (isDemo || !user?.teamId || !user?.id) {
      setActivePlan(null);
      setMyProgress(new Map());
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Team plan actif via RLS resources_team_plan_conseiller_read
      const { data: plan, error: planErr } = await supabase
        .from("user_improvement_resources")
        .select("*")
        .eq("resource_type", "team_plan_30j")
        .eq("team_id", user.teamId)
        .eq("status", "active")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planErr) {
        console.error(
          "[use-my-team-plan] fetch plan error",
          planErr.message,
        );
        return;
      }

      if (!plan) {
        setActivePlan(null);
        setMyProgress(new Map());
        return;
      }

      const planRow = plan as ActiveTeamPlan;
      setActivePlan(planRow);

      // 2. Ma progression via RLS team_plan_progress_own
      const { data: progressRows, error: progressErr } = await supabase
        .from("team_plan_action_progress")
        .select("action_id, completed_at")
        .eq("plan_resource_id", planRow.id)
        .eq("user_id", user.id);

      if (progressErr) {
        console.error(
          "[use-my-team-plan] fetch progress error",
          progressErr.message,
        );
        setMyProgress(new Map());
        return;
      }

      const map = new Map<string, string>();
      for (const r of progressRows ?? []) {
        const row = r as { action_id: string; completed_at: string };
        map.set(row.action_id, row.completed_at);
      }
      setMyProgress(map);
    } finally {
      setLoading(false);
    }
  }, [isDemo, user?.id, user?.teamId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleAction = useCallback(
    async (actionId: string) => {
      if (isDemo || !user?.id || !activePlan) return;

      const isCurrentlyDone = myProgress.has(actionId);

      // Optimistic update (Q4 — UX fluide)
      setMyProgress((prev) => {
        const next = new Map(prev);
        if (isCurrentlyDone) next.delete(actionId);
        else next.set(actionId, new Date().toISOString());
        return next;
      });

      try {
        const supabase = createClient();
        if (isCurrentlyDone) {
          const { error } = await supabase
            .from("team_plan_action_progress")
            .delete()
            .eq("plan_resource_id", activePlan.id)
            .eq("user_id", user.id)
            .eq("action_id", actionId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("team_plan_action_progress")
            .insert({
              plan_resource_id: activePlan.id,
              user_id: user.id,
              action_id: actionId,
            });
          if (error) throw error;
        }
      } catch (e) {
        console.error(
          "[use-my-team-plan] toggle error, rolling back",
          e instanceof Error ? e.message : String(e),
        );
        // Rollback (Q4)
        setMyProgress((prev) => {
          const next = new Map(prev);
          if (isCurrentlyDone) next.set(actionId, new Date().toISOString());
          else next.delete(actionId);
          return next;
        });
      }
    },
    [isDemo, user?.id, activePlan, myProgress],
  );

  return {
    activePlan,
    loading,
    myProgress,
    toggleAction,
    refresh: fetchAll,
  };
}
