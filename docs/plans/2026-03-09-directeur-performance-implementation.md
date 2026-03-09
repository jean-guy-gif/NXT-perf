# Directeur Performance Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the directeur "Projection" page with a "Performance" page showing all 7 ratios collectively and individually across the entire agency, with month/year toggle.

**Architecture:** Reuse `useDirectorData()` for teams/conseillers/results and `useAgencyGPS()` for period (mois/année). The page has two view modes: Vue Collective (3-level hierarchy: agence → équipe → conseillers) and Vue Individuelle (dropdown + 7-ratio grid). Computation uses `computeAllRatios()` from `src/lib/ratios.ts`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, Recharts (ProgressBar)

---

### Task 1: Update sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx:61`

**Step 1: Change the projection nav item to performance**

In `sidebar.tsx`, line 61, change:
```typescript
{ href: "/directeur/projection", icon: TrendingUp, label: "Projection", directorOnly: true },
```
to:
```typescript
{ href: "/directeur/performance", icon: Gauge, label: "Performance", directorOnly: true },
```

Note: `Gauge` is already imported at line 9. `TrendingUp` import can stay (used elsewhere or not — no harm).

**Step 2: Verify the sidebar renders correctly**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: update sidebar nav from Projection to Performance"
```

---

### Task 2: Remove projection page and clean up hook

**Files:**
- Delete: `src/app/(dashboard)/directeur/projection/page.tsx`
- Modify: `src/hooks/use-agency-gps.ts:28-37` (remove `ProjectionEntry` type)
- Modify: `src/hooks/use-agency-gps.ts:285-312` (remove `projectionData` useMemo)
- Modify: `src/hooks/use-agency-gps.ts:337` (remove `projectionData` from return)

**Step 1: Delete the projection page**

```bash
rm src/app/(dashboard)/directeur/projection/page.tsx
```

**Step 2: Clean up use-agency-gps.ts**

Remove the `ProjectionEntry` interface (lines 29-37):
```typescript
// DELETE THIS:
export interface ProjectionEntry {
  id: string;
  name: string;
  niveau: "agence" | "equipe" | "conseiller";
  performance: number;
  status: PerformanceStatus;
  teamId?: string;
  teamName?: string;
}
```

Remove the `projectionData` useMemo block (lines 285-312):
```typescript
// DELETE THIS ENTIRE BLOCK:
const projectionData = useMemo<ProjectionEntry[]>(() => {
  // ... all content ...
}, [teams, allResults, ratioConfigs, orgStats]);
```

Remove `projectionData` from the return object (line 337):
```typescript
// Remove this line from the return:
projectionData,
```

**Step 3: Verify build**

Run: `npx next build`
Expected: Build succeeds. No references to `ProjectionEntry` or `projectionData` remain.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove projection page and ProjectionEntry type"
```

---

### Task 3: Create the Performance page — Vue Collective

**Files:**
- Create: `src/app/(dashboard)/directeur/performance/page.tsx`

**Step 1: Create the performance page with full implementation**

Create `src/app/(dashboard)/directeur/performance/page.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Gauge, Users as UsersIcon, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAgencyGPS, type PilotPeriod } from "@/hooks/use-agency-gps";
import { computeAllRatios } from "@/lib/ratios";
import { aggregateResults } from "@/lib/aggregate-results";
import { ProgressBar } from "@/components/charts/progress-bar";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import type { RatioId, RatioConfig, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

type ViewMode = "collective" | "individual";
type PerformanceStatus = "ok" | "warning" | "danger";

function getStatus(pct: number): PerformanceStatus {
  if (pct >= 80) return "ok";
  if (pct >= 60) return "warning";
  return "danger";
}

interface RatioAverage {
  id: RatioId;
  config: RatioConfig;
  avgValue: number;
  avgPct: number;
  status: PerformanceStatus;
}

function computeAverageRatios(
  conseillers: User[],
  allResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>
): RatioAverage[] {
  const allComputed: ComputedRatio[][] = [];
  for (const user of conseillers) {
    const results = allResults.find((r) => r.userId === user.id);
    if (!results) continue;
    allComputed.push(computeAllRatios(results, user.category, ratioConfigs));
  }
  if (allComputed.length === 0) return [];

  const ratioIds = Object.keys(ratioConfigs) as RatioId[];
  return ratioIds.map((id) => {
    const config = ratioConfigs[id];
    const values = allComputed
      .map((ratios) => ratios.find((r) => r.ratioId === id))
      .filter(Boolean) as ComputedRatio[];
    const avgValue =
      values.length > 0
        ? values.reduce((s, r) => s + r.value, 0) / values.length
        : 0;
    const avgPct =
      values.length > 0
        ? Math.round(
            values.reduce((s, r) => s + r.percentageOfTarget, 0) / values.length
          )
        : 0;
    return { id, config, avgValue, avgPct, status: getStatus(avgPct) };
  });
}

export default function PerformancePage() {
  const { teams, allConseillers, allResults: directorResults, ratioConfigs } = useDirectorData();
  const { period, setPeriod, monthCount } = useAgencyGPS();
  const storeResults = useAppStore((s) => s.results);

  const [viewMode, setViewMode] = useState<ViewMode>("collective");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // ── Period-aware results ──
  const currentYear = new Date().getFullYear();
  const jan1 = `${currentYear}-01-01`;

  const latestResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults>();
    for (const r of storeResults) {
      const prev = byUser.get(r.userId);
      if (!prev || r.periodStart > prev.periodStart) byUser.set(r.userId, r);
    }
    return Array.from(byUser.values());
  }, [storeResults]);

  const ytdResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults[]>();
    for (const r of storeResults) {
      if (r.periodType === "month" && r.periodStart >= jan1) {
        if (!byUser.has(r.userId)) byUser.set(r.userId, []);
        byUser.get(r.userId)!.push(r);
      }
    }
    const agg: PeriodResults[] = [];
    for (const [, userResults] of byUser) {
      const a = aggregateResults(userResults);
      if (a) agg.push(a);
    }
    return agg;
  }, [storeResults, jan1]);

  const effectiveResults = period === "annee" ? ytdResults : latestResults;

  // ... (will be filled in step 2)
}
```

