# Supabase Integration Design

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Supabase Client Direct (Approach A) — frontend calls Supabase via `@supabase/supabase-js`, security enforced by Row Level Security (RLS)

## Context

Antigravity Dashboard is a fully functional frontend prototype with no backend. All data lives in Zustand memory and is lost on page refresh. This design adds persistent storage, real auth, and multi-tenancy via Supabase.

## Decisions

- **Multi-tenant from day one** — `organizations` table with `invite_code` for onboarding
- **Inscription libre** — anyone can register and join an org via invite code, no manager approval needed
- **Sauvegarde manuelle** — agent clicks "Enregistrer" to persist results (no auto-save)
- **Mode demo preserved** — a "Tester en demo" button loads mock data client-side, zero Supabase calls
- **Supabase Client Direct** — no API routes for CRUD, RLS handles authorization in Postgres

## Database Schema

### organizations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | "Start Academy", etc. |
| invite_code | text UNIQUE | "START-2026" |
| created_at | timestamptz | default now() |

### teams

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK → organizations | |
| name | text | |
| created_at | timestamptz | default now() |

### profiles

Extends `auth.users` 1:1.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | = auth.users.id |
| org_id | uuid FK → organizations | |
| team_id | uuid FK → teams | nullable (assigned by manager later) |
| email | text | |
| first_name | text | |
| last_name | text | |
| role | text | "conseiller" or "manager" |
| category | text | "debutant", "confirme", or "expert" |
| avatar_url | text | nullable |
| created_at | timestamptz | default now() |

### period_results

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| period_type | text | "day", "week", or "month" |
| period_start | date | |
| period_end | date | |
| data | jsonb | {prospection, vendeurs, acheteurs, ventes} |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

The `data` column stores the full nested structure (ProspectionData, VendeursData, AcheteursData, VentesData) as a single JSONB blob matching the existing TypeScript types.

### ratio_configs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| org_id | uuid FK → organizations | |
| ratio_id | text | "contacts_rdv", etc. (7 ratios) |
| thresholds | jsonb | {debutant: N, confirme: N, expert: N} |
| updated_at | timestamptz | default now() |

UNIQUE constraint on (org_id, ratio_id).

### objectives

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → profiles | |
| year | integer | |
| input | jsonb | {objectifFinancierAnnuel: N} |
| breakdown | jsonb | funnel calculation |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

UNIQUE constraint on (user_id, year).

## Authentication

### Registration flow

1. User fills: email, password, first_name, last_name, invite_code
2. `supabase.auth.signUp()` creates the auth account
3. SQL trigger on `auth.users` INSERT creates the `profiles` row:
   - Looks up org via invite_code (passed in user_metadata)
   - Sets role = "conseiller", category = "debutant"
   - team_id = null (manager assigns later)
4. Redirect to /dashboard

### Login flow

1. `supabase.auth.signInWithPassword()`
2. Session managed via `@supabase/ssr` (httpOnly cookies)
3. Redirect to /dashboard

### Demo mode

1. "Tester en demo" button on /login
2. Sets `isDemo = true` in Zustand
3. Loads mock data from `src/data/mock-*.ts`
4. No Supabase calls
5. Banner: "Mode demo — Creez un compte pour sauvegarder vos donnees"

### Manager creation

- First user in an org becomes manager automatically (trigger logic)
- OR: existing manager promotes an agent via settings page

### Middleware

`middleware.ts` checks Supabase session on every `/dashboard/*` route. No session + not demo = redirect to `/login`.

### Packages

- `@supabase/supabase-js` — browser client
- `@supabase/ssr` — Next.js session management (cookies, middleware)

## Row Level Security (RLS)

### profiles

- SELECT: own profile + all profiles in same org
- UPDATE own: own profile fields only
- UPDATE role/category: manager of same org only

### period_results

- SELECT: own results (agent) OR all results in org (manager)
- INSERT: own user_id only
- UPDATE: own results only
- DELETE: forbidden

### ratio_configs

- SELECT: all members of org
- UPDATE: manager of org only

### objectives

- SELECT: own objectives (agent) OR all in org (manager)
- INSERT/UPDATE: own objectives only

### organizations

- SELECT: own org members
- UPDATE: manager of org only

### teams

- SELECT: org members
- INSERT/UPDATE/DELETE: manager only

All policies use `auth.uid()` joined to `profiles.org_id` to enforce tenant isolation.

## Frontend Migration Strategy

### Principle

Zustand remains as a local cache. Hooks become the data layer, querying Supabase (or returning mock data in demo mode).

### Supabase client files

```
src/lib/supabase/
  client.ts       — createBrowserClient()
  server.ts       — createServerClient()
  middleware.ts    — refresh session on each request
```

### Store simplification

The store drops all CRUD actions (login, register, addResults, etc.) and becomes:

```typescript
interface AppState {
  user: Profile | null;
  isDemo: boolean;
  results: PeriodResults[];           // cache
  ratioConfigs: Record<RatioId, RatioConfig>;  // cache
  removedItems: RemovedItem[];        // UI state
  enterDemo: () => void;
  exitDemo: () => void;
}
```

### Hook refactoring

| Current | After |
|---------|-------|
| `useAppStore(s => s.user)` | `useUser()` reads profile from Supabase session |
| `useAppStore(s => s.results)` | `useResults(userId?)` queries period_results |
| `useAppStore(s => s.ratioConfigs)` | `useRatioConfigs()` queries ratio_configs by org |
| `useAppStore(s => s.login)` | `supabase.auth.signInWithPassword()` in login form |
| `useAppStore(s => s.addResults)` | `supabase.from('period_results').upsert()` in Saisie page |

### Demo mode isolation

Each hook checks `isDemo` first. If true, returns mock data with no network calls.

### UI components unchanged

Components consume the same TypeScript types. Only the data source changes.

### Mock files preserved

`src/data/mock-*.ts` kept intact, used only in demo mode.

## Error Handling

| Situation | Behavior |
|-----------|----------|
| No network | Toast "Connexion perdue", cached data stays visible |
| Session expired | Middleware redirects to /login |
| Supabase query fail | Toast error + retry button |
| Invalid invite_code | Inline form error |
| RLS blocks access | Empty data returned (Supabase default) |

Simple `<Toast>` component using Radix.

## Seed Data

`supabase/seed.sql`:
1. Create org "Start Academy" with code "DEMO-2026"
2. Create team "Equipe Demo"
3. Insert 7 default ratio_configs for the org
4. No fake users in DB (demo mode is client-side only)

## File Structure

```
supabase/
  migrations/
    001_create_organizations.sql
    002_create_teams.sql
    003_create_profiles.sql
    004_create_period_results.sql
    005_create_ratio_configs.sql
    006_create_objectives.sql
    007_rls_policies.sql
    008_triggers.sql
  seed.sql
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   (server only)
```

## Deployment

1. Create Supabase project (web dashboard)
2. Copy URL + anon key to .env.local
3. Apply migrations
4. Run seed
5. Deploy to Vercel with env vars

HTTPS automatic on Vercel. Supabase backups automatic (daily on Free, PITR on Pro).

## Out of Scope

- Realtime subscriptions
- Supabase Storage (avatar upload)
- Edge Functions
- Custom email templates
- Two-factor authentication

These are future enhancements, not blockers for production.
