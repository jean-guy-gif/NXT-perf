# Coach Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Coach role with multi-scope assignments (AGENT/MANAGER/INSTITUTION), a dedicated cockpit, action/plan management, threshold editing, and coaché-initiated revocation.

**Architecture:** Coach is a standalone role with dedicated routes under `/coach/*`. A central `useCoachData()` hook computes scope from assignments and filters existing data. Coach pages embed existing dashboard/performance components in a wrapper. All data is mock/Zustand first; SQL migration prepared but not executed.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand, Tailwind CSS, Radix UI, Lucide icons, Recharts.

**Design doc:** `docs/plans/2026-03-02-coach-feature-design.md`

---

## Task 1: Types & business logic

**Files:**
- Create: `src/types/coach.ts`
- Modify: `src/types/user.ts:36-38` (add `hasCoachAccess`)
- Create: `src/lib/coach.ts`

**Step 1: Create coach types**

Create `src/types/coach.ts`:

```typescript
export type CoachTargetType = "AGENT" | "MANAGER" | "INSTITUTION";
export type AssignmentStatus = "ACTIVE" | "REVOKED";
export type CoachActionStatus = "TODO" | "DONE";
export type CoachPlanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

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

export interface CoachPlanWeek {
  weekNumber: 1 | 2 | 3 | 4;
  focus: string;
  actions: string[];
}

export interface CoachPlan {
  id: string;
  coachAssignmentId: string;
  startDate: string;
  status: CoachPlanStatus;
  weeks: CoachPlanWeek[];
}
```

**Step 2: Add `hasCoachAccess` helper**

In `src/types/user.ts`, after `hasDirectorAccess` (line 38), add:

```typescript
export function hasCoachAccess(user: User | null): boolean {
  return hasRole(user, "coach");
}
```

**Step 3: Create coach business logic**

Create `src/lib/coach.ts`:

```typescript
import type { CoachAssignment, CoachPlanWeek } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
import { getActionsForRatio } from "@/lib/formation";

/**
 * Returns all userIds accessible to a coach based on their active assignments.
 */
export function getCoachScopeUserIds(
  assignments: CoachAssignment[],
  users: User[]
): Set<string> {
  const ids = new Set<string>();

  const active = assignments.filter((a) => a.status === "ACTIVE");

  for (const assignment of active) {
    switch (assignment.targetType) {
      case "AGENT":
        ids.add(assignment.targetId);
        break;

      case "MANAGER": {
        ids.add(assignment.targetId);
        const teamAgents = users.filter(
          (u) => u.managerId === assignment.targetId && u.role === "conseiller"
        );
        for (const agent of teamAgents) ids.add(agent.id);
        break;
      }

      case "INSTITUTION": {
        const excluded = new Set(assignment.excludedManagerIds ?? []);
        const orgUsers = users.filter(
          (u) => u.institutionId === assignment.targetId
        );
        for (const u of orgUsers) {
          if (u.role === "manager" || u.role === "directeur") {
            if (!excluded.has(u.id)) {
              ids.add(u.id);
            }
          } else if (u.role === "conseiller") {
            if (!u.managerId || !excluded.has(u.managerId)) {
              ids.add(u.id);
            }
          }
        }
        break;
      }
    }
  }

  return ids;
}

/**
 * Auto-generate a 30-day coach plan from weak ratios.
 */
export function generateCoachPlanWeeks(
  ratios: ComputedRatio[]
): CoachPlanWeek[] {
  const weak = ratios
    .filter((r) => r.status === "danger" || r.status === "warning")
    .sort((a, b) => {
      const priority = { danger: 0, warning: 1, ok: 2 };
      return priority[a.status] - priority[b.status];
    });

  if (weak.length === 0) {
    return [
      { weekNumber: 1, focus: "Maintien de la performance", actions: ["Continuer les bonnes pratiques actuelles"] },
      { weekNumber: 2, focus: "Maintien de la performance", actions: ["Consolider les acquis"] },
      { weekNumber: 3, focus: "Développement", actions: ["Explorer de nouvelles opportunités"] },
      { weekNumber: 4, focus: "Développement", actions: ["Bilan et objectifs suivants"] },
    ];
  }

  const primary = weak[0];
  const secondary = weak[1] ?? weak[0];

  const primaryActions = getActionsForRatio(primary.ratioId).slice(0, 2).map((a) => a.label);
  const secondaryActions = getActionsForRatio(secondary.ratioId).slice(0, 2).map((a) => a.label);

  return [
    { weekNumber: 1, focus: primary.label, actions: primaryActions.length > 0 ? primaryActions : ["Analyser les causes"] },
    { weekNumber: 2, focus: primary.label, actions: ["Mettre en pratique les actions de S1", "Mesurer les premiers résultats"] },
    { weekNumber: 3, focus: secondary.label, actions: secondaryActions.length > 0 ? secondaryActions : ["Identifier les axes d'amélioration"] },
    { weekNumber: 4, focus: secondary.label, actions: ["Consolider les acquis", "Bilan du plan 30 jours"] },
  ];
}
```

