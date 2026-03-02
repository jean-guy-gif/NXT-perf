# Vue Agence — Design Document

**Date:** 2026-03-02
**Branch:** `feat/institution-hierarchy`
**Depends on:** Institution hierarchy (migration 009, complete)

## Overview

The Vue Agence is an institution-level dashboard for the "directeur d'agence" — the person responsible for an entire real estate agency. Unlike managers who see only their own team, the directeur sees all managers, all teams, and all agents in the organization.

This is NOT the Coach feature (Coach = external, cross-institution access). This is the internal agency director view.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Role model | New `directeur` role (3rd role) | Clean separation, no conflation with manager |
| Route structure | `/directeur/*` parallel routes | Same pattern as `/manager/*`, independent evolution |
| Pages (v1) | Cockpit, Equipes, Classement | Core needs; formation-collective later |
| Data navigation | Tabs (global / by team / by agent) | Simple, clear, no complex drill-down |
| Role switching | Directeur <-> Manager | Directeur is also a manager of a team |
| Demo data | 3 teams, ~10 agents | Enough to test aggregation and comparison |

## Role: `directeur`

Extend `UserRole` from `"conseiller" | "manager"` to `"conseiller" | "manager" | "directeur"`.

- The directeur is identified by `profiles.role = 'directeur'` in Supabase.
- The directeur belongs to an organization (`org_id`).
- The directeur is also a manager of one team (`teams.manager_id`).
- In the Header, role switch becomes directeur <-> manager (2-way toggle).
- Agent view (`conseiller`) is NOT available to the directeur.

### RLS

The directeur sees all data in their organization (no team-level filtering). New RLS policies:
- `is_directeur()` helper function
- `results_select` and `objectives_select` policies extended to grant directeur full org read access

### SQL Migration

```sql
-- Add directeur to role check (if using enum/check constraint)
-- New helper function
CREATE OR REPLACE FUNCTION public.is_directeur()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'directeur'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Extend results/objectives policies to include directeur org-wide access
```

## Routes

```
src/app/(dashboard)/directeur/
  layout.tsx            — Guard: role === "directeur" || redirect("/dashboard")
  cockpit/page.tsx      — Org-wide KPIs with tabs
  equipes/page.tsx      — All teams overview
  classement/page.tsx   — Org-wide rankings
```

## Sidebar Navigation

New section "Directeur" visible when `role === "directeur"`:

| Route | Icon | Label |
|---|---|---|
| `/directeur/cockpit` | Building2 | Cockpit Agence |
| `/directeur/equipes` | Users | Equipes |
| `/directeur/classement` | Trophy | Classement |

Extend `NavItem` type with `directorOnly: true`. Filter logic mirrors `managerOnly`.

When in manager mode (after switch), show manager section instead.

## Pages

### Cockpit Directeur (`/directeur/cockpit`)

Three tabs at top: **Vue globale** | **Par equipe** | **Par conseiller**

**Vue globale:**
- 4 KPI cards: CA total agence, Total Actes, Taux d'exclusivite moyen, Performance moyenne
- LineChart: monthly CA evolution (entire agency)
- BarChart: ratio status distribution (ok/warning/danger) aggregated

**Par equipe:**
- Card per team: team name, manager name, agent count, team CA, avg performance
- Click to expand team detail (reuse cockpit manager components)

**Par conseiller:**
- Sortable table of all agents: name, team, CA, actes, performance
- Column sorting

### Equipes (`/directeur/equipes`)

- Card per team: name, manager, agent count, aggregated KPIs
- List of unassigned agents (agents with no team_id)
- Read-only view (directeur observes, managers manage their teams)

### Classement (`/directeur/classement`)

Two tabs: **Par conseiller** | **Par equipe**

- **Par conseiller:** All agents ranked by selected metric (same metrics as manager classement)
- **Par equipe:** Teams ranked by aggregated metrics

Reuse existing ranking components from manager classement.

## Hook: `useDirectorData`

```typescript
function useDirectorData() {
  // Uses store data (already loaded org-wide by useSupabaseTeam)
  // Groups users by team
  // Computes aggregates per team and org-wide
  // Returns: { teams, allConseillers, allManagers, orgStats, teamStats }
}
```

No new Supabase queries needed — `useSupabaseTeam()` already loads all org members. The hook does client-side grouping and aggregation.

## Mock Data

Extend existing mocks to support 3 teams:

- **Team 1** (existing): Manager demo + 3 agents (trim from 8 to keep total manageable)
- **Team 2** (new): Manager 2 + 3 agents
- **Team 3** (new): Manager 3 + 2 agents
- **Directeur:** New user, `role: "directeur"`, also `manager_id` of Team 1

Total: 1 directeur, 3 managers (directeur is also manager 1), ~8 agents.

Each team has different mock results to show meaningful aggregation differences.

## Switch Role

The Header component's role switch is extended:
- When user is `directeur`: toggle shows "Directeur" / "Manager"
- When user is `manager`: toggle shows "Manager" / "Conseiller" (unchanged)
- When user is `conseiller`: no toggle (unchanged)

On switch, `switchRole()` in store updates `user.role` and the sidebar/layout react accordingly.

## Components to Create

1. **DirectorTabs** — Tab bar component for global/team/agent views
2. **TeamCard** — Card showing team summary (reusable in cockpit + equipes)
3. **AgentTable** — Sortable table of all agents with KPIs
4. **TeamRanking** — Team-level ranking component

## Components to Reuse

- KpiCard, LineChart, BarChart, ProgressBar (from `/components/charts/`)
- RankingEntry display (from manager classement)
- Badge, Card, Tabs (from `/components/ui/`)
