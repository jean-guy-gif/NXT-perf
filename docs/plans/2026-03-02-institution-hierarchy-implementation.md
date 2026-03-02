# Institution Hierarchy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3-tier hierarchy (Organization/Institution → Manager → Agent) by linking managers to teams, filtering data by team, and adding team management UI to the Équipe page.

**Architecture:** Reuse existing `organizations` table as "Institution". Add `manager_id` FK to `teams`. Use existing `profiles.team_id` for agent membership. Update RLS to filter results by team. Enrich `/manager/equipe` with team creation/management UI.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js App Router, Zustand, TypeScript, Tailwind CSS, Radix UI.

---

### Task 1: SQL Migration — Add manager_id to teams + helper functions

**Files:**
- Create: `supabase/migrations/009_institution_hierarchy.sql`

**Step 1: Write the migration SQL**

```sql
-- 009_institution_hierarchy.sql

-- 1. Add manager_id to teams
ALTER TABLE public.teams ADD COLUMN manager_id UUID REFERENCES public.profiles(id);
CREATE UNIQUE INDEX teams_manager_id_unique ON public.teams(manager_id);
CREATE INDEX idx_teams_manager_id ON public.teams(manager_id);

-- 2. Helper: get the team_id managed by the current user
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.teams WHERE manager_id = auth.uid()
$$;

-- 3. Helper: check if a profile belongs to the current manager's team
CREATE OR REPLACE FUNCTION public.is_in_my_team(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = target_user_id
      AND t.manager_id = auth.uid()
  )
$$;

-- 4. New RLS policy: managers can update team_id on profiles in their org
CREATE POLICY "profiles_update_team_manager"
  ON public.profiles FOR UPDATE
  USING (
    org_id = public.get_my_org_id()
    AND public.is_manager()
  )
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.is_manager()
  );

-- 5. Update results_select policy to filter by team for managers
DROP POLICY IF EXISTS "results_select" ON public.period_results;
CREATE POLICY "results_select"
  ON public.period_results FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      public.is_manager()
      AND user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p.team_id = public.get_my_team_id()
      )
    )
  );

-- 6. Update objectives_select similarly
DROP POLICY IF EXISTS "objectives_select" ON public.objectives;
CREATE POLICY "objectives_select"
  ON public.objectives FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      public.is_manager()
      AND user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p.team_id = public.get_my_team_id()
      )
    )
  );
```

**Step 2: Verify the SQL is valid**

Read the file back and compare against the existing schema to confirm:
- `teams` table exists with `id`, `org_id`, `name`, `created_at`
- `profiles` has `id`, `org_id`, `team_id`
- Existing policies `results_select` and `objectives_select` exist and will be replaced

**Step 3: Commit**

```bash
git add supabase/migrations/009_institution_hierarchy.sql
git commit -m "feat: add institution hierarchy migration (manager_id, RLS, helpers)"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/database.ts` (add DbTeam interface)
- Modify: `src/types/user.ts` (no change needed — managerId already optional)

**Step 1: Add DbTeam interface to database.ts**

After line 7 (after `DbOrganization`), add:

```typescript
export interface DbTeam {
  id: string;
  org_id: string;
  manager_id: string | null;
  name: string;
  created_at: string;
}
```

**Step 2: Verify build compiles**

Run: `cd "/mnt/c/Users/jeang/Desktop/Projet Antigravity/Dashboard/antigravity-dashboard" && npx next build 2>&1 | tail -5`
Expected: Build succeeds (no references to DbTeam yet, so no breakage)

**Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add DbTeam type with manager_id"
```

---

### Task 3: Create institution service functions

**Files:**
- Create: `src/lib/institutions.ts`

**Step 1: Write the service module**

```typescript
import { createClient } from "@/lib/supabase/client";
import type { DbTeam } from "@/types/database";

const supabase = () => createClient();

/** Get the current user's organization */
export async function getMyOrganization() {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase()
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data } = await supabase()
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  return data;
}

/** Create a team for the current manager */
export async function createTeam(orgId: string, managerId: string, name: string) {
  const { data, error } = await supabase()
    .from("teams")
    .insert({ org_id: orgId, manager_id: managerId, name })
    .select()
    .single();

  if (error) throw error;
  return data as DbTeam;
}

/** Get the team managed by a specific manager */
export async function getTeamByManager(managerId: string) {
  const { data } = await supabase()
    .from("teams")
    .select("*")
    .eq("manager_id", managerId)
    .maybeSingle();

  return data as DbTeam | null;
}

/** Rename a team */
export async function renameTeam(teamId: string, name: string) {
  const { error } = await supabase()
    .from("teams")
    .update({ name })
    .eq("id", teamId);

  if (error) throw error;
}

