"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import { dbRatioConfigsToApp } from "@/types/database";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { DbRatioConfig } from "@/types/database";
import type { RatioId } from "@/types/ratios";

/**
 * Loads ratio configs from Supabase into the store.
 * In demo mode, the store already has default configs.
 */
export function useSupabaseRatioConfigs() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const setRatioConfigs = useAppStore((s) => s.setRatioConfigs);

  useEffect(() => {
    if (isDemo || !profile) return;

    async function load() {
      const { data, error } = await supabase
        .from("ratio_configs")
        .select("*");

      if (!error && data) {
        const configs = dbRatioConfigsToApp(
          data as DbRatioConfig[],
          defaultRatioConfigs
        );
        setRatioConfigs(configs);
      }
    }

    load();
  }, [supabase, isDemo, profile, setRatioConfigs]);

  /** Update a single ratio threshold in Supabase */
  const updateThreshold = useCallback(
    async (ratioId: RatioId, level: "debutant" | "confirme" | "expert", value: number) => {
      // Update local store immediately
      useAppStore.getState().updateRatioThreshold(ratioId, level, value);

      if (isDemo || !profile) return;

      // Get current full thresholds from store
      const current = useAppStore.getState().ratioConfigs[ratioId];

      await supabase.from("ratio_configs").upsert(
        {
          org_id: profile.org_id,
          ratio_id: ratioId,
          thresholds: current.thresholds,
        },
        { onConflict: "org_id,ratio_id" }
      );
    },
    [supabase, isDemo, profile]
  );

  return { updateThreshold };
}
