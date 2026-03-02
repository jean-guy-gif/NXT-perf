import { createClient } from "@/lib/supabase/client";
import type { DbTeam, DbProfile, DbOrganization } from "@/types/database";

/**
 * Get the current authenticated user's organization.
 * Returns null if not authenticated or no org found.
 */
export async function getMyOrganization(): Promise<DbOrganization | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  return (org as DbOrganization) ?? null;
}

/**
 * Create a new team within an organization.
 */
export async function createTeam(
  orgId: string,
  managerId: string,
  name: string
): Promise<DbTeam> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teams")
    .insert({ org_id: orgId, manager_id: managerId, name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DbTeam;
}

/**
 * Get the team managed by a specific manager.
 * Returns null if the manager has no team.
 */
export async function getTeamByManager(
  managerId: string
): Promise<DbTeam | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("manager_id", managerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as DbTeam) ?? null;
}

/**
 * Rename an existing team.
 */
export async function renameTeam(
  teamId: string,
  name: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("teams")
    .update({ name })
    .eq("id", teamId);

  if (error) throw new Error(error.message);
}

/**
 * Delete a team. Unassigns all agents from the team first.
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const supabase = createClient();

  // Unassign all agents from this team
  const { error: unassignError } = await supabase
    .from("profiles")
    .update({ team_id: null })
    .eq("team_id", teamId);

  if (unassignError) throw new Error(unassignError.message);

  // Delete the team
  const { error: deleteError } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (deleteError) throw new Error(deleteError.message);
}

/**
 * Assign an agent to a team.
 */
export async function addAgentToTeam(
  teamId: string,
  agentId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", agentId);

  if (error) throw new Error(error.message);
}

/**
 * Remove an agent from their team (set team_id to null).
 */
export async function removeAgentFromTeam(agentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ team_id: null })
    .eq("id", agentId);

  if (error) throw new Error(error.message);
}

/**
 * List all agents (role = 'conseiller') assigned to a specific team.
 */
export async function listAgentsByTeam(teamId: string): Promise<DbProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("team_id", teamId)
    .eq("role", "conseiller");

  if (error) throw new Error(error.message);
  return (data as DbProfile[]) ?? [];
}

/**
 * List all agents (role = 'conseiller') in an organization that are not assigned to any team.
 */
export async function listUnassignedAgents(
  orgId: string
): Promise<DbProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", orgId)
    .eq("role", "conseiller")
    .is("team_id", null);

  if (error) throw new Error(error.message);
  return (data as DbProfile[]) ?? [];
}

/**
 * List all teams within an organization.
 */
export async function listTeamsByOrg(orgId: string): Promise<DbTeam[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
  return (data as DbTeam[]) ?? [];
}