/** Delete a team (unassigns all agents first) */
export async function deleteTeam(teamId: string) {
  // Unassign all agents from this team
  await supabase()
    .from("profiles")
    .update({ team_id: null })
    .eq("team_id", teamId);

  const { error } = await supabase()
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) throw error;
}

/** Add an agent to a team (set their team_id) */
export async function addAgentToTeam(teamId: string, agentId: string) {
  const { error } = await supabase()
    .from("profiles")
    .update({ team_id: teamId })
    .eq("id", agentId);

  if (error) throw error;
}

/** Remove an agent from their team (set team_id to null) */
export async function removeAgentFromTeam(agentId: string) {
  const { error } = await supabase()
    .from("profiles")
    .update({ team_id: null })
    .eq("id", agentId);

  if (error) throw error;
}

/** List all agents in a specific team */
export async function listAgentsByTeam(teamId: string) {
  const { data } = await supabase()
    .from("profiles")
    .select("*")
    .eq("team_id", teamId)
    .eq("role", "conseiller");

  return data ?? [];
}

/** List all unassigned agents in an organization */
export async function listUnassignedAgents(orgId: string) {
  const { data } = await supabase()
    .from("profiles")
    .select("*")
    .eq("org_id", orgId)
    .eq("role", "conseiller")
    .is("team_id", null);

  return data ?? [];
}

/** List all teams in an organization */
export async function listTeamsByOrg(orgId: string) {
  const { data } = await supabase()
    .from("teams")
    .select("*")
    .eq("org_id", orgId);

  return (data ?? []) as DbTeam[];
}
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/lib/institutions.ts
git commit -m "feat: add institution service functions"
```

---

### Task 4: Create useTeamManagement hook

**Files:**
- Create: `src/hooks/use-team-management.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbTeam, DbProfile } from "@/types/database";

/**
 * Hook for managing the current manager's team.
 * Loads the manager's team + unassigned agents from Supabase.
 * Provides actions: createTeam, renameTeam, addAgent, removeAgent.
 */
