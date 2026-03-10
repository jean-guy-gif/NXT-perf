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
  - **Manager pages** (`manager/`): `cockpit/`, `gps/`, `equipe/`, `classement/`, `formation-collective/`
  - **Directeur pages** (`directeur/`): `pilotage/`, `equipes/`, `performance/`, `pilotage-financier/`, `formation-collective/`, `conseiller/[id]/`
  - **Coach pages** (`coach/`): `dashboard/`, `targets/[type]/[id]/`, `targets/[type]/[id]/plan/`, `cockpit/`
  - **Réseau pages** (`reseau/`): `dashboard/`, `agence/` (detail via `?id=xxx`)
  - Each role section has a layout guard redirecting unauthorized users to `/dashboard`
- `src/app/(auth)/` — Login/register/welcome pages

### Role Hierarchy

```
reseau          → ["reseau"]                    (isolated, network-level)
directeur       → ["directeur", "manager", "conseiller"]
manager         → ["manager", "conseiller"]
coach           → ["coach"]                     (isolated, cross-org)
conseiller      → ["conseiller"]
```

- `UserRole = "conseiller" | "manager" | "directeur" | "coach" | "reseau"`
- `ProfileType = "INSTITUTION" | "MANAGER" | "AGENT" | "COACH" | "RESEAU"`
- Helper functions: `hasRole()`, `hasManagerAccess()`, `hasDirectorAccess()`, `hasCoachAccess()`, `hasNetworkAccess()`

### Organizational Hierarchy

```
Network (Réseau)
  └─ Institution (Agence)     — managed by directeur
       └─ Team (Équipe)       — managed by manager
            └─ Agent (Conseiller)
```

- **Network** (`src/data/mock-network.ts`): `{ id, name, institutionIds }` — groups multiple institutions
- **Institution** (`app-store.ts`): `{ id, name, inviteCode }` — single agency
- **TeamInfo** (`app-store.ts`): `{ id, name, institutionId, managerId, inviteCode }`
- User fields: `institutionId`, `teamId`, `managerId`

### State Management

- **Zustand store** at `src/stores/app-store.ts` — single global store for user, users, results, ratioConfigs, institutions, networks, coach data, financial data, view preferences
- `ViewId = "agent" | "manager" | "directeur" | "coach" | "reseau"` — sidebar view sections
- Role switching via `switchRole()` with permission guard
- `DEFAULT_ROUTES` maps each role to its landing page
- `deriveAvailableRoles()` computes role hierarchy fallback

### Key Types (`src/types/`)

- `user.ts` — `UserRole` (5 roles), `UserCategory` ("debutant" | "confirme" | "expert"), `User` interface
- `database.ts` — `DbProfile`, `DbOrganization`, `DbTeam`, `DbPeriodResult` (Supabase row types)
- `ratios.ts` — `RatioId` (7 business ratios), `RatioConfig`, `ComputedRatio`
- `results.ts` — `PeriodResults` with prospection, vendeurs, acheteurs, ventes data
- `objectives.ts` — `ObjectiveBreakdown` for GPS funnel calculation
- `formation.ts` — `FormationDiagnostic`, `FormationRecommendation`
- `coach.ts` — `CoachAssignment`, `CoachAction`, `CoachPlan`, `CoachNote`, `CoachSession`
- `finance.ts` — `FinancialData`, `FinancialFieldId`

### Business Logic (`src/lib/`)

- `ratios.ts` — `computeRatioValue()`, `computeAllRatios()`, `determineRatioStatus()`
- `objectifs.ts` — `calculateObjectiveBreakdown()` funnel from CA → estimations → mandats → visites → offres → compromis → actes
- `formation.ts` — `generateFormationDiagnostic()` maps weak ratios to training areas
- `export.ts` — Role-based Excel export with field selection, multi-sheet structure, 6 scopes (mes-donnees, mon-equipe, mon-agence, detail-collaborateurs, client-coach, portefeuille-coach, mon-reseau, reseau-detail-agences)
- `guided-tour.ts` — Role-based tour steps (conseiller 6, manager 6, directeur 6, coach 4, réseau 4), localStorage persistence
- `coach.ts` — `getCoachScopeUserIds()`, diagnostic/alert generation, coaching plan generation
- `finance.ts` — Revenue, commissions, breakeven analysis
- `aggregate-results.ts` — YTD aggregation of monthly results
- `constants.ts` — `CATEGORY_LABELS` (Junior/Confirmé/Expert), `CATEGORY_OBJECTIVES`, `GPS_THEME_LABELS`

