"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import { dbResultToAppResult } from "@/types/database";
import type { DbPeriodResult } from "@/types/database";
import type { PeriodResults } from "@/types/results";

/**
 * Loads results from Supabase into the store.
 * In demo mode, the store already has mock results.
 */
export function useSupabaseResults() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const setResults = useAppStore((s) => s.setResults);

  useEffect(() => {
    if (isDemo || !profile) return;

    async function load() {
      // Manager gets all org results; agent gets own
      const isManager = profile!.role === "manager";

      let query = supabase.from("period_results").select("*");

      if (!isManager) {
        query = query.eq("user_id", profile!.id);
      }
      // RLS handles org-level filtering for managers

      const { data, error } = await query;

      if (!error && data) {
        const results = (data as DbPeriodResult[]).map(dbResultToAppResult);
        setResults(results);
      }
    }

    load();
  }, [supabase, isDemo, profile, setResults]);

  /** Save (upsert) a PeriodResults to Supabase */
  const saveResult = useCallback(
    async (result: PeriodResults) => {
      if (isDemo) {
        // Demo mode: just update the store
        useAppStore.getState().addResults(result);
        return;
      }

      // Get current auth user id (must match RLS policy)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return { message: "Non authentifié" };

      const { error } = await supabase.from("period_results").upsert(
        {
          user_id: authUser.id,
          period_type: result.periodType,
          period_start: result.periodStart,
          period_end: result.periodEnd,
          data: {
            prospection: result.prospection,
            vendeurs: result.vendeurs,
            acheteurs: result.acheteurs,
            ventes: result.ventes,
          },
        },
        { onConflict: "user_id,period_type,period_start" }
      );

      if (!error) {
        // Update local store cache
        useAppStore.getState().addResults(result);
      }

      return error;
    },
    [supabase, isDemo]
  );

  return { saveResult };
}