Wait — I should provide the complete file in one step. Let me write the full implementation.

**Step 1: Create the complete performance page**

Create file `src/app/(dashboard)/directeur/performance/page.tsx` with the full content below:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Gauge, Users as UsersIcon, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAgencyGPS, type PilotPeriod } from "@/hooks/use-agency-gps";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import { aggregateResults } from "@/lib/aggregate-results";
import { ProgressBar } from "@/components/charts/progress-bar";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import type { RatioId, RatioConfig, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

type ViewMode = "collective" | "individual";
type PerformanceStatus = "ok" | "warning" | "danger";

function getStatus(pct: number): PerformanceStatus {
  if (pct >= 80) return "ok";
  if (pct >= 60) return "warning";
  return "danger";
}

interface RatioAverage {
  id: RatioId;
  config: RatioConfig;
  avgValue: number;
  avgPct: number;
  status: PerformanceStatus;
}

function computeAverageRatios(
  conseillers: User[],
  allResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>
): RatioAverage[] {
  const allComputed: ComputedRatio[][] = [];
  for (const user of conseillers) {
    const results = allResults.find((r) => r.userId === user.id);
    if (!results) continue;
    allComputed.push(computeAllRatios(results, user.category, ratioConfigs));
  }
  if (allComputed.length === 0) return [];

  const ratioIds = Object.keys(ratioConfigs) as RatioId[];
  return ratioIds.map((id) => {
    const config = ratioConfigs[id];
    const values = allComputed
      .map((ratios) => ratios.find((r) => r.ratioId === id))
      .filter(Boolean) as ComputedRatio[];
    const avgValue =
      values.length > 0
        ? values.reduce((s, r) => s + r.value, 0) / values.length
        : 0;
    const avgPct =
      values.length > 0
        ? Math.round(
            values.reduce((s, r) => s + r.percentageOfTarget, 0) / values.length
          )
        : 0;
    return { id, config, avgValue, avgPct, status: getStatus(avgPct) };
  });
}

export default function PerformancePage() {
  const { teams, allConseillers, ratioConfigs } = useDirectorData();
  const { period, setPeriod, monthCount } = useAgencyGPS();
  const storeResults = useAppStore((s) => s.results);

  const [viewMode, setViewMode] = useState<ViewMode>("collective");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // ── Period-aware results ──
  const currentYear = new Date().getFullYear();
  const jan1 = `${currentYear}-01-01`;

  const latestResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults>();
    for (const r of storeResults) {
      const prev = byUser.get(r.userId);
      if (!prev || r.periodStart > prev.periodStart) byUser.set(r.userId, r);
    }
    return Array.from(byUser.values());
  }, [storeResults]);

  const ytdResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults[]>();
    for (const r of storeResults) {
      if (r.periodType === "month" && r.periodStart >= jan1) {
        if (!byUser.has(r.userId)) byUser.set(r.userId, []);
        byUser.get(r.userId)!.push(r);
      }
    }
    const agg: PeriodResults[] = [];
    for (const [, userResults] of byUser) {
      const a = aggregateResults(userResults);
      if (a) agg.push(a);
    }
    return agg;
  }, [storeResults, jan1]);

  const effectiveResults = period === "annee" ? ytdResults : latestResults;
  const periodLabel = period === "annee" ? `cumul ${monthCount} mois` : "ce mois";

  // ── Agency-level ratios ──
  const agencyRatios = useMemo(
    () => computeAverageRatios(allConseillers, effectiveResults, ratioConfigs),
    [allConseillers, effectiveResults, ratioConfigs]
  );

  const agencyGlobalAvg =
    agencyRatios.length > 0
      ? Math.round(agencyRatios.reduce((s, r) => s + r.avgPct, 0) / agencyRatios.length)
      : 0;
  const agencyGlobalStatus = getStatus(agencyGlobalAvg);

  // ── Team-level ratios ──
  const teamRatiosMap = useMemo(() => {
    const map = new Map<string, { ratios: RatioAverage[]; globalAvg: number; globalStatus: PerformanceStatus }>();
    for (const team of teams) {
      const ratios = computeAverageRatios(team.agents, effectiveResults, ratioConfigs);
      const globalAvg =
        ratios.length > 0
          ? Math.round(ratios.reduce((s, r) => s + r.avgPct, 0) / ratios.length)
          : 0;
      map.set(team.teamId, { ratios, globalAvg, globalStatus: getStatus(globalAvg) });
    }
    return map;
  }, [teams, effectiveResults, ratioConfigs]);

  // ── Individual selection ──
  const effectiveSelectedUserId = allConseillers.some((u) => u.id === selectedUserId)
    ? selectedUserId
    : (allConseillers[0]?.id ?? "");

  const selectedUser = allConseillers.find((u) => u.id === effectiveSelectedUserId);
  const selectedResults = effectiveResults.find((r) => r.userId === effectiveSelectedUserId);
  const selectedRatios =
    selectedResults && selectedUser
      ? computeAllRatios(selectedResults, selectedUser.category, ratioConfigs)
      : [];

  // ── Team toggle ──
  function toggleTeam(teamId: string) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  // ── Find team name for a user ──
  function getTeamName(userId: string): string {
    for (const team of teams) {
      if (team.agents.some((a) => a.id === userId)) return team.teamName;
    }
    return "";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Performance Agence</h1>
            <p className="text-sm text-muted-foreground">
              Ratios de performance — {periodLabel}
            </p>
          </div>
        </div>

        {/* Period toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setPeriod("mois")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              period === "mois"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Mois
          </button>
          <button
            onClick={() => setPeriod("annee")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              period === "annee"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Année
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setViewMode("collective")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "collective"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Collective
        </button>
        <button
          onClick={() => setViewMode("individual")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium",
            viewMode === "individual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Vue Individuelle
        </button>
      </div>

      {/* ── Vue Collective ── */}
      {viewMode === "collective" && (
        <div className="space-y-6">
          {/* Agency-level card */}
          <RatioGridCard
            icon={<Gauge className="h-5 w-5 text-primary" />}
            title="Performance moyenne de l'agence"
            subtitle={`Moyenne des ${allConseillers.length} conseillers sur chaque ratio`}
            ratios={agencyRatios}
            globalAvg={agencyGlobalAvg}
            globalStatus={agencyGlobalStatus}
          />

          {/* Team cards */}
          {teams.map((team) => {
            const teamData = teamRatiosMap.get(team.teamId);
            if (!teamData) return null;
            const isExpanded = expandedTeams.has(team.teamId);

            return (
              <div key={team.teamId} className="space-y-3">
                {/* Team header — clickable */}
                <button
                  onClick={() => toggleTeam(team.teamId)}
                  className="w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                        <UsersIcon className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{team.teamName}</p>
                        <p className="text-sm text-muted-foreground">
                          {team.agentCount} conseiller{team.agentCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Score global</p>
                        <p
                          className={cn(
                            "text-xl font-bold",
                            teamData.globalStatus === "ok"
                              ? "text-green-500"
                              : teamData.globalStatus === "warning"
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {teamData.globalAvg}%
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded: team ratio grid + conseiller cards */}
                {isExpanded && (
                  <div className="space-y-4 pl-4">
                    {/* Team ratio grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {teamData.ratios.map((r) => (
                        <RatioCard key={r.id} ratio={r} />
                      ))}
                    </div>

                    {/* Conseillers */}
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Détail par conseiller
                    </h4>
                    {team.agents.map((agent) => {
                      const res = effectiveResults.find((r) => r.userId === agent.id);
                      const ratios = res
                        ? computeAllRatios(res, agent.category, ratioConfigs)
                        : [];
                      const avgPerf =
                        ratios.length > 0
                          ? Math.round(
                              ratios.reduce((s, r) => s + r.percentageOfTarget, 0) /
                                ratios.length
                            )
                          : 0;

                      return (
                        <div
                          key={agent.id}
                          className="flex items-center gap-4 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                            {agent.firstName[0]}
                            {agent.lastName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">
                                {agent.firstName} {agent.lastName}
                              </p>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                                  CATEGORY_COLORS[agent.category]
                                )}
                              >
                                {CATEGORY_LABELS[agent.category]}
                              </span>
                            </div>
                            <ProgressBar
                              value={avgPerf}
                              status={getStatus(avgPerf)}
                              showValue={false}
                              size="sm"
                              className="mt-1"
                            />
                          </div>
                          <span
                            className={cn(
                              "shrink-0 text-sm font-semibold",
                              getStatus(avgPerf) === "ok"
                                ? "text-green-500"
                                : getStatus(avgPerf) === "warning"
                                  ? "text-orange-500"
                                  : "text-red-500"
                            )}
                          >
                            {avgPerf}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vue Individuelle ── */}
      {viewMode === "individual" && (
        <div className="space-y-6">
          <select
            value={effectiveSelectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {allConseillers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>

          {selectedUser && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {selectedUser.firstName[0]}
                    {selectedUser.lastName[0]}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          CATEGORY_COLORS[selectedUser.category]
                        )}
                      >
                        {CATEGORY_LABELS[selectedUser.category]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getTeamName(selectedUser.id)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRatios.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {selectedRatios.map((ratio) => {
                    const config = ratioConfigs[ratio.ratioId as RatioId];
                    if (!config) return null;
                    return (
                      <div
                        key={ratio.ratioId}
                        className={cn(
                          "rounded-xl border bg-card p-4",
                          ratio.status === "ok"
                            ? "border-green-500/20"
                            : ratio.status === "warning"
                              ? "border-orange-500/20"
                              : "border-red-500/20"
                        )}
                      >
                        <p className="text-xs text-muted-foreground">
                          {config.name}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xl font-bold",
                            ratio.status === "ok"
                              ? "text-green-500"
                              : ratio.status === "warning"
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {config.isPercentage
                            ? `${Math.round(ratio.value)}%`
                            : ratio.value.toFixed(1)}
                        </p>
                        <ProgressBar
                          value={ratio.percentageOfTarget}
                          status={ratio.status}
                          showValue={false}
                          size="sm"
                          className="mt-2"
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                          {Math.round(ratio.percentageOfTarget)}% de l&apos;objectif
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────── Ratio Grid Card (reusable for agency level) ────── */
function RatioGridCard({
  icon,
  title,
  subtitle,
  ratios,
  globalAvg,
  globalStatus,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ratios: RatioAverage[];
  globalAvg: number;
  globalStatus: PerformanceStatus;
}) {
  if (ratios.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Score global</p>
          <p
            className={cn(
              "text-2xl font-bold",
              globalStatus === "ok"
                ? "text-green-500"
                : globalStatus === "warning"
                  ? "text-orange-500"
                  : "text-red-500"
            )}
          >
            {globalAvg}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ratios.map((r) => (
          <RatioCard key={r.id} ratio={r} />
        ))}
      </div>
    </div>
  );
}

/* ────── Single Ratio Card ────── */
function RatioCard({ ratio }: { ratio: RatioAverage }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        ratio.status === "ok"
          ? "border-green-500/20"
          : ratio.status === "warning"
            ? "border-orange-500/20"
            : "border-red-500/20"
      )}
    >
      <p className="text-xs text-muted-foreground">{ratio.config.name}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold",
          ratio.status === "ok"
            ? "text-green-500"
            : ratio.status === "warning"
              ? "text-orange-500"
              : "text-red-500"
        )}
      >
        {ratio.config.isPercentage
          ? `${Math.round(ratio.avgValue)}%`
          : ratio.avgValue.toFixed(1)}
      </p>
      <ProgressBar
        value={ratio.avgPct}
        status={ratio.status}
        showValue={false}
        size="sm"
        className="mt-2"
      />
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {ratio.avgPct}% de l&apos;objectif
      </p>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/directeur/performance/page.tsx
git commit -m "feat: add Performance page for directeur with collective and individual views"
```

---

### Task 4: Verify and fix build

**Step 1: Run full build**

Run: `npx next build`
Expected: Clean build with no errors.

**Step 2: Run lint**

Run: `npx next lint`
Expected: No lint errors.

**Step 3: Visual smoke test**

Start dev server: `npx next dev --port 3000 --hostname 0.0.0.0`

Check:
1. Navigate to `/directeur/performance` — page loads
2. Sidebar shows "Performance" with Gauge icon (not "Projection")
3. Vue Collective shows agency card with 7 ratios
4. Click a team → expands to show team ratios + conseiller cards
5. Toggle Mois/Année → values update
6. Switch to Vue Individuelle → dropdown works, ratio cards show
7. Old route `/directeur/projection` → 404 (expected)

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/lint issues in performance page"
```