### Hooks (`src/hooks/`)

- `use-user.ts` — current user + category from store
- `use-results.ts` — `useResults(userId?)` and `useAllResults()`
- `use-ratios.ts` — `useRatios()` returns computedRatios + ratioConfigs
- `use-director-data.ts` — `useDirectorData()` — team aggregation, org-wide stats (`TeamAggregate`, `OrgStats`)
- `use-network-data.ts` — `useNetworkData()` — cross-agency aggregation (`AgencyAggregate`, `NetworkStats`, `TopPerformer`, alerts)
- `use-agency-gps.ts` — `useAgencyGPS()` — theme, period, GPS, overview, entityBars
- `use-coach-data.ts` — `useCoachData()` — portfolio clients, summaries, priorities
- `use-team-gps.ts` — Team-level GPS for managers
- `use-ytd-results.ts` — Year-to-date aggregated results

### Mock Data (`src/data/`)

- `mock-users.ts` — 12 users: 1 directeur (also has reseau+coach roles), 2 managers, 8 agents, 1 coach (org-demo)
- `mock-network.ts` — 7 Lyon users (org-demo-2), 1 réseau admin, Network type, Jan+Feb results, institution
- `mock-results.ts` — Feb 2026 + Jan 2026 results for org-demo users
- `mock-ratios.ts` — Default ratio thresholds per category
- `mock-coach.ts` — Coach assignments, actions, plans, notes, sessions
- `mock-finance.ts` — Financial input data
- Demo mode: 2 months (Jan + Feb 2026), 20 users, 2 institutions, 5 teams, 1 network

### Components

- `components/layout/` — Sidebar (icon-based, sections by role with `managerOnly`/`directorOnly`/`coachOnly`/`networkOnly` flags), Header (view toggle, import/export, theme, notifications), MobileSidebar
- `components/charts/` — LineChart, BarChart, DonutChart, ProgressBar, ComparisonBarChart (all Recharts wrappers)
- `components/dashboard/` — KpiCard (with optional onExpand for drill-down chart)
- `components/export/` — ExportModal with field selection checkboxes
- `components/tour/` — GuidedTour overlay with SVG mask highlight
- `components/ui/` — Radix-based primitives

## Important Conventions

- **French UI language** — Always use real characters (é, è, à, ç). NEVER unicode escape sequences (\u00e9).
- **"Junior" not "Débutant"** — The label for `debutant` category is "Junior" everywhere (set in `src/lib/constants.ts` CATEGORY_LABELS).
- **7 ratios only** — `delai_moyen_vente` was removed. Do not re-add it.
- **5 roles** — `conseiller`, `manager`, `directeur`, `coach`, `reseau`. Do not add roles without updating all related systems (types, store, sidebar, export, guided tour, register page).
- **Objectifs page** uses `NiveauChoice = UserCategory | "actuel"` — "actuel" overrides thresholds with real performance values from `useRatios()`.
- Mock data in `src/data/mock-*.ts` — all data is client-side mock; no API calls yet.
- Sidebar navigation defined in `src/components/layout/sidebar.tsx` with role flags for route filtering.

## Product Vision

NXT Performance is a performance cockpit for real estate agents, managers, directors, coaches, and networks.

Primary goals:
- Visualize business performance clearly
- Identify weak ratios quickly
- Guide training priorities
- Help managers coach based on objective metrics
- Enable multi-agency network piloting

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

- Store users, networks, institutions
- Store results per period
- Store objectives
- Store ratio thresholds per category
- Enable multi-user manager dashboard
- Network-level data aggregation

Must support:
- Multi-agent team
- Multi-agency network
- Historical tracking
- Role-based access (5 roles)