export function useTeamManagement() {
  const supabase = useSupabase();
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [team, setTeam] = useState<DbTeam | null>(null);
  const [teamAgents, setTeamAgents] = useState<DbProfile[]>([]);
  const [unassignedAgents, setUnassignedAgents] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load team data
  const loadTeamData = useCallback(async () => {
    if (isDemo || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get manager's team
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("manager_id", profile.id)
        .maybeSingle();

      setTeam(teamData as DbTeam | null);

      if (teamData) {
        // Get agents in this team
        const { data: agents } = await supabase
          .from("profiles")
          .select("*")
          .eq("team_id", teamData.id)
          .eq("role", "conseiller");

        setTeamAgents((agents ?? []) as DbProfile[]);
      } else {
        setTeamAgents([]);
      }

      // Get unassigned agents in this org
      const { data: unassigned } = await supabase
        .from("profiles")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("role", "conseiller")
        .is("team_id", null);

      setUnassignedAgents((unassigned ?? []) as DbProfile[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [supabase, profile, isDemo]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Create team
  const createTeam = useCallback(async (name: string) => {
    if (!profile) return;
    setError(null);

    const { data, error: err } = await supabase
      .from("teams")
      .insert({
        org_id: profile.org_id,
        manager_id: profile.id,
        name,
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }

    setTeam(data as DbTeam);
    // Reload to refresh unassigned list
    await loadTeamData();
  }, [supabase, profile, loadTeamData]);

  // Rename team
  const renameTeam = useCallback(async (newName: string) => {
    if (!team) return;
    setError(null);

    const { error: err } = await supabase
      .from("teams")
      .update({ name: newName })
      .eq("id", team.id);

    if (err) {
      setError(err.message);
      return;
    }

    setTeam({ ...team, name: newName });
  }, [supabase, team]);

  // Add agent to team
  const addAgent = useCallback(async (agentId: string) => {
    if (!team) return;
    setError(null);

    const { error: err } = await supabase
      .from("profiles")
      .update({ team_id: team.id })
      .eq("id", agentId);

    if (err) {
      setError(err.message);
      return;
    }

    await loadTeamData();
  }, [supabase, team, loadTeamData]);

  // Remove agent from team
  const removeAgent = useCallback(async (agentId: string) => {
    setError(null);

    const { error: err } = await supabase
      .from("profiles")
      .update({ team_id: null })
      .eq("id", agentId);

    if (err) {
      setError(err.message);
      return;
    }

    await loadTeamData();
  }, [supabase, loadTeamData]);

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
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/hooks/use-team-management.ts
git commit -m "feat: add useTeamManagement hook"
```

---

### Task 5: Update useSupabaseTeam to filter by team

**Files:**
- Modify: `src/hooks/use-supabase-team.ts`

**Step 1: Update the hook to set managerId on agents**

The current hook loads all profiles from the org but doesn't set `managerId`. After loading profiles, we need to look up which team each agent belongs to and set their `managerId` from the team's `manager_id`.

Replace the `load` function body in `use-supabase-team.ts`:

```typescript
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
      // Load profiles and teams in parallel
      const [profilesRes, teamsRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("teams").select("*"),
      ]);

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
          role: p.role,
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
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/hooks/use-supabase-team.ts
git commit -m "feat: populate managerId from teams in useSupabaseTeam"
```

---

### Task 6: Update Équipe page with team management UI

**Files:**
- Modify: `src/app/(dashboard)/manager/equipe/page.tsx`

This is the largest task. The page needs:
1. A header showing the organization name + invite code
2. A team management section:
   - If no team: CTA "Créer mon équipe"
   - If team exists: team name (editable), list of agents with remove button, add agent dropdown
3. Existing collective/individual views filtered to team agents only

**Step 1: Rewrite the Équipe page**

The full rewrite integrates `useTeamManagement()` hook for Supabase mode. In demo mode, the current behavior is preserved.

Key changes:
- Import `useTeamManagement` from `@/hooks/use-team-management`
- Add `TeamManagementPanel` component at the top (only in Supabase mode)
- In Supabase mode, filter `conseillers` by `team.id` (agents whose `team_id` matches)
- Show "Créer mon équipe" state when `team` is null and not in demo mode
- Add agent dropdown from `unassignedAgents`
- Add remove button per agent
- Show editable team name with pencil icon

**Architecture of the updated page:**

```
EquipePage
├── Header: "Équipe" + org name
├── InviteCodeBanner (existing, unchanged)
├── TeamManagementPanel (NEW — Supabase only)
│   ├── NoTeamState → "Créer mon équipe" button
│   └── TeamPanel
│       ├── Team name + rename
│       ├── Agent list with remove buttons
│       └── Add agent dropdown
├── ViewToggle (existing: collective/individual)
├── CollectiveView (existing, filtered by team)
└── IndividualView (existing, filtered by team)
```

The full implementation code for the page is ~600 lines. Key sections to add/modify:

**At the top of the file, add imports:**
```typescript
import { useTeamManagement } from "@/hooks/use-team-management";
import { Building2, Pencil, UserMinus, Plus, Loader2 } from "lucide-react";
import type { DbProfile } from "@/types/database";
```

**Inside `EquipePage`, add hook call:**
```typescript
const {
  team, teamAgents, unassignedAgents,
  loading: teamLoading, error: teamError,
  createTeam, renameTeam, addAgent, removeAgent,
} = useTeamManagement();
```

**Filter conseillers by team in Supabase mode:**
```typescript
const conseillers = users.filter((u) => {
  if (u.role !== "conseiller") return false;
  if (isDemo && currentUser) return u.teamId === currentUser.teamId;
  // Supabase mode: filter by manager's team
  if (team) return u.teamId === team.id;
  return false; // No team yet → empty list
});
```

**Add `TeamManagementPanel` component** between the invite code banner and the view toggle. This component handles:
- Loading state (spinner)
- No-team state (CTA button)
- Team card with editable name, agent list, add dropdown

**Add `NoTeamState` component:**
```typescript
function NoTeamState({ onCreate }: { onCreate: (name: string) => void }) {
  const orgInviteCode = useAppStore((s) => s.orgInviteCode);
  // Shows "Créer mon équipe" button
  // On click: creates team with org name as default
}
```

**Step 2: Verify build compiles and page renders**

Run: `npx next build 2>&1 | tail -5`

Manual test:
1. Log in as manager in demo mode → existing behavior preserved
2. Log in as manager in Supabase mode without team → "Créer mon équipe" CTA shown
3. Create team → team panel appears
4. Add agent → agent appears in list + disappears from dropdown
5. Remove agent → agent disappears from list + reappears in dropdown
6. Rename team → name updates
7. Collective/individual views show only team agents

**Step 3: Commit**

```bash
git add src/app/(dashboard)/manager/equipe/page.tsx
git commit -m "feat: add team management UI to Équipe page"
```

---

### Task 7: Update Cockpit to filter by team in Supabase mode

**Files:**
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx:212-214`

**Step 1: Update conseillers filter**

The cockpit currently filters by `teamId === currentUser.teamId`. This works in demo mode but in Supabase mode, the manager's own `teamId` may be empty (managers aren't necessarily in a team). Instead, we should use the team data from the store.

Current code (line 212-214):
```typescript
const conseillers = users.filter(
  (u) => u.role === "conseiller" && currentUser && u.teamId === currentUser.teamId
);
```

However, since we updated the RLS in Task 1 to only return results for agents in the manager's team, and `useSupabaseTeam` populates users with their `managerId`, the cockpit results will already be scoped. But `users[]` still contains all org profiles (RLS on profiles is org-level).

Update the filter to also check `managerId`:

```typescript
const conseillers = users.filter((u) => {
  if (u.role !== "conseiller") return false;
  if (!currentUser) return false;
  if (isDemo) return u.teamId === currentUser.teamId;
  // Supabase mode: agent's managerId should match current user
  return u.managerId === currentUser.id;
});
```

**Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/app/(dashboard)/manager/cockpit/page.tsx
git commit -m "feat: filter cockpit conseillers by managerId in Supabase mode"
```

---

### Task 8: Update Classement + Formation Collective pages

**Files:**
- Modify: `src/app/(dashboard)/manager/classement/page.tsx`
- Modify: `src/app/(dashboard)/manager/formation-collective/page.tsx`

**Step 1: Check current filtering logic in both pages**

Read both files and identify how they filter `conseillers`. Apply the same pattern as Task 7:

```typescript
const conseillers = users.filter((u) => {
  if (u.role !== "conseiller") return false;
  if (!currentUser) return false;
  if (isDemo) return u.teamId === currentUser.teamId;
  return u.managerId === currentUser.id;
});
```

**Step 2: Apply the filter update to both pages**

**Step 3: Verify build compiles**

Run: `npx next build 2>&1 | tail -5`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/manager/classement/page.tsx src/app/(dashboard)/manager/formation-collective/page.tsx
git commit -m "feat: filter classement and formation by team in Supabase mode"
```

---

### Task 9: Update store — set manager's teamId on team creation

**Files:**
- Modify: `src/stores/app-store.ts:147-163` (setProfile action)

**Step 1: Update setProfile to also set teamId from managed team**

When a manager's profile is loaded, their `team_id` in the profile may be null (they don't belong to a team as an agent). But they manage a team. We should update the store so `user.teamId` reflects their managed team for backward compatibility with demo filtering.

This is handled naturally now: the manager's `teamId` stays as whatever `profile.team_id` is. The filtering in cockpit/equipe uses `managerId` matching. No store change needed.

**Step 2: Verify no store change needed**

The `managerId` field on conseillers is populated by `useSupabaseTeam` (Task 5). The filtering in all manager pages now uses `managerId` (Tasks 6-8). The store is already correct.

**Mark as N/A — skip to next task.**

---

### Task 10: Full build verification + manual testing

**Files:** None (verification only)

**Step 1: Run production build**

```bash
cd "/mnt/c/Users/jeang/Desktop/Projet Antigravity/Dashboard/antigravity-dashboard"
npx next build
```

Expected: Build succeeds with no errors.

**Step 2: Manual testing checklist**

In **demo mode**:
- [ ] `/manager/equipe` — shows existing team list (unchanged behavior)
- [ ] `/manager/cockpit` — shows all demo conseillers
- [ ] `/manager/classement` — shows rankings for demo team
- [ ] `/manager/formation-collective` — shows recommendations

In **Supabase mode** (requires running migration first):
- [ ] Run `009_institution_hierarchy.sql` in Supabase SQL Editor
- [ ] Log in as manager → `/manager/equipe` shows "Créer mon équipe"
- [ ] Create team → team panel appears with editable name
- [ ] Add agent → agent moves from unassigned to team list
- [ ] Remove agent → agent moves back to unassigned
- [ ] `/manager/cockpit` — shows only team agents
- [ ] Log in as different manager → cannot see other manager's team agents
- [ ] Log in as conseiller → no access to manager pages (redirect to `/dashboard`)

**Step 3: Fix any issues found**

**Step 4: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "fix: post-verification fixes for institution hierarchy"
```

---

## Summary of deliverables

| # | Task | Files | Type |
|---|------|-------|------|
| 1 | SQL migration | `supabase/migrations/009_institution_hierarchy.sql` | Create |
| 2 | TypeScript types | `src/types/database.ts` | Modify |
| 3 | Service functions | `src/lib/institutions.ts` | Create |
| 4 | useTeamManagement hook | `src/hooks/use-team-management.ts` | Create |
| 5 | useSupabaseTeam update | `src/hooks/use-supabase-team.ts` | Modify |
| 6 | Équipe page UI | `src/app/(dashboard)/manager/equipe/page.tsx` | Modify |
| 7 | Cockpit filtering | `src/app/(dashboard)/manager/cockpit/page.tsx` | Modify |
| 8 | Classement + Formation | 2 files | Modify |
| 9 | Store check | N/A (no change needed) | Verify |
| 10 | Build verification | N/A | Verify |

## Execution order

Tasks 1-5 are sequential (each builds on the previous).
Tasks 6-8 are independent and can run in parallel after Task 5.
Task 9 is a verification checkpoint.
Task 10 is the final verification.
