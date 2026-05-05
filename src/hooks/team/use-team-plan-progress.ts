"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

interface UseTeamPlanProgressReturn {
  /** Map<userId, Set<actionId>> — pour chaque conseiller, ses actions cochées. */
  progressByUser: Map<string, Set<string>>;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * useTeamPlanProgress — chantier d.3.
 *
 * Lit l'ensemble des cochages d'actions du team plan pour TOUS les
 * conseillers de l'équipe du manager courant. Agrège les rows
 * `team_plan_action_progress` en `Map<userId, Set<actionId>>` pour
 * alimenter la matrice action × conseiller (`<TeamPlanProgressMatrix>`).
 *
 * RLS prod : `team_plan_progress_manager_read` filtre les rows aux
 * conseillers de l'équipe du manager (ou directeur d'agence) connecté.
 * Aucune écriture côté manager — l'observation seule est exposée.
 *
 * Mode démo : pas de DB → Map vide (cohérent avec d.1 + d.2).
 *
 * Refresh manuel V1 (Q6) : pas de Supabase realtime channel. Le manager
 * déclenche `refresh()` via le bouton matrix pour récupérer les nouveaux
 * cochages des conseillers.
 */
export function useTeamPlanProgress(
  planResourceId: string | null,
): UseTeamPlanProgressReturn {
  const isDemo = useAppStore((s) => s.isDemoMode);
  const [progressByUser, setProgressByUser] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (isDemo || !planResourceId) {
      setProgressByUser(new Map());
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("team_plan_action_progress")
        .select("user_id, action_id")
        .eq("plan_resource_id", planResourceId);

      if (error) {
        console.error(
          "[use-team-plan-progress] fetch error",
          error.message,
        );
        setProgressByUser(new Map());
        return;
      }

      // Aggrégation Map<userId, Set<actionId>>
      const map = new Map<string, Set<string>>();
      for (const row of data ?? []) {
        const r = row as { user_id: string; action_id: string };
        const set = map.get(r.user_id) ?? new Set<string>();
        set.add(r.action_id);
        map.set(r.user_id, set);
      }
      setProgressByUser(map);
    } finally {
      setLoading(false);
    }
  }, [isDemo, planResourceId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progressByUser,
    loading,
    refresh: fetchProgress,
  };
}
