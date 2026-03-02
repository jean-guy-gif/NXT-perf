"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile, DbTeam } from "@/types/database";

/**
 * Hook for managing the current manager's team in Supabase mode.
 * Provides CRUD operations for teams and agent assignment.
 * In demo mode, all operations are skipped.
 */
export function useTeamManagement() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);

  const [team, setTeam] = useState<DbTeam | null>(null);
  const [teamAgents, setTeamAgents] = useState<DbProfile[]>([]);
  const [unassignedAgents, setUnassignedAgents] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamData = useCallback(async () => {
    if (isDemo || !profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch the manager's team
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("manager_id", profile.id)
        .maybeSingle();

      if (teamError) throw teamError;

      const currentTeam = teamData as DbTeam | null;
      setTeam(currentTeam);

      // If team exists, fetch agents assigned to it
      if (currentTeam) {
        const { data: agentsData, error: agentsError } = await supabase
          .from("profiles")
          .select("*")
          .eq("team_id", currentTeam.id)
          .eq("role", "conseiller");

        if (agentsError) throw agentsError;
        setTeamAgents((agentsData as DbProfile[]) ?? []);
      } else {
        setTeamAgents([]);
      }

      // Fetch unassigned agents in the same org
      const { data: unassignedData, error: unassignedError } = await supabase
        .from("profiles")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("role", "conseiller")
        .is("team_id", null);

      if (unassignedError) throw unassignedError;
      setUnassignedAgents((unassignedData as DbProfile[]) ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du chargement de l'équipe";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase, isDemo, profile]);

  // Load on mount
  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const createTeam = useCallback(
    async (name: string) => {
      if (!profile) return;

      try {
        setError(null);

        const { data, error: insertError } = await supabase
          .from("teams")
          .insert({
            org_id: profile.org_id,
            manager_id: profile.id,
            name,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setTeam(data as DbTeam);
        await loadTeamData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de la création de l'équipe";
        setError(message);
      }
    },
    [supabase, profile, loadTeamData]
  );

  const renameTeam = useCallback(
    async (newName: string) => {
      if (!team) return;

      try {
        setError(null);

        const { error: updateError } = await supabase
          .from("teams")
          .update({ name: newName })
          .eq("id", team.id);

        if (updateError) throw updateError;

        setTeam({ ...team, name: newName });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors du renommage de l'équipe";
        setError(message);
      }
    },
    [supabase, team]
  );

  const addAgent = useCallback(
    async (agentId: string) => {
      if (!team) return;

      try {
        setError(null);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ team_id: team.id })
          .eq("id", agentId);

        if (updateError) throw updateError;

        await loadTeamData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors de l'ajout de l'agent";
        setError(message);
      }
    },
    [supabase, team, loadTeamData]
  );

  const removeAgent = useCallback(
    async (agentId: string) => {
      if (!team) return;

      try {
        setError(null);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ team_id: null })
          .eq("id", agentId);

        if (updateError) throw updateError;

        await loadTeamData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur lors du retrait de l'agent";
        setError(message);
      }
    },
    [supabase, team, loadTeamData]
  );

  return {
    team,
    teamAgents,
    unassignedAgents,
    loading,
    error,
    createTeam,
    renameTeam,
    addAgent,
    removeAgent,
    reload: loadTeamData,
  };
}
