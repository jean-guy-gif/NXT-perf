# Directeur Pages Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 4 existing directeur pages with 5 redesigned pages: Pilotage Agence, Équipes, Projection, Rentabilité, Formation Collective (kept).

**Architecture:** Centralized `useAgencyGPS()` hook computes all GPS, comparison, projection, and rentabilité data. Director-specific inputs (agency CA objective, costs) persisted in Zustand store. One custom chart component (`ComparisonBarChart`) for the Équipes page.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand 5, Recharts 3.7, Tailwind CSS 4, Lucide icons.

---

### Task 1: Add `CATEGORY_OBJECTIVES` constants

**Files:**
- Modify: `src/lib/constants.ts`

**Step 1: Add the objectives table**

Append to end of `src/lib/constants.ts`:

```typescript
/** Monthly objectives by category — used for agency GPS calculations */
export const CATEGORY_OBJECTIVES: Record<string, {
  estimations: number;
  mandats: number;
  exclusivite: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
  ca: number;
}> = {
  debutant: { estimations: 8, mandats: 4, exclusivite: 30, visites: 20, offres: 3, compromis: 1, actes: 1, ca: 8000 },
  confirme: { estimations: 15, mandats: 8, exclusivite: 50, visites: 30, offres: 5, compromis: 3, actes: 2, ca: 20000 },
  expert:   { estimations: 20, mandats: 12, exclusivite: 70, visites: 40, offres: 8, compromis: 5, actes: 4, ca: 40000 },
};

export type GPSTheme = "estimations" | "mandats" | "exclusivite" | "visites" | "offres" | "compromis" | "actes" | "ca_compromis" | "ca_acte";

export const GPS_THEME_LABELS: Record<GPSTheme, string> = {
  estimations: "Estimations",
  mandats: "Mandats",
  exclusivite: "% Exclusivité",
  visites: "Visites",
  offres: "Offres",
  compromis: "Compromis",
  actes: "Actes",
  ca_compromis: "CA Compromis",
  ca_acte: "CA Acte",
};
```

**Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add CATEGORY_OBJECTIVES and GPS theme constants"
```

---

### Task 2: Add director inputs to Zustand store

**Files:**
- Modify: `src/stores/app-store.ts`

**Step 1: Add types and state**

After the `TeamInfo` interface (line 83), add:

```typescript
export interface DirectorCosts {
  commissionDirecteur: number;
  commissionManagers: number;
  commissionConseillers: number;
  coutsFixes: number;
  masseSalariale: number;
  autresCharges: number;
}
```

In the `AppState` interface, after `hiddenViews: ViewId[];` (line 109), add:

```typescript
  // ── Director inputs (persisted in localStorage) ──
  agencyObjective: { annualCA: number; avgActValue: number } | null;
  directorCosts: DirectorCosts | null;
  setAgencyObjective: (obj: { annualCA: number; avgActValue: number } | null) => void;
  setDirectorCosts: (costs: DirectorCosts | null) => void;
```

**Step 2: Add initial values and implementations**

In the store creation (after `hiddenViews: [],` around line 189), add:

```typescript
  agencyObjective: null,
  directorCosts: null,
```

After `toggleViewVisibility` implementation (after line 205), add:

```typescript
  setAgencyObjective: (obj) => set({ agencyObjective: obj }),
  setDirectorCosts: (costs) => set({ directorCosts: costs }),
```

**Step 3: Update `DEFAULT_ROUTES.directeur`**

Change line 36 from:
```typescript
  directeur: "/directeur/cockpit",
```
to:
```typescript
  directeur: "/directeur/pilotage",
```

**Step 4: Commit**

```bash
git add src/stores/app-store.ts
git commit -m "feat: add agencyObjective and directorCosts to store"
```

---

### Task 3: Create `useAgencyGPS()` hook

**Files:**
- Create: `src/hooks/use-agency-gps.ts`

**Step 1: Write the hook**

```typescript
"use client";

