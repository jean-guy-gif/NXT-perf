# Coach V2 — Target-Based Architecture Design

**Date:** 2026-03-03
**Branch:** `feat/institution-hierarchy`
**Strategy:** Build on top of existing coach implementation, migrate incrementally.

## Context

The existing coach system (Phase 4) uses user-centric routing (`/coach/[userId]`) with flat string plan actions. This redesign introduces:

- Target-based routing (`/coach/targets/[targetType]/[targetId]`)
- Structured plan actions (frequency, channel, proof, linkedKpi, done)
- Draft/Validated plan lifecycle
- Repository abstraction for future Supabase swap
- Scope-aware views (agency aggregate, manager+team, advisor detail)

Existing routes (`/coach/cockpit`, `/coach/[userId]`) remain functional during migration.

---

## 1. Data Model Enhancements

### New type: `CoachPlanAction`

```typescript
interface CoachPlanAction {
  id: string;
  label: string;
  frequency: string;          // "2x/semaine", "quotidien", "hebdomadaire"
  channel: string;            // "téléphone", "terrain", "email", "visio"
  proof: string;              // "CRM mis à jour", "CR visite", "photo mandat"
  linkedKpi: RatioId | null;  // links to one of the 7 core ratios
  done: boolean;
}
```

### Enhanced: `CoachPlanWeek`

```typescript
interface CoachPlanWeek {
  weekNumber: 1 | 2 | 3 | 4;
  focus: string;
  actions: CoachPlanAction[];  // was string[], now structured objects
}
```

### Enhanced: `CoachPlan`

```typescript
interface CoachPlan {
  id: string;
  coachAssignmentId: string;
  title: string;               // NEW — "Plan prospection Q1"
  objective: string;           // NEW — "Passer de 15% à 30% exclusivité"
  startDate: string;
  status: CoachPlanStatus;     // ENHANCED — adds DRAFT, VALIDATED
  weeks: CoachPlanWeek[];
}

type CoachPlanStatus = "DRAFT" | "VALIDATED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
```

### Unchanged types

- `CoachAssignment` — no changes
- `CoachAction` — no changes (these are assignment-level quick actions, separate from plan actions)
- `CoachTargetType` — stays `"AGENT" | "MANAGER" | "INSTITUTION"`

---

## 2. Repository Abstraction

**File:** `src/lib/coach-repo.ts`

```typescript
interface CoachRepo {
  // Assignments
  getAssignments(coachId: string): CoachAssignment[];
  revokeAssignment(id: string): void;
  updateExcludedManagers(id: string, excluded: string[]): void;

  // Plans
  getPlans(assignmentId: string): CoachPlan[];
  getActivePlan(assignmentId: string): CoachPlan | null;
  createPlan(plan: CoachPlan): void;
  updatePlan(id: string, updates: Partial<CoachPlan>): void;
  validatePlan(id: string): void;       // DRAFT → VALIDATED
  revertToDraft(id: string): void;      // VALIDATED → DRAFT
  completePlan(id: string): void;       // VALIDATED → COMPLETED

  // Actions (assignment-level)
  getActions(assignmentId: string): CoachAction[];
  addAction(action: CoachAction): void;
  toggleAction(id: string): void;
  removeAction(id: string): void;
}
```

**Mock implementation:** reads/writes Zustand store via `useAppStore.getState()`.
**Future Supabase implementation:** swaps in with same interface, uses `supabase.from(...)`.

---

## 3. Routing

### New routes

| Route | File | Purpose |
|---|---|---|
| `/coach/dashboard` | `src/app/(dashboard)/coach/dashboard/page.tsx` | Target selector + summary cards |
| `/coach/targets/[targetType]/[targetId]` | `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/page.tsx` | Scope-aware KPI view |
| `/coach/targets/[targetType]/[targetId]/plan` | `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/plan/page.tsx` | Plan editor + validate |

### Existing routes (kept, not modified)

| Route | Status |
|---|---|
| `/coach/cockpit` | Functional, sidebar updated to point to `/coach/dashboard` |
| `/coach/[userId]` | Functional, user-level detail still accessible |

### Sidebar change

Coach section: single entry `/coach/dashboard` (label "Tableau de bord", icon HeartHandshake).

---

## 4. Hook: `useCoachTargetData`

**File:** `src/hooks/use-coach-target-data.ts`

```typescript
function useCoachTargetData(targetType: CoachTargetType, targetId: string): {
  // Common fields
  assignment: CoachAssignment | null;
  activePlan: CoachPlan | null;
  plans: CoachPlan[];
  actions: CoachAction[];
  weakKpis: ComputedRatio[];

  // INSTITUTION scope
  agencyKpis?: { totalCA: number; totalActes: number; avgScore: number; alertCount: number };
  managersAggregate?: Array<{ user: User; teamSize: number; avgScore: number; alertCount: number }>;
  advisorsAggregate?: Array<{ user: User; avgScore: number; alertCount: number }>;

  // MANAGER scope
  managerKpis?: { avgScore: number; alertCount: number; teamSize: number };
  managerUser?: User;
  teamAdvisors?: Array<{ user: User; avgScore: number; alertCount: number; ratios: ComputedRatio[] }>;

  // AGENT scope
  advisorUser?: User;
  advisorKpis?: { avgScore: number; alertCount: number };
  advisorRatios?: ComputedRatio[];
}
```

