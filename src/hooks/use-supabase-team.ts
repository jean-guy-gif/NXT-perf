"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";
import type { User } from "@/types/user";

/**
 * Loads all org members into the store's users[] array.
 * Used by manager views (equipe, cockpit, classement).
 * In demo mode, the store already has mock users.
 */
export function useSupabaseTeam() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const addUser = useAppStore((s) => s.addUser);

  useEffect(() => {
    if (isDemo || !profile) return;

    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      // RLS ensures we only get profiles from our org

      if (!error && data) {
        const dbProfiles = data as DbProfile[];
        for (const p of dbProfiles) {
          const user: User = {
            id: p.id,
            email: p.email,
            firstName: p.first_name,
            lastName: p.last_name,
            role: p.role,
            category: p.category,
            teamId: p.team_id ?? "",
            managerId: undefined,
            avatarUrl: p.avatar_url ?? undefined,
            createdAt: p.created_at,
          };
          addUser(user);
        }
      }
    }

    load();
  }, [supabase, isDemo, profile, addUser]);
}