import { useMemo, useState } from "react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore, type DirectorCosts } from "@/stores/app-store";
import { CATEGORY_OBJECTIVES, type GPSTheme } from "@/lib/constants";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

// ── Types ──

export type PerformanceStatus = "ok" | "warning" | "danger";

export interface EntityBar {
  id: string;
  name: string;
  niveau: "agence" | "manager" | "conseiller";
  realise: number;
  objectif: number;
  pct: number;
  status: PerformanceStatus;
  teamId?: string;
}

export interface ProjectionEntry {
  id: string;
  name: string;
  niveau: "agence" | "equipe" | "conseiller";
  performance: number;
  status: PerformanceStatus;
  teamId?: string;
  teamName?: string;
}

export interface RentabiliteData {
  revenuDirecteurVentes: number;
  revenuDirecteurEquipes: number;
  resultatAgenceMois: number;
  projectionRevenuAnnuel: number;
}

export interface AgencyGPSResult {
  objectif: number;
  realise: number;
  ecart: number;
  avancement: number;
  projection: number;
}

export interface TeamDetail {
  teamId: string;
  teamName: string;
  realise: number;
  objectif: number;
  ecart: number;
  pct: number;
  status: PerformanceStatus;
}

// ── Helpers ──

function getStatus(pct: number): PerformanceStatus {
  if (pct >= 100) return "ok";
  if (pct >= 80) return "warning";
  return "danger";
}

function getObjectifForTheme(category: string, theme: GPSTheme): number {
  const obj = CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  switch (theme) {
    case "estimations": return obj.estimations;
    case "mandats": return obj.mandats;
    case "exclusivite": return obj.exclusivite;
    case "visites": return obj.visites;
    case "offres": return obj.offres;
    case "compromis": return obj.compromis;
    case "actes": return obj.actes;
    case "ca_compromis": return obj.ca;
    case "ca_acte": return obj.ca;
  }
}

function getRealiseForTheme(results: PeriodResults | undefined, theme: GPSTheme): number {
  if (!results) return 0;
  switch (theme) {
    case "estimations": return results.vendeurs.estimationsRealisees;
    case "mandats": return results.vendeurs.mandats.length;
    case "exclusivite": {
      const total = results.vendeurs.mandats.length;
      if (total === 0) return 0;
      return Math.round((results.vendeurs.mandats.filter(m => m.type === "exclusif").length / total) * 100);
    }
    case "visites": return results.acheteurs.nombreVisites;
    case "offres": return results.acheteurs.offresRecues;
    case "compromis": return results.acheteurs.compromisSignes;
    case "actes": return results.ventes.actesSignes;
    case "ca_compromis": {
      const avgAct = results.ventes.actesSignes > 0
        ? results.ventes.chiffreAffaires / results.ventes.actesSignes
        : 8000;
      return results.acheteurs.compromisSignes * avgAct;
    }
    case "ca_acte": return results.ventes.chiffreAffaires;
  }
}

function sumRealise(conseillers: User[], allResults: PeriodResults[], theme: GPSTheme): number {
  return conseillers.reduce((sum, c) => {
    const res = allResults.find(r => r.userId === c.id);
    return sum + getRealiseForTheme(res, theme);
  }, 0);
}

function sumObjectif(conseillers: User[], theme: GPSTheme): number {
  // For exclusivite, objective = weighted average, not a sum
  if (theme === "exclusivite") {
    if (conseillers.length === 0) return 0;
    const total = conseillers.reduce((s, c) => s + getObjectifForTheme(c.category, theme), 0);
    return Math.round(total / conseillers.length);
  }
  return conseillers.reduce((s, c) => s + getObjectifForTheme(c.category, theme), 0);
}

function avgRealiseExclu(conseillers: User[], allResults: PeriodResults[]): number {
  if (conseillers.length === 0) return 0;
  const total = conseillers.reduce((s, c) => {
    const res = allResults.find(r => r.userId === c.id);
    return s + getRealiseForTheme(res, "exclusivite");
  }, 0);
  return Math.round(total / conseillers.length);
}

