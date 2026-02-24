# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npx next dev --port 3000 --hostname 0.0.0.0   # Dev server (Turbopack)
npx next build                                  # Production build
npx next lint                                   # ESLint
```

Kill stuck dev server: `pkill -f "next dev"; sleep 2; fuser -k 3000/tcp`

## Architecture

**Stack:** Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript strict, Zustand 5, Recharts 3.7, Tailwind CSS 4 (OKLCH color space), Radix UI, Lucide icons.

**Path alias:** `@/*` → `./src/*`

### App Structure

- `src/app/(dashboard)/` — All authenticated pages share a layout with sidebar + header
  - **Agent pages** (all users): `dashboard/`, `resultats/`, `performance/`, `comparaison/`, `saisie/`, `formation/`, `objectifs/`
  - **Manager pages** (`manager/`): `cockpit/`, `equipe/`, `classement/`, `parametres/`, `formation-collective/`
  - Manager layout (`manager/layout.tsx`) redirects non-managers to `/dashboard`
- `src/app/(auth)/` — Login/register pages

### State Management

- **Zustand store** at `src/stores/app-store.ts` — single global store for user, results, ratioConfigs, removedItems
- Role switching via `switchRole()` toggles between `conseiller` and `manager`
- Ratio thresholds are editable via `updateRatioThreshold()`

### Key Types (`src/types/`)

- `user.ts` — `UserRole` ("conseiller" | "manager"), `UserCategory` ("debutant" | "confirme" | "expert")
- `ratios.ts` — `RatioId` (7 business ratios), `RatioConfig`, `ComputedRatio`
- `results.ts` — `PeriodResults` with prospection, vendeurs, acheteurs, ventes data
- `objectives.ts` — `ObjectiveBreakdown` for GPS funnel calculation
- `formation.ts` — `FormationDiagnostic`, `FormationRecommendation`

### Business Logic (`src/lib/`)

- `ratios.ts` — `computeRatioValue()`, `computeAllRatios()`, `determineRatioStatus()`
- `objectifs.ts` — `calculateObjectiveBreakdown()` funnel from CA → estimations → mandats → visites → offres → compromis → actes
- `formation.ts` — `generateFormationDiagnostic()` maps weak ratios to training areas

### Hooks (`src/hooks/`)

- `use-user.ts` — current user + category from store
- `use-results.ts` — `useResults(userId?)` and `useAllResults()`
- `use-ratios.ts` — `useRatios()` returns computedRatios + ratioConfigs

### Components

- `components/layout/` — Sidebar (icon-based, tooltip hover), Header (role switch, theme toggle), MobileSidebar
- `components/charts/` — LineChart, BarChart, DonutChart, ProgressBar (all Recharts wrappers)
- `components/dashboard/` — KpiCard (with optional onExpand for drill-down chart)
- `components/ui/` — Radix-based primitives

## Important Conventions

- **French UI language** — Always use real characters (é, è, à, ç). NEVER unicode escape sequences (\u00e9).
- **"Junior" not "Débutant"** — The label for `debutant` category is "Junior" everywhere (set in `src/lib/constants.ts` CATEGORY_LABELS).
- **7 ratios only** — `delai_moyen_vente` was removed. Do not re-add it.
- **Objectifs page** uses `NiveauChoice = UserCategory | "actuel"` — "actuel" overrides thresholds with real performance values from `useRatios()`.
- Mock data in `src/data/mock-*.ts` — all data is client-side mock; no API calls yet.
- Sidebar navigation defined in `src/components/layout/sidebar.tsx` with `managerOnly` flag for manager routes.
## Product Vision

Antigravity Dashboard is a performance cockpit for real estate agents and managers.

Primary goals:
- Visualize business performance clearly
- Identify weak ratios quickly
- Guide training priorities
- Help managers coach based on objective metrics

This is not a generic analytics tool.
It is a performance transformation tool.

---

## Decision Principles

When adding features:

1. Must improve decision clarity.
2. Must reduce cognitive load.
3. Must reinforce the 7 core ratios.
4. Must not add unnecessary complexity.

Data hierarchy:
- KPIs
- Ratios
- Drill-down
- Training action

If a feature does not improve performance understanding, it should not be added.

---

## Technical Guardrails

- No backend until Supabase phase.
- No additional state library.
- No UI framework beyond Radix + Tailwind.
- Avoid premature abstraction.
- Prefer simple pure functions in `src/lib/`.

All business logic must remain deterministic and testable.

---

## Future Architecture (Supabase Phase)

When integrating Supabase:

- Store users
- Store results per period
- Store objectives
- Store ratio thresholds per category
- Enable multi-user manager dashboard

Must support:
- Multi-agent team
- Historical tracking
- Role-based access