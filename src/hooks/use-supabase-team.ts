"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile, DbTeam } from "@/types/database";
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
      const [profilesRes, teamsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("teams").select("*"),
      ]);
      // RLS ensures we only get profiles/teams from our org

      if (profilesRes.error || teamsRes.error) return;

      const dbProfiles = profilesRes.data as DbProfile[];
      const dbTeams = teamsRes.data as DbTeam[];

      // Build teamId → managerId lookup
      const teamManagerMap = new Map<string, string>();
      for (const t of dbTeams) {
        if (t.manager_id) {
          teamManagerMap.set(t.id, t.manager_id);
        }
      }

      for (const p of dbProfiles) {
        const user: User = {
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          mainRole: p.role,
          role: p.role,
          availableRoles: [p.role],
          category: p.category,
          teamId: p.team_id ?? "",
          managerId: p.team_id ? teamManagerMap.get(p.team_id) : undefined,
          avatarUrl: p.avatar_url ?? undefined,
          createdAt: p.created_at,
        };
        addUser(user);
      }
    }

    load();
  }, [supabase, isDemo, profile, addUser]);
}