// ── Hook ──

export function useAgencyGPS() {
  const { teams, allConseillers, allResults, ratioConfigs, orgStats } = useDirectorData();
  const agencyObjective = useAppStore(s => s.agencyObjective);
  const directorCosts = useAppStore(s => s.directorCosts);
  const user = useAppStore(s => s.user);

  const [theme, setTheme] = useState<GPSTheme>("mandats");

  // ── GPS Agence ──
  const agencyGPS = useMemo<AgencyGPSResult>(() => {
    const isExclu = theme === "exclusivite";
    const realise = isExclu
      ? avgRealiseExclu(allConseillers, allResults)
      : sumRealise(allConseillers, allResults, theme);
    const objectif = sumObjectif(allConseillers, theme);
    const ecart = realise - objectif;
    const avancement = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
    // Projection: current month data extrapolated to 12 months
    const projection = realise * 12;
    return { objectif, realise, ecart, avancement, projection };
  }, [theme, allConseillers, allResults]);

  // ── Détail par équipe (Pilotage) ──
  const teamDetails = useMemo<TeamDetail[]>(() => {
    return teams.map(t => {
      const isExclu = theme === "exclusivite";
      const realise = isExclu
        ? avgRealiseExclu(t.agents, allResults)
        : sumRealise(t.agents, allResults, theme);
      const objectif = sumObjectif(t.agents, theme);
      const ecart = realise - objectif;
      const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
      return { teamId: t.teamId, teamName: t.teamName, realise, objectif, ecart, pct, status: getStatus(pct) };
    });
  }, [theme, teams, allResults]);

  // ── Entity bars (Équipes page) ──
  const entityBars = useMemo<EntityBar[]>(() => {
    const bars: EntityBar[] = [];
    const isExclu = theme === "exclusivite";

    // Agence bar
    const agRealise = isExclu
      ? avgRealiseExclu(allConseillers, allResults)
      : sumRealise(allConseillers, allResults, theme);
    const agObjectif = sumObjectif(allConseillers, theme);
    const agPct = agObjectif > 0 ? Math.round((agRealise / agObjectif) * 100) : 0;
    bars.push({ id: "agence", name: "Agence", niveau: "agence", realise: agRealise, objectif: agObjectif, pct: agPct, status: getStatus(agPct) });

    // Per team: manager bar + conseillers
    for (const team of teams) {
      // Manager bar (= team aggregate)
      const mgrRealise = isExclu
        ? avgRealiseExclu(team.agents, allResults)
        : sumRealise(team.agents, allResults, theme);
      const mgrObjectif = sumObjectif(team.agents, theme);
      const mgrPct = mgrObjectif > 0 ? Math.round((mgrRealise / mgrObjectif) * 100) : 0;
      bars.push({ id: `mgr-${team.teamId}`, name: team.managerName, niveau: "manager", realise: mgrRealise, objectif: mgrObjectif, pct: mgrPct, status: getStatus(mgrPct), teamId: team.teamId });

      // Conseiller bars
      for (const agent of team.agents) {
        const res = allResults.find(r => r.userId === agent.id);
        const realise = getRealiseForTheme(res, theme);
        const objectif = getObjectifForTheme(agent.category, theme);
        const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
        bars.push({ id: agent.id, name: `${agent.firstName} ${agent.lastName}`, niveau: "conseiller", realise, objectif, pct, status: getStatus(pct), teamId: team.teamId });
      }
    }

    return bars;
  }, [theme, teams, allConseillers, allResults]);

  // ── Projection data ──
  const projectionData = useMemo<ProjectionEntry[]>(() => {
    const entries: ProjectionEntry[] = [];

    // Agence
    const agPerf = orgStats.avgPerformance;
    entries.push({ id: "agence", name: "Agence", niveau: "agence", performance: agPerf, status: getStatus(agPerf) });

    // Per team
    for (const team of teams) {
      entries.push({ id: `team-${team.teamId}`, name: team.teamName, niveau: "equipe", performance: team.avgPerformance, status: getStatus(team.avgPerformance), teamId: team.teamId, teamName: team.teamName });

      // Conseillers sorted by performance desc
      const sortedAgents = [...team.agents]
        .map(agent => {
          const res = allResults.find(r => r.userId === agent.id);
          if (!res) return { agent, perf: 0 };
          const ratios = require("@/lib/ratios").computeAllRatios(res, agent.category, ratioConfigs);
          const perf = ratios.length > 0
            ? Math.round(ratios.reduce((s: number, r: { percentageOfTarget: number }) => s + r.percentageOfTarget, 0) / ratios.length)
            : 0;
          return { agent, perf };
        })
        .sort((a, b) => b.perf - a.perf);

      for (const { agent, perf } of sortedAgents) {
        entries.push({ id: agent.id, name: `${agent.firstName} ${agent.lastName}`, niveau: "conseiller", performance: perf, status: getStatus(perf), teamId: team.teamId, teamName: team.teamName });
      }
    }

    return entries;
  }, [teams, allResults, ratioConfigs, orgStats]);

  // ── Rentabilité ──
  const rentabilite = useMemo<RentabiliteData | null>(() => {
    if (!directorCosts) return null;
    // Director's own sales
    const directorResults = user ? allResults.find(r => r.userId === user.id) : undefined;
    const caDirecteur = directorResults?.ventes.chiffreAffaires ?? 0;
    const revenuDirecteurVentes = caDirecteur * (directorCosts.commissionDirecteur / 100);

    // Revenue from teams
    const caEquipes = orgStats.totalCA;
    const revenuDirecteurEquipes = caEquipes * (directorCosts.commissionDirecteur / 100);

    // Agency monthly result
    const chargesTotal = directorCosts.coutsFixes + directorCosts.masseSalariale + directorCosts.autresCharges;
    const resultatAgenceMois = caEquipes - chargesTotal;

    // Annual projection
    const projectionRevenuAnnuel = (revenuDirecteurVentes + revenuDirecteurEquipes) * 12 - chargesTotal * 12;

    return { revenuDirecteurVentes, revenuDirecteurEquipes, resultatAgenceMois, projectionRevenuAnnuel };
  }, [directorCosts, user, allResults, orgStats]);

  return {
    theme,
    setTheme,
    agencyGPS,
    teamDetails,
    entityBars,
    projectionData,
    rentabilite,
    agencyObjective,
    directorCosts,
  };
}
```

**Step 2: Fix the `require` in projectionData**

Replace the `require` call with a proper import. The hook already imports from `use-director-data` which uses `computeAllRatios`. Add to imports at top:

```typescript
import { computeAllRatios } from "@/lib/ratios";
```

And in projectionData, replace the `require` line:
```typescript
const ratios = computeAllRatios(res, agent.category, ratioConfigs);
const perf = ratios.length > 0
  ? Math.round(ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length)
  : 0;