**Step 4: Commit**

```bash
git add src/types/coach.ts src/types/user.ts src/lib/coach.ts
git commit -m "feat(coach): add types, scope function, and plan generation"
```

---

## Task 2: Mock data

**Files:**
- Create: `src/data/mock-coach.ts`
- Modify: `src/data/mock-users.ts` (add coach user at end of array)

**Step 1: Add coach user to mock-users**

In `src/data/mock-users.ts`, add at end of `mockUsers` array (before the closing `]`):

```typescript
  // ── Coach ──
  {
    id: "coach-1",
    email: "coach@demo.fr",
    password: "demo",
    firstName: "Pierre",
    lastName: "Durand",
    role: "coach",
    availableRoles: ["coach"],
    category: "expert",
    teamId: "team-demo",
    createdAt: "2024-01-01T00:00:00Z",
    onboardingStatus: "DONE",
    profileType: "COACH",
    institutionId: "org-demo",
  },
```

**Step 2: Create mock coach data**

Create `src/data/mock-coach.ts`:

```typescript
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";

export const mockCoachAssignments: CoachAssignment[] = [
  {
    id: "ca-1",
    coachId: "coach-1",
    targetType: "AGENT",
    targetId: "u-demo-1",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "ca-2",
    coachId: "coach-1",
    targetType: "MANAGER",
    targetId: "m-beta",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "ca-3",
    coachId: "coach-1",
    targetType: "INSTITUTION",
    targetId: "org-demo",
    status: "ACTIVE",
    excludedManagerIds: null,
    createdAt: "2026-02-15T00:00:00Z",
  },
];

export const mockCoachActions: CoachAction[] = [
  {
    id: "cact-1",
    coachAssignmentId: "ca-1",
    title: "Relancer les 5 leads en attente",
    status: "TODO",
    dueDate: "2026-03-10",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "cact-2",
    coachAssignmentId: "ca-1",
    title: "Préparer script d'appel prospection",
    status: "DONE",
    dueDate: null,
    createdAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "cact-3",
    coachAssignmentId: "ca-2",
    title: "Former l'équipe sur l'argumentaire exclusivité",
    status: "TODO",
    dueDate: "2026-03-15",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

export const mockCoachPlans: CoachPlan[] = [
  {
    id: "cplan-1",
    coachAssignmentId: "ca-1",
    startDate: "2026-03-01",
    status: "ACTIVE",
    weeks: [
      { weekNumber: 1, focus: "Contacts → RDV", actions: ["Relancer les prospects non contactés", "Préparer un script d'appel"] },
      { weekNumber: 2, focus: "Contacts → RDV", actions: ["Mettre en pratique les actions de S1", "Mesurer les premiers résultats"] },
      { weekNumber: 3, focus: "Estimations → Mandats", actions: ["Revoir l'argumentation prix", "Préparer un dossier comparatif"] },
      { weekNumber: 4, focus: "Estimations → Mandats", actions: ["Consolider les acquis", "Bilan du plan 30 jours"] },
    ],
  },
];
```

**Step 3: Commit**

```bash
git add src/data/mock-coach.ts src/data/mock-users.ts
git commit -m "feat(coach): add mock coach user, assignments, actions, and plans"
```

---

## Task 3: Zustand store — coach state & actions

**Files:**
- Modify: `src/stores/app-store.ts`

