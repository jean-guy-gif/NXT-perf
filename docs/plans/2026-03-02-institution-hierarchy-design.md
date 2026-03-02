# Institution Hierarchy Design

**Date:** 2026-03-02
**Status:** Approved

## Goal

Add a 3-tier hierarchy: Institution (= Organization) → Manager → Agent.
Each manager owns one team of agents. Prepare for future Coach role without building it now.

## Decisions

| Question | Decision |
|----------|----------|
| What is an Institution? | Reuse existing `organizations` table |
| Manager-Team link | Add `manager_id` column to `teams` table |
| Agent-Team link | Use existing `profiles.team_id` (no `team_members` table) |
| UI placement | Enrich existing `/manager/equipe` page |
| Migration strategy | "À configurer" state — no auto-created default teams |
| Security approach | Migration SQL + RLS at team level |

## Data Model

```
Organization (= Institution / Agence)
  └── Team 1 (manager_id → Manager A)
  │     ├── Agent 1 (profiles.team_id → Team 1)
  │     └── Agent 2 (profiles.team_id → Team 1)
  └── Team 2 (manager_id → Manager B)
        └── Agent 3 (profiles.team_id → Team 2)
```

### Schema Changes

```sql
ALTER TABLE teams ADD COLUMN manager_id UUID REFERENCES profiles(id);
CREATE UNIQUE INDEX teams_manager_id_unique ON teams(manager_id);
```

Constraints:
- 1 manager → max 1 team (unique index)
- 1 agent → 1 team via `profiles.team_id`
- Teams scoped by `org_id` (multi-tenant)

## RLS & Permissions

### New Helper Functions

```sql
get_my_team_id() → SELECT id FROM teams WHERE manager_id = auth.uid()
is_in_my_team(profile_id) → profiles.team_id = get_my_team_id()
```

### Policy Changes

| Table | Current | New |
|-------|---------|-----|
| profiles | SELECT: same org | Same org (unchanged — needed to list unassigned agents) |
| period_results | SELECT: own OR (manager + same org) | SELECT: own OR (manager + agent in my team) |
| teams | INSERT: manager only | + SELECT: same org, UPDATE/DELETE: manager_id = me |

### Coach Preparation

Functions accept optional `allowed_team_ids` parameter (not implemented, just documented as extension point).

## Services

New file: `src/lib/institutions.ts`

```typescript
getInstitution(orgId)
updateInstitutionName(orgId, name)

createTeam(orgId, managerId, name?)
deleteTeam(teamId)
getTeamByManager(managerId)
listTeamsByInstitution(orgId)

addAgentToTeam(teamId, agentId)
removeAgentFromTeam(agentId)
listAgentsByTeam(teamId)
listUnassignedAgents(orgId)
```

New hook: `src/hooks/use-team-management.ts`
- Wraps above functions with loading/error states
- Used by Équipe page

## UI: Enhanced Équipe Page

### Layout

```
┌─────────────────────────────────────────────────┐
│  Mon Agence : [Nom org]                         │
│  Code d'invitation : ABC-1234                   │
├─────────────────────────────────────────────────┤
│  ┌─ Mon Équipe ──────────────────────────────┐  │
│  │  [Nom de la team]          [✏️ Renommer]  │  │
│  │  Agents (3)                               │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ Agent 1  │ Expert │ [❌ Retirer]   │   │  │
│  │  │ Agent 2  │ Junior │ [❌ Retirer]   │   │  │
│  │  │ Agent 3  │ Conf.  │ [❌ Retirer]   │   │  │
│  │  └────────────────────────────────────┘   │  │
│  │  [+ Ajouter un agent]                     │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Vue collective] [Vue individuelle]            │
└─────────────────────────────────────────────────┘
```

### Behavior

1. No team → CTA "Créer mon équipe"
2. Create → team named after org by default
3. Manager can rename team
4. "Ajouter" → dropdown of unassigned agents in org
5. "Retirer" → sets agent's team_id to NULL
6. Collective/individual views filter by team only

### Cockpit

Results auto-filtered by team via RLS (no app-level change needed).

## Migration & Compatibility

No automatic data migration. Managers without a team see an "à configurer" state prompting them to create their team. Existing agents without team_id appear in the "unassigned" pool.

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/009_institution_hierarchy.sql` | New: ALTER teams, RLS updates, helper functions |
| `src/lib/institutions.ts` | New: service functions |
| `src/hooks/use-team-management.ts` | New: React hook |
| `src/types/database.ts` | Modify: add manager_id to DbTeam |
| `src/app/(dashboard)/manager/equipe/page.tsx` | Modify: add team management UI |
| `src/stores/app-store.ts` | Modify: update team-related actions |
| `src/data/mock-team.ts` | Modify: add manager_id to mock data |
