"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";

/**
 * Loads the current user's profile from Supabase on mount.
 * Also fetches the organization's invite code for manager views.
 * In demo mode, does nothing (store already has mock user).
 */
export function useSupabaseProfile() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const setOrgInviteCode = useAppStore((s) => s.setOrgInviteCode);
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
        const dbProfile = data as DbProfile;
        setProfile(dbProfile);

        // Fetch the org's invite code
        if (dbProfile.org_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("invite_code")
            .eq("id", dbProfile.org_id)
            .single();

          if (org) {
            setOrgInviteCode(org.invite_code);
          }
        }
      }
    }

    load();
  }, [supabase, isDemo, setProfile, setOrgInviteCode, profile]);
}
