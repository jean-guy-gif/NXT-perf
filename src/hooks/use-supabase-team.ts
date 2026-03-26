"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile, DbTeam } from "@/types/database";
import type { User } from "@/types/user";

/**
 * Loads all org members into the store's users[] array.
 * Used by manager views (equipe, cockpit, classement).
 * In demo mode, the store already has mock users.
 *
 * Reloads from Supabase whenever the profile changes (new login).
 */
export function useSupabaseTeam() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const setUsers = useAppStore((s) => s.setUsers);
  const lastProfileId = useRef<string | null>(null);

  useEffect(() => {
    if (isDemo || !profile) return;

    // Skip if we already loaded for this exact profile
    if (lastProfileId.current === profile.id) return;
    lastProfileId.current = profile.id;

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

      const users: User[] = dbProfiles.map((p) => ({
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
        institutionId: p.org_id ?? undefined,
      }));

      setUsers(users);
    }

    load();
  }, [supabase, isDemo, profile, setUsers]);
}