**Step 1: Add imports at top of file**

Add to imports (line ~1-10):

```typescript
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import { mockCoachAssignments, mockCoachActions, mockCoachPlans } from "@/data/mock-coach";
```

**Step 2: Add coach state fields to AppState interface**

After line 52 (`teamInfos: TeamInfo[];`), add:

```typescript
  // ── Coach ──
  coachAssignments: CoachAssignment[];
  coachActions: CoachAction[];
  coachPlans: CoachPlan[];
```

**Step 3: Add coach actions to AppState interface**

After `completeOnboarding` (line 93), before the closing `}`, add:

```typescript
  // ── Coach actions ──
  addCoachAction: (action: CoachAction) => void;
  toggleCoachAction: (id: string) => void;
  removeCoachAction: (id: string) => void;
  createCoachPlan: (plan: CoachPlan) => void;
  completeCoachPlan: (id: string) => void;
  cancelCoachPlan: (id: string) => void;
  revokeCoachAssignment: (assignmentId: string) => void;
  updateExcludedManagers: (assignmentId: string, managerIds: string[]) => void;
```

**Step 4: Add initial state values**

After line 105 (`ratioConfigs: ...`), add:

```typescript
  coachAssignments: [],
  coachActions: [],
  coachPlans: [],
```

**Step 5: Load mock coach data in `enterDemo()`**

In the `enterDemo` function body (around line 115), after the existing mock data loads, add:

```typescript
      coachAssignments: mockCoachAssignments,
      coachActions: mockCoachActions,
      coachPlans: mockCoachPlans,
```

**Step 6: Add coach action implementations**

Add before the closing `}))` of the store:

```typescript
  addCoachAction: (action) =>
    set((s) => ({ coachActions: [...s.coachActions, action] })),

  toggleCoachAction: (id) =>
    set((s) => ({
      coachActions: s.coachActions.map((a) =>
        a.id === id ? { ...a, status: a.status === "TODO" ? "DONE" : "TODO" } : a
      ),
    })),

  removeCoachAction: (id) =>
    set((s) => ({
      coachActions: s.coachActions.filter((a) => a.id !== id),
    })),

  createCoachPlan: (plan) =>
    set((s) => ({ coachPlans: [...s.coachPlans, plan] })),

  completeCoachPlan: (id) =>
    set((s) => ({
      coachPlans: s.coachPlans.map((p) =>
        p.id === id ? { ...p, status: "COMPLETED" as const } : p
      ),
    })),

  cancelCoachPlan: (id) =>
    set((s) => ({
      coachPlans: s.coachPlans.map((p) =>
        p.id === id ? { ...p, status: "CANCELLED" as const } : p
      ),
    })),

  revokeCoachAssignment: (assignmentId) =>
    set((s) => ({
      coachAssignments: s.coachAssignments.map((a) =>
        a.id === assignmentId ? { ...a, status: "REVOKED" as const } : a
      ),
    })),

  updateExcludedManagers: (assignmentId, managerIds) =>
    set((s) => ({
      coachAssignments: s.coachAssignments.map((a) =>
        a.id === assignmentId ? { ...a, excludedManagerIds: managerIds } : a
      ),
    })),
```

**Step 7: Commit**

```bash
git add src/stores/app-store.ts
git commit -m "feat(coach): add coach state and actions to Zustand store"
```

---

## Task 4: useCoachData hook

**Files:**
- Create: `src/hooks/use-coach-data.ts`

**Step 1: Create the hook**

Create `src/hooks/use-coach-data.ts`:

```typescript
"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCoachScopeUserIds } from "@/lib/coach";
import { computeAllRatios, computeRatioValue, determineRatioStatus } from "@/lib/ratios";
import { defaultRatioConfigs } from "@/lib/constants";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

export interface CoachUserSummary {
  user: User;
  results: PeriodResults | undefined;
  ratios: ComputedRatio[];
  alertRatios: ComputedRatio[];
  avgScore: number;
  lastAction: CoachAction | undefined;
  activePlan: CoachPlan | undefined;
  assignment: CoachAssignment;
}

export function useCoachData(coachId: string) {
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const coachAssignments = useAppStore((s) => s.coachAssignments);
  const coachActions = useAppStore((s) => s.coachActions);
  const coachPlans = useAppStore((s) => s.coachPlans);

  return useMemo(() => {
    const myAssignments = coachAssignments.filter(
      (a) => a.coachId === coachId && a.status === "ACTIVE"
    );

    const scopeIds = getCoachScopeUserIds(myAssignments, users);
    const scopedUsers = users.filter((u) => scopeIds.has(u.id));

    const summaries: CoachUserSummary[] = scopedUsers.map((user) => {
      const userResults = results.find((r) => r.userId === user.id);
      const ratios = userResults
        ? computeAllRatios(userResults, user.category, ratioConfigs)
        : [];
      const alertRatios = ratios.filter(
        (r) => r.status === "danger" || r.status === "warning"
      );
      const avgScore =
        ratios.length > 0
          ? Math.round(
              ratios.reduce((sum, r) => sum + (r.percentageOfTarget ?? 0), 0) /
                ratios.length
            )
          : 0;

      // Find assignment for this user
      const assignment = myAssignments.find((a) => {
        if (a.targetType === "AGENT") return a.targetId === user.id;
        if (a.targetType === "MANAGER") return a.targetId === user.id || user.managerId === a.targetId;
        if (a.targetType === "INSTITUTION") return user.institutionId === a.targetId;
        return false;
      })!;

      const userActions = coachActions
        .filter((act) => act.coachAssignmentId === assignment?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const activePlan = coachPlans.find(
        (p) => p.coachAssignmentId === assignment?.id && p.status === "ACTIVE"
      );

      return {
        user,
        results: userResults,
        ratios,
        alertRatios,
        avgScore,
        lastAction: userActions[0],
        activePlan,
        assignment,
      };
    });

    // Group by role
    const institutions = myAssignments.filter((a) => a.targetType === "INSTITUTION");
    const managers = summaries.filter(
      (s) => s.user.role === "manager" || s.user.role === "directeur"
    );
    const conseillers = summaries.filter((s) => s.user.role === "conseiller");

    return {
      assignments: myAssignments,
      scopedUsers,
      summaries,
      institutions,
      managers,
      conseillers,
    };
  }, [coachId, users, results, ratioConfigs, coachAssignments, coachActions, coachPlans]);
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-coach-data.ts
git commit -m "feat(coach): add useCoachData hook for scope aggregation"
```

---

## Task 5: Navigation — sidebar, header, layout

**Files:**
- Modify: `src/components/layout/sidebar.tsx:24-115`
- Modify: `src/components/layout/header.tsx:13-29`
- Create: `src/app/(dashboard)/coach/layout.tsx`

**Step 1: Update sidebar NavItem interface and items**

In `src/components/layout/sidebar.tsx`:

Add to NavItem interface (line 29, before closing `}`):
```typescript
  coachOnly?: boolean;
```

Add coach items to navItems array (after line 56, before parametres):
```typescript
  { href: "/coach/cockpit", icon: HeartHandshake, label: "Cockpit Coach", coachOnly: true },
```

Add `HeartHandshake` to Lucide imports at top of file.

**Step 2: Update sidebar filtering logic**

In `Sidebar()` component (around line 63-75):

After `const isDirector = ...` (line 65), add:
```typescript
  const isCoach = roles.includes("coach");
```

Update `filteredItems` filter (line 67-71):
```typescript
  const filteredItems = navItems.filter((item) => {
    if (item.managerOnly) return isManager;
    if (item.directorOnly) return isDirector;
    if (item.coachOnly) return isCoach;
    return true;
  });
```

Add after line 75:
```typescript
  const coachItems = filteredItems.filter((item) => item.coachOnly);
```

**Step 3: Render coach section in sidebar JSX**

After the director section block (after line 115), add:
```typescript
      {coachItems.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-sidebar-border" />
          <div className="flex flex-col items-center gap-1">
            {coachItems.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </>
      )}
```

**Step 4: Update header page titles**

In `src/components/layout/header.tsx`, add to `pageTitles` (after line 28):
```typescript
  "/coach/cockpit": "Cockpit Coach",
```

**Step 5: Create coach layout**

Create `src/app/(dashboard)/coach/layout.tsx`:
```typescript
"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];

  if (!roles.includes("coach")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
```

**Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/header.tsx src/app/(dashboard)/coach/layout.tsx
git commit -m "feat(coach): add sidebar navigation, page titles, and layout guard"
```

---

## Task 6: Coach Cockpit page

**Files:**
- Create: `src/app/(dashboard)/coach/cockpit/page.tsx`

**Step 1: Create the cockpit page**

Create `src/app/(dashboard)/coach/cockpit/page.tsx`:

This is a large page with 3 tabs: Institutions / Managers / Conseillers.

Each tab shows a list of items from `useCoachData()`. Each item displays:
- Name + category badge
- Average score (% of target)
- Alert ratios as colored badges
- Last coach action
- Click navigates to `/coach/[userId]`

Pattern follows `src/app/(dashboard)/directeur/cockpit/page.tsx` structure:
- Tabs component at top
- Card grid for each item
- Status badges for alert ratios
- Uses `useCoachData("coach-1")` to get all data (hardcoded coach ID for demo, will be dynamic with Supabase)

**Key implementation details:**
- Tab state via `useState<"institutions" | "managers" | "conseillers">("conseillers")`
- Institutions tab: show each INSTITUTION assignment with org name, total agents, total managers, global avg score
- Managers tab: show manager summaries from `useCoachData().managers`
- Conseillers tab: show agent summaries from `useCoachData().conseillers`
- Each card: clickable, navigates via `router.push(\`/coach/${user.id}\`)`
- Alert ratio badges: red for danger, orange for warning
- Last action: truncated title, or "Aucune action" in muted text

**Step 2: Commit**

```bash
git add src/app/(dashboard)/coach/cockpit/page.tsx
git commit -m "feat(coach): add coach cockpit page with 3-tab layout"
```

---

## Task 7: Coach user detail page

**Files:**
- Create: `src/app/(dashboard)/coach/[userId]/page.tsx`

**Step 1: Create user detail page**

Create `src/app/(dashboard)/coach/[userId]/page.tsx`:

This page shows the detailed view of a coached user. It:
1. Reads `userId` from URL params
2. Verifies userId is in coach scope (redirect if not)
3. Displays the user's KPIs and ratios (reusing existing components from dashboard)
4. Shows the CoachPanel component (Task 8)

Structure:
- Top: user name + category + back button to cockpit
- Middle: KPI cards (CA, Actes, Mandats, Exclusivité) + ratio status cards
- Bottom: CoachPanel with actions and plan 30j

Uses `useCoachData()` to get the user's summary, then renders:
- `KpiCard` components for main metrics
- Ratio status cards showing each ratio with value, threshold, and status badge
- `CoachPanel` component for actions/plan management

**Step 2: Commit**

```bash
git add src/app/(dashboard)/coach/[userId]/page.tsx
git commit -m "feat(coach): add coach user detail page with KPIs and ratios"
```

---

## Task 8: CoachPanel component (actions + plan)

**Files:**
- Create: `src/components/coach/coach-panel.tsx`
- Create: `src/components/coach/coach-plan-editor.tsx`

**Step 1: Create CoachPanel component**

Create `src/components/coach/coach-panel.tsx`:

Contains two sections:
1. **Actions** — list of max 3 active (TODO) actions + completed actions collapsed. "+" button opens inline form (title input + optional date). "Mark done" button per action.
2. **Plan 30j** — if active plan exists, show 4-week timeline. If not, show "Générer un plan" button.

Props:
```typescript
interface CoachPanelProps {
  assignmentId: string;
  userId: string;
  ratios: ComputedRatio[];
}
```

Uses store actions: `addCoachAction`, `toggleCoachAction`, `createCoachPlan`, `completeCoachPlan`.

**Step 2: Create plan editor component**

Create `src/components/coach/coach-plan-editor.tsx`:

Modal/drawer that shows the auto-generated plan (from `generateCoachPlanWeeks(ratios)`) with editable fields. Coach can modify focus and actions text before confirming.

Props:
```typescript
interface CoachPlanEditorProps {
  ratios: ComputedRatio[];
  assignmentId: string;
  onClose: () => void;
}
```

**Step 3: Commit**

```bash
git add src/components/coach/coach-panel.tsx src/components/coach/coach-plan-editor.tsx
git commit -m "feat(coach): add CoachPanel and plan editor components"
```

---

## Task 9: Ratio threshold editor for coach

**Files:**
- Create: `src/components/coach/ratio-thresholds.tsx`

**Step 1: Create threshold editor**

Create `src/components/coach/ratio-thresholds.tsx`:

Displays the 7 ratios with current thresholds for the coached user. Alert/warning ratios highlighted at top. Coach can edit threshold values.

Props:
```typescript
interface RatioThresholdsProps {
  userId: string;
  ratios: ComputedRatio[];
  targetType: CoachTargetType;
}
```

Features:
- Shows ratio name, current value, current threshold, status badge
- Input field to modify threshold for the user's category level
- If `targetType === "MANAGER"`: checkbox "Appliquer à l'équipe"
- If `targetType === "INSTITUTION"`: checkbox "Appliquer à tous (sauf exclusions)"
- Uses `updateRatioThreshold()` from store

**Step 2: Commit**

```bash
git add src/components/coach/ratio-thresholds.tsx
git commit -m "feat(coach): add ratio threshold editor for coach"
```

---

## Task 10: "Mon coach" card on parametres + revocation

**Files:**
- Modify: `src/app/(dashboard)/parametres/page.tsx`

**Step 1: Add "Mon coach" card**

In `src/app/(dashboard)/parametres/page.tsx`, add a section before the ratio thresholds table:

```typescript
// Find if current user has an active coach
const coachAssignments = useAppStore((s) => s.coachAssignments);
const users = useAppStore((s) => s.users);
const revokeCoachAssignment = useAppStore((s) => s.revokeCoachAssignment);

const myCoachAssignment = coachAssignments.find(
  (a) => a.status === "ACTIVE" && (
    (a.targetType === "AGENT" && a.targetId === user?.id) ||
    (a.targetType === "MANAGER" && a.targetId === user?.id) ||
    (a.targetType === "INSTITUTION" && a.targetId === user?.institutionId)
  )
);
const myCoach = myCoachAssignment
  ? users.find((u) => u.id === myCoachAssignment.coachId)
  : null;
```

Render card:
```tsx
{myCoach && myCoachAssignment && (
  <div className="rounded-xl border p-4 mb-6">
    <h3 className="font-semibold mb-2">Mon coach</h3>
    <p>{myCoach.firstName} {myCoach.lastName}</p>
    <p className="text-sm text-muted-foreground">
      Depuis le {new Date(myCoachAssignment.createdAt).toLocaleDateString("fr-FR")}
    </p>
    <button
      onClick={() => {
        if (confirm("Voulez-vous vraiment retirer votre coach ? Il perdra immédiatement l'accès à vos données.")) {
          revokeCoachAssignment(myCoachAssignment.id);
        }
      }}
      className="mt-3 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
    >
      Retirer le coach
    </button>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/parametres/page.tsx
git commit -m "feat(coach): add 'Mon coach' card with revocation on parametres page"
```

---

## Task 11: Institution exclusions UI

**Files:**
- Modify: `src/app/(dashboard)/coach/cockpit/page.tsx` (add exclusions panel in institution detail)

**Step 1: Add exclusions management to institution view**

In the Institutions tab of the coach cockpit, when an institution assignment is expanded/clicked, show:
- List of all managers in the org
- Checkboxes for each manager (checked = included, unchecked = excluded)
- Save button calls `updateExcludedManagers(assignmentId, excludedIds)`

Uses `useAppStore((s) => s.updateExcludedManagers)`.

**Step 2: Commit**

```bash
git add src/app/(dashboard)/coach/cockpit/page.tsx
git commit -m "feat(coach): add institution manager exclusions UI"
```

---

## Task 12: SQL migration (prepared, not executed)

**Files:**
- Create: `supabase/migrations/012_coach_tables.sql`

**Step 1: Create migration**

```sql
-- Coach assignments
CREATE TABLE IF NOT EXISTS coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('AGENT', 'MANAGER', 'INSTITUTION')),
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  excluded_manager_ids jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Coach actions
CREATE TABLE IF NOT EXISTS coach_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_assignment_id uuid NOT NULL REFERENCES coach_assignments(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'DONE')),
  due_date date DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Coach plans
CREATE TABLE IF NOT EXISTS coach_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_assignment_id uuid NOT NULL REFERENCES coach_assignments(id),
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  weeks jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_plans ENABLE ROW LEVEL SECURITY;

-- Coach can see their own assignments
CREATE POLICY "coach_own_assignments" ON coach_assignments
  FOR ALL USING (coach_id = auth.uid());

-- Coachés can see assignments targeting them
CREATE POLICY "target_view_assignments" ON coach_assignments
  FOR SELECT USING (
    target_type = 'AGENT' AND target_id = auth.uid()
    OR target_type = 'MANAGER' AND target_id = auth.uid()
    OR target_type = 'INSTITUTION' AND target_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Coachés can revoke their own assignment
CREATE POLICY "target_revoke_assignment" ON coach_assignments
  FOR UPDATE USING (
    target_type = 'AGENT' AND target_id = auth.uid()
    OR target_type = 'MANAGER' AND target_id = auth.uid()
  ) WITH CHECK (status = 'REVOKED');

-- Coach can manage actions on their assignments
CREATE POLICY "coach_own_actions" ON coach_actions
  FOR ALL USING (
    coach_assignment_id IN (SELECT id FROM coach_assignments WHERE coach_id = auth.uid())
  );

-- Coach can manage plans on their assignments
CREATE POLICY "coach_own_plans" ON coach_plans
  FOR ALL USING (
    coach_assignment_id IN (SELECT id FROM coach_assignments WHERE coach_id = auth.uid())
  );
```

**Step 2: Commit**

```bash
git add supabase/migrations/012_coach_tables.sql
git commit -m "feat(coach): add SQL migration for coach tables with RLS (not executed)"
```

---

## Task 13: Build verification & smoke test

**Step 1: Run build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 2: Manual smoke test checklist**

Run dev server (`npx next dev --port 3000 --hostname 0.0.0.0`), enter demo mode:

1. **Switch to coach**: Click role switch until you see coach role → sidebar shows "Cockpit Coach"
2. **Cockpit tabs**: `/coach/cockpit` → 3 tabs load, show coached users with scores and alert badges
3. **User detail**: Click an agent → `/coach/[userId]` → KPIs and ratios display correctly
4. **Add action**: In CoachPanel, create an action → appears in list → mark done → toggles to DONE
5. **Generate plan**: Click "Générer un plan" → plan appears with 4 weeks → can edit text
6. **Thresholds**: Modify a ratio threshold → value updates
7. **Exclusions**: Institutions tab → expand → exclude a manager → their agents disappear from scope
8. **Revoke**: Switch to an agent user → `/parametres` → "Mon coach" card visible → click "Retirer le coach" → coach card disappears
9. **Coach scope lost**: Switch back to coach → revoked agent no longer appears in cockpit

**Step 3: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix(coach): smoke test fixes"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|------------|-----------|---------------|
| 1 | Types & business logic | `src/types/coach.ts`, `src/lib/coach.ts` | `src/types/user.ts` |
| 2 | Mock data | `src/data/mock-coach.ts` | `src/data/mock-users.ts` |
| 3 | Zustand store | — | `src/stores/app-store.ts` |
| 4 | useCoachData hook | `src/hooks/use-coach-data.ts` | — |
| 5 | Navigation | `src/app/(dashboard)/coach/layout.tsx` | `sidebar.tsx`, `header.tsx` |
| 6 | Cockpit page | `src/app/(dashboard)/coach/cockpit/page.tsx` | — |
| 7 | User detail page | `src/app/(dashboard)/coach/[userId]/page.tsx` | — |
| 8 | CoachPanel + plan editor | `src/components/coach/coach-panel.tsx`, `coach-plan-editor.tsx` | — |
| 9 | Threshold editor | `src/components/coach/ratio-thresholds.tsx` | — |
| 10 | "Mon coach" + revocation | — | `parametres/page.tsx` |
| 11 | Institution exclusions | — | `coach/cockpit/page.tsx` |
| 12 | SQL migration | `supabase/migrations/012_coach_tables.sql` | — |
| 13 | Build & smoke test | — | — |