```

**Step 3: Commit**

```bash
git add src/hooks/use-agency-gps.ts
git commit -m "feat: create useAgencyGPS centralized hook"
```

---

### Task 4: Update sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Update imports**

Replace `Building2` and `Trophy` in the lucide import with `Compass`, `TrendingUp`, `Calculator`:

Change the import line to include:
```typescript
import {
  LayoutDashboard, BarChart3, Gauge, GitCompare, PenSquare,
  GraduationCap, Target, Users, Settings, Zap,
  BookOpen, Compass, TrendingUp, Calculator, HeartHandshake,
} from "lucide-react";
```

(Remove `Building2` and `Trophy` — they are only used in directorOnly items.)

**Step 2: Update directeur nav items**

Replace the 4 directeur entries (lines 56-59) with:

```typescript
  { href: "/directeur/pilotage", icon: Compass, label: "Pilotage Agence", directorOnly: true },
  { href: "/directeur/equipes", icon: Users, label: "Équipes", directorOnly: true },
  { href: "/directeur/projection", icon: TrendingUp, label: "Projection", directorOnly: true },
  { href: "/directeur/rentabilite", icon: Calculator, label: "Rentabilité", directorOnly: true },
  { href: "/directeur/formation-collective", icon: BookOpen, label: "Formation Collective", directorOnly: true },
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (pages cockpit/classement will 404 but that's fine — we delete them in Task 9).

**Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: update directeur sidebar navigation"
```

---

### Task 5: Create `ComparisonBarChart` component

**Files:**
- Create: `src/components/charts/comparison-bar-chart.tsx`

**Step 1: Write the component**

This is a Recharts-based BarChart with:
- One bar per entity (colored by status)
- A thin marker line per bar showing the individual objective
- Separators between groups

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { EntityBar } from "@/hooks/use-agency-gps";

const STATUS_FILL = {
  ok: "#39C97E",
  warning: "#FFA448",
  danger: "#EF7550",
};

interface ComparisonBarChartProps {
  data: EntityBar[];
}

function CustomTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: EntityBar }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const ecart = d.realise - d.objectif;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">Réalisé : {d.realise.toLocaleString("fr-FR")}</p>
      <p className="text-muted-foreground">Objectif : {d.objectif.toLocaleString("fr-FR")}</p>
      <p className={ecart >= 0 ? "text-green-500" : "text-red-500"}>
        Écart : {ecart >= 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} ({d.pct}%)
      </p>
    </div>
  );
}

// Custom bar shape that also draws the objective marker line
function BarWithObjective(props: {
  x?: number; y?: number; width?: number; height?: number;
  payload?: EntityBar;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload, fill } = props;
  if (!payload) return null;

  // Calculate objective line Y position
  const barBottom = y + height;
  const maxVal = Math.max(payload.realise, payload.objectif) * 1.2 || 1;
  // We need the chart's Y scale — approximate using bar proportions
  const objLineY = payload.objectif > 0 && payload.realise > 0
    ? barBottom - (height * (payload.objectif / payload.realise))
    : barBottom;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
      {/* Objective marker line */}
      <line
        x1={x - 4}
        y1={objLineY}
        x2={x + width + 4}
        y2={objLineY}
        stroke="var(--foreground)"
        strokeWidth={2}
        strokeDasharray="4 2"
        opacity={0.6}
      />
    </g>
  );
}

export function ComparisonBarChart({ data }: ComparisonBarChartProps) {
  // Build chart data with "realise" as bar value
  const chartData = data.map(d => ({
    ...d,
    value: d.realise,
    label: d.niveau === "conseiller" ? `  ${d.name}` : d.name,
  }));

  return (
    <div style={{ width: "100%", height: `${Math.max(400, data.length * 50)}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" barSize={24} margin={{ left: 120, right: 40 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in oklch, currentColor, transparent 88%)"
            horizontal={false}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
            width={110}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={false} />
          <Bar dataKey="value" shape={<BarWithObjective />}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={STATUS_FILL[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Note:** The objective line position in `BarWithObjective` is an approximation. Recharts doesn't expose Y-scale directly in custom shapes, so we compute it from the bar's own proportions. This works when the bar represents `realise` and we know `objectif`. For a more precise approach, we could use a second hidden `Bar` series with custom rendering, but this is sufficient for the initial implementation.

**Step 2: Commit**

```bash
git add src/components/charts/comparison-bar-chart.tsx
git commit -m "feat: create ComparisonBarChart component"
```

---

### Task 6: Create Pilotage Agence page

**Files:**
- Create: `src/app/(dashboard)/directeur/pilotage/page.tsx`

**Step 1: Write the page**

```typescript
"use client";

import { useState } from "react";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { useAppStore } from "@/stores/app-store";
import { GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";

const themes: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

function isCATheme(t: GPSTheme) {
  return t === "ca_compromis" || t === "ca_acte";
}

function fmt(value: number, theme: GPSTheme) {
  if (isCATheme(theme)) return formatCurrency(value);
  if (theme === "exclusivite") return `${value} %`;
  return formatNumber(value);
}

export default function PilotageAgencePage() {
  const { theme, setTheme, agencyGPS, teamDetails, agencyObjective } = useAgencyGPS();
  const setAgencyObjective = useAppStore(s => s.setAgencyObjective);
  const [showSaisie, setShowSaisie] = useState(!agencyObjective);
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 0);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 0);

  function handleSave() {
    if (annualCA > 0 && avgActValue > 0) {
      setAgencyObjective({ annualCA, avgActValue });
      setShowSaisie(false);
    }
  }

  const gps = agencyGPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pilotage Agence</h1>
          <p className="text-sm text-muted-foreground">GPS de performance agence</p>
        </div>
      </div>

      {/* Saisie objectif (collapsible) */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowSaisie(!showSaisie)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Objectif CA agence {agencyObjective ? `— ${formatCurrency(agencyObjective.annualCA)}/an` : "(non défini)"}</span>
          {showSaisie ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSaisie && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">CA annuel agence</label>
                <input
                  type="number"
                  value={annualCA || ""}
                  onChange={e => setAnnualCA(Number(e.target.value))}
                  placeholder="500000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Valeur moyenne d'un acte</label>
                <input
                  type="number"
                  value={avgActValue || ""}
                  onChange={e => setAvgActValue(Number(e.target.value))}
                  placeholder="8000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Enregistrer
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Si non renseigné, l'objectif agence = somme des objectifs individuels par catégorie.
            </p>
          </div>
        )}
      </div>

      {/* Theme selector */}
      <div className="flex flex-wrap gap-2">
        {themes.map(t => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              theme === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {GPS_THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* GPS Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{GPS_THEME_LABELS[theme]}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Objectif agence</p>
            <p className="text-xl font-bold">{fmt(gps.objectif, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Réalisé</p>
            <p className="text-xl font-bold">{fmt(gps.realise, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Écart</p>
            <p className={cn("text-xl font-bold", gps.ecart >= 0 ? "text-green-500" : "text-red-500")}>
              {gps.ecart >= 0 ? "+" : ""}{fmt(gps.ecart, theme)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projection annuelle</p>
            <p className="text-xl font-bold">{fmt(gps.projection, theme)}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            value={gps.avancement}
            label="Avancement"
            status={gps.avancement >= 100 ? "ok" : gps.avancement >= 80 ? "warning" : "danger"}
            size="lg"
          />
        </div>
      </div>

      {/* Team detail table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Détail par équipe</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Équipe</th>
                <th className="px-4 py-2 text-right">Objectif</th>
                <th className="px-4 py-2 text-right">Réalisé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {teamDetails.map(td => (
                <tr key={td.teamId} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{td.teamName}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.objectif, theme)}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.realise, theme)}</td>
                  <td className={cn("px-4 py-2 text-right", td.ecart >= 0 ? "text-green-500" : "text-red-500")}>
                    {td.ecart >= 0 ? "+" : ""}{fmt(td.ecart, theme)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      td.status === "ok" ? "bg-green-500/10 text-green-500" :
                      td.status === "warning" ? "bg-orange-500/10 text-orange-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {td.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/directeur/pilotage/page.tsx
git commit -m "feat: create Pilotage Agence page"
```

---

### Task 7: Rewrite Équipes page

**Files:**
- Modify: `src/app/(dashboard)/directeur/equipes/page.tsx`

**Step 1: Rewrite the page**

Replace the entire content with:

```typescript
"use client";

import { Users } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { cn } from "@/lib/utils";

const themes: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

export default function EquipesPage() {
  const { theme, setTheme, entityBars } = useAgencyGPS();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Équipes</h1>
          <p className="text-sm text-muted-foreground">Comparaison par thème — Agence / Managers / Conseillers</p>
        </div>
      </div>

      {/* Theme selector */}
      <div className="flex flex-wrap gap-2">
        {themes.map(t => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              theme === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {GPS_THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded bg-muted-foreground/40" />
          <span>Réalisé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 border-t-2 border-dashed border-foreground/60" />
          <span>Objectif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>≥ 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span>80–99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>{'< 80%'}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-semibold">
          {GPS_THEME_LABELS[theme]} — Comparaison tous niveaux
        </h2>
        <ComparisonBarChart data={entityBars} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/directeur/equipes/page.tsx
git commit -m "feat: rewrite Équipes page with ComparisonBarChart"
```

---

### Task 8: Create Projection page

**Files:**
- Create: `src/app/(dashboard)/directeur/projection/page.tsx`

**Step 1: Write the page**

```typescript
"use client";

import { TrendingUp } from "lucide-react";
import { useAgencyGPS, type ProjectionEntry } from "@/hooks/use-agency-gps";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";

export default function ProjectionPage() {
  const { projectionData } = useAgencyGPS();

  // Group by team for display
  const agence = projectionData.find(e => e.niveau === "agence");
  const teams = projectionData.filter(e => e.niveau === "equipe");
  const conseillers = projectionData.filter(e => e.niveau === "conseiller");

  function renderEntry(entry: ProjectionEntry, indent = false) {
    return (
      <div key={entry.id} className={cn("flex items-center gap-4 py-2", indent && "pl-6")}>
        <span className={cn(
          "w-40 shrink-0 truncate text-sm font-medium",
          entry.niveau === "agence" && "text-base font-bold",
          entry.niveau === "equipe" && "font-semibold",
        )}>
          {entry.name}
        </span>
        <div className="flex-1">
          <ProgressBar
            value={entry.performance}
            status={entry.status}
            size={entry.niveau === "agence" ? "lg" : entry.niveau === "equipe" ? "md" : "sm"}
            showValue={false}
          />
        </div>
        <span className={cn(
          "w-16 text-right text-sm font-semibold",
          entry.status === "ok" ? "text-green-500" :
          entry.status === "warning" ? "text-orange-500" :
          "text-red-500"
        )}>
          {entry.performance}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Projection</h1>
          <p className="text-sm text-muted-foreground">Ratio de performance — Réalisé / Objectif</p>
        </div>
      </div>

      {/* Agency bar */}
      {agence && (
        <div className="rounded-lg border border-border bg-card p-4">
          {renderEntry(agence)}
        </div>
      )}

      {/* Teams */}
      {teams.map(team => (
        <div key={team.id} className="rounded-lg border border-border bg-card p-4">
          {renderEntry(team)}
          <div className="mt-1 border-t border-border pt-1">
            {conseillers
              .filter(c => c.teamId === team.teamId)
              .map(c => renderEntry(c, true))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/directeur/projection/page.tsx
git commit -m "feat: create Projection page"
```

---

### Task 9: Create Rentabilité page

**Files:**
- Create: `src/app/(dashboard)/directeur/rentabilite/page.tsx`

**Step 1: Write the page**

```typescript
"use client";

import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { useAppStore, type DirectorCosts } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const defaultCosts: DirectorCosts = {
  commissionDirecteur: 0,
  commissionManagers: 0,
  commissionConseillers: 0,
  coutsFixes: 0,
  masseSalariale: 0,
  autresCharges: 0,
};

export default function RentabilitePage() {
  const { rentabilite, directorCosts } = useAgencyGPS();
  const setDirectorCosts = useAppStore(s => s.setDirectorCosts);
  const [showForm, setShowForm] = useState(!directorCosts);
  const [form, setForm] = useState<DirectorCosts>(directorCosts ?? defaultCosts);

  function handleSave() {
    setDirectorCosts(form);
    setShowForm(false);
  }

  function updateField(field: keyof DirectorCosts, value: number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const fields: { key: keyof DirectorCosts; label: string; suffix: string }[] = [
    { key: "commissionDirecteur", label: "% commission directeur", suffix: "%" },
    { key: "commissionManagers", label: "% commission managers", suffix: "%" },
    { key: "commissionConseillers", label: "% commission conseillers", suffix: "%" },
    { key: "coutsFixes", label: "Coûts fixes agence / mois", suffix: "€" },
    { key: "masseSalariale", label: "Masse salariale / mois", suffix: "€" },
    { key: "autresCharges", label: "Autres charges / mois", suffix: "€" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rentabilité</h1>
          <p className="text-sm text-muted-foreground">Simulation de rentabilité agence</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Paramètres de rentabilité {directorCosts ? "(configuré)" : "(à renseigner)"}</span>
          {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showForm && (
          <div className="border-t border-border px-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-muted-foreground">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form[f.key] || ""}
                      onChange={e => updateField(f.key, Number(e.target.value))}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">{f.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSave}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Enregistrer
              </button>
              {directorCosts && (
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-md bg-muted px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted/80"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {!rentabilite ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <Calculator className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Renseignez vos paramètres de rentabilité pour afficher les projections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Revenu directeur (ses ventes)", value: rentabilite.revenuDirecteurVentes, color: "text-blue-500" },
            { label: "Revenu directeur (équipes)", value: rentabilite.revenuDirecteurEquipes, color: "text-violet-500" },
            { label: "Résultat agence estimé / mois", value: rentabilite.resultatAgenceMois, color: rentabilite.resultatAgenceMois >= 0 ? "text-green-500" : "text-red-500" },
            { label: "Projection revenu directeur / an", value: rentabilite.projectionRevenuAnnuel, color: rentabilite.projectionRevenuAnnuel >= 0 ? "text-green-500" : "text-red-500" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={cn("mt-1 text-2xl font-bold", kpi.color)}>
                {formatCurrency(kpi.value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/directeur/rentabilite/page.tsx
git commit -m "feat: create Rentabilité page with director input form"
```

---

### Task 10: Delete old pages and verify build

**Files:**
- Delete: `src/app/(dashboard)/directeur/cockpit/page.tsx`
- Delete: `src/app/(dashboard)/directeur/classement/page.tsx`

**Step 1: Delete old files**

```bash
rm "src/app/(dashboard)/directeur/cockpit/page.tsx"
rmdir "src/app/(dashboard)/directeur/cockpit"
rm "src/app/(dashboard)/directeur/classement/page.tsx"
rmdir "src/app/(dashboard)/directeur/classement"
```

**Step 2: Check for references to old routes**

Search for `/directeur/cockpit` and `/directeur/classement` in all files. Update any remaining references:

- `src/stores/app-store.ts` — already updated in Task 2 (`DEFAULT_ROUTES.directeur` → `/directeur/pilotage`)
- `src/app/(dashboard)/directeur/conseiller/[id]/page.tsx` — check breadcrumb links, update if they point to `/directeur/cockpit`

**Step 3: Verify build**

```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old cockpit and classement pages"
```

---

### Task 11: Smoke test in browser

**Step 1: Start dev server**

```bash
npx next dev --port 3000 --hostname 0.0.0.0
```

**Step 2: Verify each page**

1. Go to `http://localhost:3000` → enter demo mode as Jean-Guy (directeur)
2. Sidebar should show: Pilotage Agence, Équipes, Projection, Rentabilité, Formation Collective
3. **Pilotage Agence** — theme chips work, GPS numbers update, team table shows data
4. **Équipes** — chart displays all entities, colors match status, tooltip works
5. **Projection** — progress bars show for agency/teams/conseillers with correct ordering
6. **Rentabilité** — empty state shown, fill form → 4 KPI cards appear
7. **Formation Collective** — still works (unchanged)

**Step 3: Fix any issues found during testing**

If `ComparisonBarChart` objective line position is off, adjust the calculation in `BarWithObjective`. The Y-scale mapping may need refinement based on Recharts' actual rendering.
