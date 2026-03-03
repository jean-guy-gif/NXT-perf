# Coach V2 — Target-Based Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add target-based coach routing, structured plan actions with draft/validated lifecycle, and a repository abstraction layer — all built on top of the existing coach implementation.

**Architecture:** New routes under `/coach/dashboard` and `/coach/targets/[targetType]/[targetId]` coexist with existing `/coach/cockpit` and `/coach/[userId]`. A `coachRepo` facade wraps Zustand store access. The `useCoachTargetData` hook returns scope-appropriate data per target type.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand 5, Tailwind CSS 4, Lucide icons.

**NOTE:** This project has no test infrastructure set up (no Jest/Vitest config). Skip TDD steps — write implementation directly and verify with `npx next build`.

---

## Task 1: Enhance Coach Types

**Files:**
- Modify: `src/types/coach.ts` (all lines)

**Step 1: Add CoachPlanAction type and enhance CoachPlan/CoachPlanWeek**

Replace the entire file with:

```typescript
import type { RatioId } from "./ratios";

export type CoachTargetType = "AGENT" | "MANAGER" | "INSTITUTION";
export type AssignmentStatus = "ACTIVE" | "REVOKED";
export type CoachActionStatus = "TODO" | "DONE";
export type CoachPlanStatus = "DRAFT" | "VALIDATED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface CoachAssignment {
  id: string;
  coachId: string;
  targetType: CoachTargetType;
  targetId: string;
  status: AssignmentStatus;
  excludedManagerIds: string[] | null;
  createdAt: string;
}

export interface CoachAction {
  id: string;
  coachAssignmentId: string;
  title: string;
  status: CoachActionStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface CoachPlanAction {
  id: string;
  label: string;
  frequency: string;
  channel: string;
  proof: string;
  linkedKpi: RatioId | null;
  done: boolean;
}

export interface CoachPlanWeek {
  weekNumber: 1 | 2 | 3 | 4;
  focus: string;
  actions: CoachPlanAction[];
}

export interface CoachPlan {
  id: string;
  coachAssignmentId: string;
  title: string;
  objective: string;
  startDate: string;
  status: CoachPlanStatus;
  weeks: CoachPlanWeek[];
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Type errors in files that use old `CoachPlanWeek` shape (string[] → CoachPlanAction[]). That's expected — we fix them in following tasks.

**Step 3: Commit**

```bash
git add src/types/coach.ts
git commit -m "feat(coach): enhance types with CoachPlanAction, plan title/objective, draft/validated status"
```

---

## Task 2: Update Mock Data

**Files:**
- Modify: `src/data/mock-coach.ts` (lines 169-225)

**Step 1: Rewrite mock plans with new shape**

Replace `mockCoachPlans` (from line 169 to end of file) with structured plans containing `CoachPlanAction[]` weeks, plus `title` and `objective` fields. Each action needs: `id`, `label`, `frequency`, `channel`, `proof`, `linkedKpi`, `done`.

Example plan structure:
```typescript
{
  id: "cplan-1",
  coachAssignmentId: "ca-1",
  title: "Relance prospection",
  objective: "Améliorer le ratio Contacts → RDV de 25 à 15",
  startDate: "2026-03-01",
  status: "VALIDATED" as const,
  weeks: [
    {
      weekNumber: 1 as const,
      focus: "Contacts → RDV",
      actions: [
        { id: "pa-1-1-1", label: "Relancer les prospects non contactés", frequency: "quotidien", channel: "téléphone", proof: "CRM mis à jour", linkedKpi: "contacts_rdv" as const, done: true },
        { id: "pa-1-1-2", label: "Préparer un script d'appel", frequency: "1x", channel: "bureau", proof: "Script rédigé", linkedKpi: "contacts_rdv" as const, done: true },
      ],
    },
    // ... weeks 2-4
  ],
}
```

Keep all 4 existing plans but convert them. Set existing ACTIVE plans to VALIDATED, keep COMPLETED as COMPLETED.

**Step 2: Verify build**

Run: `npx next build`
Expected: Should get closer to passing (mock data now matches types). Some UI components may still fail.

**Step 3: Commit**

```bash
git add src/data/mock-coach.ts
git commit -m "feat(coach): update mock plans with structured actions, titles, and objectives"
```

---

## Task 3: Update Store Actions

**Files:**
- Modify: `src/stores/app-store.ts` (lines 143-151 interface, lines 590-619 implementation)

**Step 1: Add new plan lifecycle actions to the interface**

After line 149 (`cancelCoachPlan`), add:
```typescript
updateCoachPlan: (id: string, updates: Partial<CoachPlan>) => void;
validateCoachPlan: (id: string) => void;
revertCoachPlanToDraft: (id: string) => void;
```

**Step 2: Add implementations**

After line 605 (cancelCoachPlan implementation), add:
```typescript
updateCoachPlan: (id, updates) =>
  set((s) => ({
    coachPlans: s.coachPlans.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

validateCoachPlan: (id) =>
  set((s) => ({
    coachPlans: s.coachPlans.map((p) =>
      p.id === id ? { ...p, status: "VALIDATED" as const } : p
    ),
  })),

revertCoachPlanToDraft: (id) =>
  set((s) => ({
    coachPlans: s.coachPlans.map((p) =>
      p.id === id ? { ...p, status: "DRAFT" as const } : p
    ),
  })),
```

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/stores/app-store.ts
git commit -m "feat(coach): add updateCoachPlan, validateCoachPlan, revertToDraft store actions"
```

---

## Task 4: Update Plan Generation Logic

**Files:**
- Modify: `src/lib/coach.ts` (lines 68-102)

**Step 1: Rewrite `generateCoachPlanWeeks` to return structured actions**

The function signature stays the same but returns `CoachPlanWeek[]` with `CoachPlanAction[]` instead of `string[]`.

Add a helper mapping ratio → default frequency/channel/proof:
```typescript
const RATIO_DEFAULTS: Record<string, { frequency: string; channel: string; proof: string }> = {
  contacts_rdv: { frequency: "quotidien", channel: "téléphone", proof: "CRM mis à jour" },
  estimations_mandats: { frequency: "2x/semaine", channel: "terrain", proof: "CR estimation" },
  pct_mandats_exclusifs: { frequency: "par RDV", channel: "terrain", proof: "Mandat signé" },
  visites_offre: { frequency: "par visite", channel: "terrain", proof: "CR visite" },
  offres_compromis: { frequency: "par offre", channel: "bureau", proof: "Offre transmise" },
  mandats_simples_vente: { frequency: "hebdomadaire", channel: "téléphone", proof: "Rapport vendeur" },
  mandats_exclusifs_vente: { frequency: "hebdomadaire", channel: "mixte", proof: "Rapport marketing" },
};
```

Each action from `getActionsForRatio()` gets wrapped into a `CoachPlanAction` with an auto-generated `id`, default frequency/channel/proof from the mapping, `linkedKpi` set to the ratio, `done: false`.

**Step 2: Add `generateCoachPlan` helper**

New exported function that returns a full `CoachPlan` with:
- `id`: `"cplan-" + Date.now()`
- `title`: auto-generated from primary weak ratio name (e.g. "Plan : Contacts → RDV")
- `objective`: auto-generated (e.g. "Améliorer le ratio Contacts → RDV")
- `status`: `"DRAFT"`
- `startDate`: today's ISO date
- `weeks`: from `generateCoachPlanWeeks(ratios)`

```typescript
export function generateCoachPlan(
  ratios: ComputedRatio[],
  assignmentId: string
): CoachPlan
```

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/lib/coach.ts
git commit -m "feat(coach): structured plan generation with CoachPlanAction objects"
```

---

## Task 5: Fix Existing Coach Components (Adapt to New Types)

**Files:**
- Modify: `src/components/coach/coach-panel.tsx` (lines 250-310, plan display section)
- Modify: `src/components/coach/coach-plan-editor.tsx` (entire file)

**Step 1: Update coach-panel.tsx plan display**

The plan week display (lines 253-275) currently renders `week.actions` as strings. Update to render `CoachPlanAction[]`:
- Show each action's `label`
- Add a small checkmark if `action.done` is true
- Keep the same visual layout (week cards in 2-col grid)

**Step 2: Update coach-plan-editor.tsx**

The `EditableWeek` type (line 18-22) currently uses `actionsText: string` (one action per line). Rewrite to work with `CoachPlanAction[]`:
- Replace `actionsText` with `actions: CoachPlanAction[]`
- Each action row: label input + frequency input + channel dropdown + proof input + linkedKpi dropdown
- Use `generateCoachPlan()` instead of `generateCoachPlanWeeks()` for initial state
- Add title and objective fields at the top
- "Valider" button creates plan with status `"DRAFT"` (since creation starts as draft)

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/components/coach/coach-panel.tsx src/components/coach/coach-plan-editor.tsx
git commit -m "fix(coach): adapt panel and plan editor to structured CoachPlanAction types"
```

---

## Task 6: Create Repository Abstraction

**Files:**
- Create: `src/lib/coach-repo.ts`

**Step 1: Write the mock coach repository**

```typescript
import { useAppStore } from "@/stores/app-store";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";

function getState() {
  return useAppStore.getState();
}

export const coachRepo = {
  // Assignments
  getAssignments(coachId: string): CoachAssignment[] {
    return getState().coachAssignments.filter(
      (a) => a.coachId === coachId && a.status === "ACTIVE"
    );
  },

  revokeAssignment(id: string): void {
    getState().revokeCoachAssignment(id);
  },

  updateExcludedManagers(id: string, excluded: string[]): void {
    getState().updateExcludedManagers(id, excluded);
  },

  // Plans
  getPlans(assignmentId: string): CoachPlan[] {
    return getState().coachPlans.filter((p) => p.coachAssignmentId === assignmentId);
  },

  getActivePlan(assignmentId: string): CoachPlan | null {
    return (
      getState().coachPlans.find(
        (p) =>
          p.coachAssignmentId === assignmentId &&
          (p.status === "ACTIVE" || p.status === "VALIDATED" || p.status === "DRAFT")
      ) ?? null
    );
  },

  createPlan(plan: CoachPlan): void {
    getState().createCoachPlan(plan);
  },

  updatePlan(id: string, updates: Partial<CoachPlan>): void {
    getState().updateCoachPlan(id, updates);
  },

  validatePlan(id: string): void {
    getState().validateCoachPlan(id);
  },

  revertToDraft(id: string): void {
    getState().revertCoachPlanToDraft(id);
  },

  completePlan(id: string): void {
    getState().completeCoachPlan(id);
  },

  // Actions
  getActions(assignmentId: string): CoachAction[] {
    return getState().coachActions.filter((a) => a.coachAssignmentId === assignmentId);
  },

  addAction(action: CoachAction): void {
    getState().addCoachAction(action);
  },

  toggleAction(id: string): void {
    getState().toggleCoachAction(id);
  },

  removeAction(id: string): void {
    getState().removeCoachAction(id);
  },
};
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/lib/coach-repo.ts
git commit -m "feat(coach): add coachRepo abstraction over Zustand store"
```

---

## Task 7: Create `useCoachTargetData` Hook

**Files:**
- Create: `src/hooks/use-coach-target-data.ts`

**Step 1: Write the hook**

The hook takes `(targetType: CoachTargetType, targetId: string)` and returns scope-appropriate data:

```typescript
"use client";
import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import type { CoachTargetType, CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
```

Logic:
1. Find the assignment matching `(coachId, targetType, targetId)` where coachId comes from current user
2. Get actions + plans for that assignment
3. Based on `targetType`:
   - **INSTITUTION**: filter all org users, compute per-user ratios, aggregate into `agencyKpis`, `managersAggregate`, `advisorsAggregate`
   - **MANAGER**: find manager user + their team agents, compute ratios, return `managerUser`, `managerRatios`, `teamAdvisors`
   - **AGENT**: find the single user, compute ratios, return `advisorUser`, `advisorRatios`
4. Compute `weakKpis` (danger + warning ratios from the primary scope)

Return type:
```typescript
interface CoachTargetData {
  assignment: CoachAssignment | null;
  activePlan: CoachPlan | null;
  plans: CoachPlan[];
  actions: CoachAction[];
  weakKpis: ComputedRatio[];
  // INSTITUTION
  agencyKpis: { totalCA: number; totalActes: number; avgScore: number; alertCount: number } | null;
  managersAggregate: Array<{ user: User; teamSize: number; avgScore: number; alertCount: number }> | null;
  advisorsAggregate: Array<{ user: User; avgScore: number; alertCount: number; ratios: ComputedRatio[] }> | null;
  // MANAGER
  managerUser: User | null;
  managerRatios: ComputedRatio[] | null;
  teamAdvisors: Array<{ user: User; avgScore: number; alertCount: number; ratios: ComputedRatio[] }> | null;
  // AGENT
  advisorUser: User | null;
  advisorRatios: ComputedRatio[] | null;
}
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/hooks/use-coach-target-data.ts
git commit -m "feat(coach): add useCoachTargetData hook for scope-aware data"
```

---

## Task 8: Create Coach Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/coach/dashboard/page.tsx`

**Step 1: Write the dashboard page**

This is the new entry point for the coach. It shows all assignments as cards grouped by type.

Layout:
- Page header: "Tableau de bord Coach" + subtitle
- 3 sections: Institutions / Managers / Conseillers (show non-empty sections only)
- Each assignment card shows:
  - Target name (org name for INSTITUTION, user name for MANAGER/AGENT)
  - Target type badge
  - Stats: alert count, active plan status
  - Click → navigate to `/coach/targets/[targetType]/[targetId]`

Use `useCoachData(coachId)` (existing hook) for the overview data. For each assignment, derive the target display name from the users/institutions list.

Match the visual style of the existing coach cockpit (cards with rounded-xl borders, score colors, category badges).

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/coach/dashboard/page.tsx
git commit -m "feat(coach): add target-selector dashboard page"
```

---

## Task 9: Create Shared Coach Components

**Files:**
- Create: `src/components/coach/target-header.tsx`
- Create: `src/components/coach/scope-kpi-grid.tsx`

**Step 1: Write target-header.tsx**

A breadcrumb + target info bar used on all target pages:
```
← Tableau de bord  /  [TargetType badge]  [Target Name]
```

Props: `targetType: CoachTargetType`, `targetName: string`, `backHref?: string`

Uses `Link` from next/link, Lucide `ArrowLeft`. Type badge: color-coded pill (INSTITUTION=purple, MANAGER=blue, AGENT=green).

**Step 2: Write scope-kpi-grid.tsx**

A reusable KPI grid that adapts to the data passed:

Props:
```typescript
{
  kpis: Array<{ label: string; value: string; icon: LucideIcon }>;
}
```

Renders a responsive grid (2 cols on mobile, 4 on desktop) of KPI cards matching the existing `KpiCard` pattern from `/coach/[userId]/page.tsx` (lines 22-40).

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/components/coach/target-header.tsx src/components/coach/scope-kpi-grid.tsx
git commit -m "feat(coach): add TargetHeader and ScopeKpiGrid shared components"
```

---

## Task 10: Create Target Scope View Page

**Files:**
- Create: `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/page.tsx`

**Step 1: Write the dynamic scope view**

This page reads `targetType` and `targetId` from URL params and renders the appropriate view.

Use `useCoachTargetData(targetType, targetId)` for all data.

**INSTITUTION view:**
- `<TargetHeader>` with org name
- `<ScopeKpiGrid>` with agency-level KPIs (CA total, actes total, score moyen, alertes)
- Managers table: name, team size, avg score, alert count — each row clickable → `/coach/targets/MANAGER/[managerId]`
- Advisors table: name, category badge, avg score, alert count — each row clickable → `/coach/targets/AGENT/[agentId]`
- All data read-only

**MANAGER view:**
- `<TargetHeader>` with manager name
- `<ScopeKpiGrid>` with manager personal KPIs
- Manager ratio grid (same pattern as existing coach detail page lines 149-203)
- Team advisors list with individual scores
- All data read-only

**AGENT view:**
- `<TargetHeader>` with advisor name
- `<ScopeKpiGrid>` with advisor KPIs (CA, actes, mandats, % exclusivité)
- Full ratio grid with status badges + progress bars
- All data read-only

All views include:
- CoachPanel (existing component) for quick actions
- Link button: "Plan 30 jours →" navigating to `./plan`

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add "src/app/(dashboard)/coach/targets/[targetType]/[targetId]/page.tsx"
git commit -m "feat(coach): add dynamic target scope view with INSTITUTION/MANAGER/AGENT layouts"
```

---

## Task 11: Create Plan Editor Page

**Files:**
- Create: `src/app/(dashboard)/coach/targets/[targetType]/[targetId]/plan/page.tsx`
- Create: `src/components/coach/plan-action-row.tsx`

**Step 1: Write plan-action-row.tsx**

A single structured action row used in the plan editor:

Props:
```typescript
{
  action: CoachPlanAction;
  onChange: (updated: CoachPlanAction) => void;
  onRemove: () => void;
  readOnly?: boolean;
}
```

Layout (single row, responsive):
- Checkbox for `done`
- `label` — text input (flex-1)
- `frequency` — small text input or dropdown (common values: quotidien, 2x/semaine, hebdomadaire, par RDV, 1x)
- `channel` — dropdown (téléphone, terrain, email, visio, bureau, mixte)
- `proof` — text input
- `linkedKpi` — dropdown of 7 ratios (from RatioId) + "Aucun" option
- Remove button (X icon)

When `readOnly`, all inputs become text displays.

**Step 2: Write the plan page**

Full-page plan editor. Uses `useCoachTargetData(targetType, targetId)` to get `activePlan` and `weakKpis`.

**States:**
- No plan exists → show "Générer un plan" button
- Plan exists (any status) → show editor

**Editor layout:**
- `<TargetHeader>` breadcrumb
- Status badge: DRAFT (yellow) / VALIDATED (green) / COMPLETED (gray)
- Title field (text input, large)
- Objective field (text input)
- 4 week sections:
  - Week number label
  - Focus field (text input)
  - Action rows (`<PlanActionRow>` for each)
  - "Ajouter une action" button (max 6 per week)
- Footer buttons:
  - If DRAFT: "Valider le plan" → calls `coachRepo.validatePlan(id)`
  - If VALIDATED: "Repasser en brouillon" → calls `coachRepo.revertToDraft(id)` / "Terminer le plan" → calls `coachRepo.completePlan(id)`
  - If COMPLETED: read-only view, no action buttons

**Generate flow:**
- Click "Générer un plan" → calls `generateCoachPlan(weakKpis, assignmentId)`
- Creates plan with status DRAFT via `coachRepo.createPlan(plan)`
- Editor opens with the draft

**Editing flow:**
- All changes go through local state (useState)
- Auto-save on change via `coachRepo.updatePlan(id, { title, objective, weeks })`
- Or explicit save button if preferred — use debounced save

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/components/coach/plan-action-row.tsx "src/app/(dashboard)/coach/targets/[targetType]/[targetId]/plan/page.tsx"
git commit -m "feat(coach): add full-page plan editor with structured action rows and draft/validate flow"
```

---

## Task 12: Update Sidebar Navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (line 59)

**Step 1: Change coach nav entry**

Replace line 59:
```typescript
{ href: "/coach/cockpit", icon: HeartHandshake, label: "Cockpit Coach", coachOnly: true },
```
With:
```typescript
{ href: "/coach/dashboard", icon: HeartHandshake, label: "Tableau de bord", coachOnly: true },
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(coach): update sidebar to point to new /coach/dashboard"
```

---

## Task 13: Full Build Verification + Smoke Test

**Step 1: Full build**

Run: `npx next build`
Expected: Clean build, zero errors.

**Step 2: Manual verification checklist (dev server)**

Run: `npx next dev --port 3000 --hostname 0.0.0.0`

Check:
- [ ] `/coach/dashboard` — shows assignment cards, grouped by type
- [ ] Click an INSTITUTION card → `/coach/targets/INSTITUTION/org-demo` — shows agency KPIs + drill-down tables
- [ ] Click a MANAGER card → `/coach/targets/MANAGER/m-demo-2` — shows manager KPIs + team list
- [ ] Click an AGENT card → `/coach/targets/AGENT/u-demo-1` — shows advisor KPIs + ratios
- [ ] From any target page, click "Plan 30 jours" → plan page
- [ ] "Générer un plan" creates a DRAFT plan with structured actions
- [ ] Edit title, objective, actions (frequency, channel, proof, linkedKpi)
- [ ] "Valider" → status changes to VALIDATED
- [ ] "Repasser en brouillon" → back to DRAFT
- [ ] "Terminer le plan" → COMPLETED, read-only
- [ ] Existing `/coach/cockpit` still works
- [ ] Existing `/coach/[userId]` still works
- [ ] Sidebar shows "Tableau de bord" for coach users

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(coach): polish coach v2 after smoke test"
```