Existing `useCoachData(coachId)` stays for the dashboard overview.

---

## 5. UI Pages

### `/coach/dashboard` — Target Selector

- Header: "Tableau de bord Coach"
- Assignment cards grouped by type (Institution / Manager / Agent)
- Each card shows: target name, alert count, plan status badge, click to navigate
- Navigation: click → `/coach/targets/[targetType]/[targetId]`

### `/coach/targets/[targetType]/[targetId]` — Scope View

Adapts based on targetType:

**INSTITUTION:**
- Agency-level KPI cards (CA total, actes total, score moyen, nb alertes)
- Managers aggregate table with drill-down
- Advisors aggregate table
- All read-only

**MANAGER:**
- Manager personal KPI cards
- Team aggregate stats
- Advisors list with individual scores
- All read-only

**AGENT:**
- Advisor personal KPI cards
- Full ratio grid with status badges
- All read-only

All views include:
- Back button to dashboard
- Target header (name + type badge)
- Quick actions panel (CoachPanel)
- Link to plan page

### `/coach/targets/[targetType]/[targetId]/plan` — Plan Editor

- Full-page (not modal)
- Header: plan title field + objective field
- Status badge: DRAFT / VALIDATED
- "Générer le plan" button (auto-fills from weak KPIs)
- 4-week grid, each week:
  - Focus field (text input)
  - Action rows: label, frequency, channel, proof, linkedKpi dropdown, done checkbox
  - "Ajouter une action" button (max 6 per week)
- Footer: "Valider le plan" (DRAFT → VALIDATED) or "Repasser en brouillon" (VALIDATED → DRAFT)
- Plan status flow: Generate → DRAFT → edit → VALIDATED → COMPLETED

---

## 6. Plan Generation (Enhanced)

`generateCoachPlanWeeks()` enhanced to return `CoachPlanAction[]`:

1. Select 2-3 weakest KPIs (danger first, then warning)
2. Map KPI → actions via `getActionsForRatio()` + new default mapping:
   - `contacts_rdv` → frequency: "quotidien", channel: "téléphone"
   - `estimations_mandats` → frequency: "2x/semaine", channel: "terrain"
   - `pct_mandats_exclusifs` → frequency: "par RDV", channel: "terrain"
   - etc.
3. Each action gets: id (generated), label, frequency, channel, proof (default), linkedKpi, done: false
4. Distribute across 4 weeks: setup → volume → optimize → consolidate
5. If no weak KPIs: generic maintenance template

New helper: `generateCoachPlan(ratios, assignmentId)` returns a full `CoachPlan` with status `"DRAFT"`, auto-generated title + objective.

---

## 7. Store Enhancements

New actions added to `app-store.ts`:

```typescript
// Plan lifecycle
updateCoachPlan(id: string, updates: Partial<CoachPlan>): void
validateCoachPlan(id: string): void     // DRAFT → VALIDATED
revertCoachPlanToDraft(id: string): void // VALIDATED → DRAFT
```

Existing `createCoachPlan` updated to accept the new plan shape with title/objective.

---

## 8. Mock Data Updates

`mock-coach.ts` plans updated to new shape:
- Add `title` and `objective` fields to all plans
- Convert `string[]` actions to `CoachPlanAction[]` objects
- Set appropriate statuses (existing ACTIVE → VALIDATED for demo)

---

## 9. File Inventory

### New files (10)
- `src/lib/coach-repo.ts` — repository abstraction
- `src/hooks/use-coach-target-data.ts` — scope-aware data hook
- `src/app/(dashboard)/coach/dashboard/page.tsx` — target selector
- `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/page.tsx` — scope view
- `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/plan/page.tsx` — plan editor page
- `src/components/coach/scope-kpi-grid.tsx` — reusable KPI grid
- `src/components/coach/target-header.tsx` — breadcrumb + target info
- `src/components/coach/plan-editor-page.tsx` — full-page plan editor component
- `src/components/coach/plan-action-row.tsx` — single structured action row

### Modified files (6)
- `src/types/coach.ts` — add CoachPlanAction, enhance CoachPlan/CoachPlanWeek
- `src/stores/app-store.ts` — add new plan lifecycle actions
- `src/data/mock-coach.ts` — update plans to new shape
- `src/lib/coach.ts` — enhance plan generation
- `src/components/layout/sidebar.tsx` — update coach nav link
- `src/components/coach/coach-panel.tsx` — use coachRepo instead of direct store access
