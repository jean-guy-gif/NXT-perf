# Coach Feature Design

**Date**: 2026-03-02
**Branch**: `feat/coach-feature`
**Status**: Approved

## Decisions

- Multi-assignations: un coach peut coacher plusieurs scopes simultanément
- Routes dédiées `/coach/*` + embed composants existants (Approche A)
- Storage: Mock/Zustand d'abord, migration SQL préparée
- Plans 30j: auto-générés depuis ratios en alerte, éditables par le coach
- Le coach ne peut PAS supprimer une relation — seul le coaché peut révoquer

## 1. Modèle de données

### Types (`src/types/coach.ts`)

```typescript
type CoachTargetType = "AGENT" | "MANAGER" | "INSTITUTION"
type AssignmentStatus = "ACTIVE" | "REVOKED"

interface CoachAssignment {
  id: string
  coachId: string
  targetType: CoachTargetType
  targetId: string
  status: AssignmentStatus
  excludedManagerIds: string[] | null
  createdAt: string
}

interface CoachAction {
  id: string
  coachAssignmentId: string
  title: string
  status: "TODO" | "DONE"
  dueDate: string | null
  createdAt: string
}

interface CoachPlan {
  id: string
  coachAssignmentId: string
  startDate: string
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
  weeks: CoachPlanWeek[]
}

interface CoachPlanWeek {
  weekNumber: 1 | 2 | 3 | 4
  focus: string
  actions: string[]
}
```

### Store additions

Add to Zustand store: `coachAssignments`, `coachActions`, `coachPlans` arrays + CRUD actions:
- `addCoachAction(action)`, `toggleCoachAction(id)`, `removeCoachAction(id)`
- `createCoachPlan(plan)`, `updateCoachPlan(id, updates)`, `completeCoachPlan(id)`
- `revokeCoachAssignment(id)` — sets status to REVOKED
- `updateExcludedManagers(assignmentId, managerIds)`

### Migration (`012_coach_tables.sql`)

Prepared but not executed. Creates coach_assignments, coach_actions, coach_plans with RLS policies scoped to coach's userId.

## 2. Scope & Permissions

### `getCoachScopeUserIds(coachId, assignments, teams, users)`

Located in `src/lib/coach.ts`. Returns `Set<string>` of accessible userIds:

- **AGENT**: `[targetId]`
- **MANAGER**: `[targetId]` + all agents in manager's team(s)
- **INSTITUTION**: all managers in org + their agents − excludedManagerIds and their agents

### Hook: `useCoachData(coachId)`

- Calls `getCoachScopeUserIds` to determine scope
- Filters `useAllResults()` to scope
- Returns: assignments, scoped users, scoped results, aggregated stats

### Layout guard

`/coach/layout.tsx` checks `hasRole(user, "coach")`, redirects to `/dashboard` otherwise.

### Sidebar

New "Coach" section in sidebar, visible when `"coach"` is in `availableRoles`:
- Cockpit Coach
- (dynamic: user detail pages accessed via cockpit)

## 3. Pages

### `/coach/cockpit` — Coach Cockpit

3 tabs: **Institutions** | **Managers** | **Conseillers**

Each item displays:
- Name + category badge
- Global score (ratio average)
- 1-2 alert ratios (red/orange badges)
- Last coach action (or "Aucune action")
- Click → `/coach/[userId]`

### `/coach/[userId]` — User Detail View

Wrapper that:
1. Verifies userId is in coach scope
2. Displays KPIs + ratios using existing components (KpiCard, charts)
3. Shows CoachPanel (actions + plan + thresholds)

### `/coach/[userId]/actions` — Actions & Plan Detail

Full view of actions and plan 30 days for the user.

## 4. Actions & Plan 30 jours

### CoachPanel component

Reusable component displayed on `/coach/[userId]`:

**Actions section**:
- Max 3 active actions displayed
- Short title + optional dueDate
- "Mark done" button
- "+" button to add new action

**Plan 30j section**:
- Max 1 active plan
- "Generate plan" button → auto-generates from weak ratios
- Coach can edit text before validating
- Display: 4-week timeline with focus area + suggested actions

### Auto-generation: `generateCoachPlan(computedRatios)`

In `src/lib/coach.ts`:
- Takes ratios with status "danger" then "warning"
- Weeks 1-2: focus on weakest ratio
- Weeks 3-4: focus on 2nd weakest ratio
- Suggested actions mapped from `src/lib/formation.ts` training areas

## 5. Ratio Thresholds

On `/coach/[userId]`, a "Seuils" tab in CoachPanel:
- Shows 7 ratios with current thresholds
- Alert/warning ratios highlighted (2-3 max)
- Coach can modify threshold for this user
- `targetType=MANAGER` → option "Appliquer à l'équipe"
- `targetType=INSTITUTION` → option "Appliquer à tous (sauf exclusions)"

Uses existing `updateRatioThreshold()` scoped by userId.

## 6. Retirer coach

On `/parametres` page, add "Mon coach" card:
- Shows: coach name, assignment date
- "Retirer le coach" button → sets `status = REVOKED`
- Coach loses access immediately (scope recalculated)
- **No remove button on coach side**

## 7. Exclusions institution

On `/coach/cockpit`, Institutions tab → click institution → "Périmètre" section:
- List of included managers (all by default)
- Multi-select to exclude managers
- Saved in `excludedManagerIds` on the assignment

## 8. Mock Data

Add to mock data:
- 1 coach user (e.g., "Coach Pierre") with `role: "coach"`, `availableRoles: ["coach"]`
- 3 assignments: 1 AGENT, 1 MANAGER, 1 INSTITUTION
- Sample actions and 1 active plan

## File inventory

### New files
- `src/types/coach.ts` — types
- `src/lib/coach.ts` — scope function, plan generation
- `src/hooks/use-coach-data.ts` — aggregation hook
- `src/data/mock-coach.ts` — mock assignments/actions/plans
- `src/app/(dashboard)/coach/layout.tsx` — role guard
- `src/app/(dashboard)/coach/cockpit/page.tsx` — cockpit 3 tabs
- `src/app/(dashboard)/coach/[userId]/page.tsx` — user detail
- `src/components/coach/coach-panel.tsx` — actions + plan panel
- `src/components/coach/coach-plan-editor.tsx` — plan 30j editor
- `src/components/coach/ratio-thresholds.tsx` — threshold editor
- `supabase/migrations/012_coach_tables.sql` — SQL migration

### Modified files
- `src/stores/app-store.ts` — add coach state + actions
- `src/components/layout/sidebar.tsx` — add Coach section
- `src/components/layout/header.tsx` — add coach page titles
- `src/app/(dashboard)/layout.tsx` — coach role handling
- `src/data/mock-users.ts` — add coach user
- `src/app/(dashboard)/parametres/page.tsx` — add "Mon coach" card (or create if missing)
