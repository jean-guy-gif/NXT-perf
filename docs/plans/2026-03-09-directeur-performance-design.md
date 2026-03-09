# Design: Directeur Performance Page (replaces Projection)

## Summary

Replace the directeur "Projection" page with a "Performance" page showing all 7 ratios at agency level — collective and individual views, with month/year toggle. Same ratio display as manager/equipe but across the entire agency with a 3-level hierarchy (agence → équipe → conseiller).

## Page Structure

### Header
- Title: "Performance Agence"
- Toggle Mois/Année (reuses `period` from `useAgencyGPS`)

### View Toggle: Collective | Individuelle

### Vue Collective (3 hierarchical levels)

1. **Agency card** (top) — average of 7 ratios across entire agency
   - Global score badge (green/orange/red)
   - Grid of 7 ratio cards with value + ProgressBar + "X% de l'objectif"

2. **Team cards** — one per team
   - Team name + conseiller count
   - Global performance score
   - Expandable: click to reveal 7 ratio grid for that team

3. **Conseiller cards** (under each team, indented)
   - Name + category badge + global perf + ProgressBar

### Vue Individuelle

- Single dropdown with all conseillers across agency
- Selected card: avatar + name + category + team name
- Grid of 7 detailed ratio cards (identical to manager/equipe)

## Data Flow

- `useAgencyGPS()` for period (mois/année) state
- `useDirectorData()` for teams, allConseillers, allResults
- `computeAllRatios()` per conseiller
- Team average = mean of conseillers' `percentageOfTarget` per ratio
- Agency average = mean of all conseillers' `percentageOfTarget` per ratio

## Navigation Changes

- Sidebar: replace "Projection" (TrendingUp) → "Performance" (BarChart3)
- Route: `/directeur/performance`
- Delete: projection page + `ProjectionEntry` type + `projectionData` from hook

## Files to Modify

1. `src/app/(dashboard)/directeur/projection/page.tsx` → delete
2. `src/app/(dashboard)/directeur/performance/page.tsx` → create
3. `src/components/layout/sidebar.tsx` → update nav item
4. `src/hooks/use-agency-gps.ts` → remove projectionData computation
5. Types cleanup (remove ProjectionEntry)
