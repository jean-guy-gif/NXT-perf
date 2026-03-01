"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";

/**
 * Loads the current user's profile from Supabase on mount.
 * In demo mode, does nothing (store already has mock user).
 */
export function useSupabaseProfile() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    if (isDemo || profile) return;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as DbProfile);
      }
    }

    load();
  }, [supabase, isDemo, setProfile, profile]);
}
