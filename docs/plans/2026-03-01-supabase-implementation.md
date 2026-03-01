# Supabase Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Antigravity Dashboard from client-side mock data to Supabase (auth + Postgres + RLS) while preserving a client-side demo mode.

**Architecture:** Supabase Client Direct — the frontend calls Supabase via `@supabase/supabase-js`. Row Level Security (RLS) in Postgres enforces authorization. Zustand remains as a local UI cache. A `isDemo` flag routes hooks to either Supabase queries or mock data.

**Tech Stack:** Supabase (Auth + Postgres + RLS), `@supabase/supabase-js`, `@supabase/ssr`, Next.js 16 middleware, Zustand 5

**Design doc:** `docs/plans/2026-03-01-supabase-integration-design.md`

---

## Task 1: Install Supabase packages and create client files

**Files:**
- Modify: `package.json`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `.env.local.example`

**Step 1: Install Supabase dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Create the browser client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create the server client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 4: Create the middleware helper**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow auth pages and demo mode always
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/forgot-password") ||
    request.nextUrl.pathname.startsWith("/welcome");

  // Check for demo mode cookie
  const isDemo = request.cookies.get("nxt-demo-mode")?.value === "true";

  if (!user && !isAuthPage && !isDemo) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

**Step 5: Create .env.local.example**

Create `.env.local.example`:
```
# Supabase project credentials (get from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Supabase client setup and env config"
```

---

## Task 2: Create Next.js middleware for session management

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create the middleware**

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, logo-*.svg, *.png (static assets)
     * - api/ routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo-.*\\.svg|.*\\.png|api).*)",
  ],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts && git commit -m "feat: add Next.js middleware for Supabase session refresh"
```

---

## Task 3: Create SQL migrations for all tables

**Files:**
- Create: `supabase/migrations/001_create_organizations.sql`
- Create: `supabase/migrations/002_create_teams.sql`
- Create: `supabase/migrations/003_create_profiles.sql`
- Create: `supabase/migrations/004_create_period_results.sql`
- Create: `supabase/migrations/005_create_ratio_configs.sql`
- Create: `supabase/migrations/006_create_objectives.sql`

**Step 1: Create organizations table**

Create `supabase/migrations/001_create_organizations.sql`:
```sql
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
```

**Step 2: Create teams table**

Create `supabase/migrations/002_create_teams.sql`:
```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_teams_org_id on public.teams(org_id);

alter table public.teams enable row level security;
```

**Step 3: Create profiles table**

Create `supabase/migrations/003_create_profiles.sql`:
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  role text not null default 'conseiller' check (role in ('conseiller', 'manager')),
  category text not null default 'debutant' check (category in ('debutant', 'confirme', 'expert')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create index idx_profiles_org_id on public.profiles(org_id);
create index idx_profiles_team_id on public.profiles(team_id);

alter table public.profiles enable row level security;
```

**Step 4: Create period_results table**

Create `supabase/migrations/004_create_period_results.sql`:
```sql
create table public.period_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('day', 'week', 'month')),
  period_start date not null,
  period_end date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_period_results_user_id on public.period_results(user_id);
create unique index idx_period_results_user_period
  on public.period_results(user_id, period_type, period_start);

alter table public.period_results enable row level security;
```

**Step 5: Create ratio_configs table**

Create `supabase/migrations/005_create_ratio_configs.sql`:
```sql
create table public.ratio_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  ratio_id text not null,
  thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (org_id, ratio_id)
);

create index idx_ratio_configs_org_id on public.ratio_configs(org_id);

alter table public.ratio_configs enable row level security;
```

**Step 6: Create objectives table**

Create `supabase/migrations/006_create_objectives.sql`:
```sql
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null,
  input jsonb not null default '{}'::jsonb,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

create index idx_objectives_user_id on public.objectives(user_id);

alter table public.objectives enable row level security;
```

**Step 7: Commit**

```bash
git add supabase/ && git commit -m "feat: add SQL migrations for all Supabase tables"
```

---

## Task 4: Create RLS policies

**Files:**
- Create: `supabase/migrations/007_rls_policies.sql`

**Step 1: Write all RLS policies**

Create `supabase/migrations/007_rls_policies.sql`:
```sql
-- ═══════════════════════════════════════════════════════════
-- Helper: get current user's org_id
-- ═══════════════════════════════════════════════════════════

create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- ═══════════════════════════════════════════════════════════
-- Helper: check if current user is a manager
-- ═══════════════════════════════════════════════════════════

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  )
$$;

-- ═══════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════

-- Members can read their own org
create policy "org_select_own"
  on public.organizations for select
  using (id = public.get_my_org_id());

-- Anyone can read an org by invite_code (for registration lookup)
create policy "org_select_by_invite_code"
  on public.organizations for select
  using (true);

-- Managers can update their own org
create policy "org_update_manager"
  on public.organizations for update
  using (id = public.get_my_org_id() and public.is_manager());

-- Anyone authenticated can create an org (for new manager registration)
create policy "org_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- ═══════════════════════════════════════════════════════════
-- TEAMS
-- ═══════════════════════════════════════════════════════════

-- Members can read teams in their org
create policy "teams_select_org"
  on public.teams for select
  using (org_id = public.get_my_org_id());

-- Managers can insert teams in their org
create policy "teams_insert_manager"
  on public.teams for insert
  with check (org_id = public.get_my_org_id() and public.is_manager());

-- Managers can update teams in their org
create policy "teams_update_manager"
  on public.teams for update
  using (org_id = public.get_my_org_id() and public.is_manager());

-- Managers can delete teams in their org
create policy "teams_delete_manager"
  on public.teams for delete
  using (org_id = public.get_my_org_id() and public.is_manager());

-- ═══════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════

-- Members can read all profiles in their org
create policy "profiles_select_org"
  on public.profiles for select
  using (org_id = public.get_my_org_id());

-- User can update their own profile (non-role fields)
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Allow insert during registration (trigger inserts profile)
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- PERIOD_RESULTS
-- ═══════════════════════════════════════════════════════════

-- Agent sees own results; manager sees all in org
create policy "results_select"
  on public.period_results for select
  using (
    user_id = auth.uid()
    or (
      public.is_manager()
      and user_id in (
        select id from public.profiles where org_id = public.get_my_org_id()
      )
    )
  );

-- Agent can insert own results only
create policy "results_insert_own"
  on public.period_results for insert
  with check (user_id = auth.uid());

-- Agent can update own results only
create policy "results_update_own"
  on public.period_results for update
  using (user_id = auth.uid());

-- No delete policy = delete forbidden

-- ═══════════════════════════════════════════════════════════
-- RATIO_CONFIGS
-- ═══════════════════════════════════════════════════════════

-- All org members can read
create policy "ratio_configs_select_org"
  on public.ratio_configs for select
  using (org_id = public.get_my_org_id());

-- Manager can update org's ratio configs
create policy "ratio_configs_update_manager"
  on public.ratio_configs for update
  using (org_id = public.get_my_org_id() and public.is_manager());

-- Manager can insert ratio configs for org
create policy "ratio_configs_insert_manager"
  on public.ratio_configs for insert
  with check (org_id = public.get_my_org_id() and public.is_manager());

-- ═══════════════════════════════════════════════════════════
-- OBJECTIVES
-- ═══════════════════════════════════════════════════════════

-- Agent sees own; manager sees all in org
create policy "objectives_select"
  on public.objectives for select
  using (
    user_id = auth.uid()
    or (
      public.is_manager()
      and user_id in (
        select id from public.profiles where org_id = public.get_my_org_id()
      )
    )
  );

-- Agent can insert own objectives
create policy "objectives_insert_own"
  on public.objectives for insert
  with check (user_id = auth.uid());

-- Agent can update own objectives
create policy "objectives_update_own"
  on public.objectives for update
  using (user_id = auth.uid());
```

**Step 2: Commit**

```bash
git add supabase/ && git commit -m "feat: add RLS policies for all tables"
```

---

## Task 5: Create triggers and seed data

**Files:**
- Create: `supabase/migrations/008_triggers.sql`
- Create: `supabase/seed.sql`

**Step 1: Create the auto-profile trigger**

Create `supabase/migrations/008_triggers.sql`:
```sql
-- ═══════════════════════════════════════════════════════════
-- Trigger: auto-create profile on signup
-- ═══════════════════════════════════════════════════════════
-- The frontend passes invite_code, first_name, last_name, role
-- in the user_metadata during signUp().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _org_id uuid;
  _role text;
  _invite_code text;
begin
  _invite_code := new.raw_user_meta_data ->> 'invite_code';
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'conseiller');

  -- If role is manager and no invite_code, they're creating a new org
  -- (handled client-side: org is created first, then signup passes invite_code)
  if _invite_code is not null and _invite_code != '' then
    select id into _org_id
    from public.organizations
    where invite_code = _invite_code;
  end if;

  -- If we couldn't find the org, raise (registration should have validated)
  if _org_id is null then
    raise exception 'Invalid invite code: %', _invite_code;
  end if;

  -- Check if this is the first member (becomes manager automatically)
  if not exists (select 1 from public.profiles where org_id = _org_id) then
    _role := 'manager';
  end if;

  insert into public.profiles (id, org_id, email, first_name, last_name, role, category)
  values (
    new.id,
    _org_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    _role,
    coalesce(new.raw_user_meta_data ->> 'category', 'debutant')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- Trigger: auto-update updated_at on period_results
-- ═══════════════════════════════════════════════════════════

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.period_results
  for each row execute function public.update_updated_at();

create trigger set_updated_at_objectives
  before update on public.objectives
  for each row execute function public.update_updated_at();

create trigger set_updated_at_ratio_configs
  before update on public.ratio_configs
  for each row execute function public.update_updated_at();
```

**Step 2: Create seed data**

Create `supabase/seed.sql`:
```sql
-- Seed: default organization for Start Academy
insert into public.organizations (id, name, invite_code)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Start Academy',
  'START-2026'
);

-- Seed: default team
insert into public.teams (id, org_id, name)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Équipe Demo'
);

-- Seed: default ratio configs for Start Academy (7 ratios)
insert into public.ratio_configs (org_id, ratio_id, thresholds) values
  ('a0000000-0000-0000-0000-000000000001', 'contacts_rdv', '{"debutant": 20, "confirme": 15, "expert": 10}'),
  ('a0000000-0000-0000-0000-000000000001', 'estimations_mandats', '{"debutant": 4, "confirme": 2, "expert": 1.5}'),
  ('a0000000-0000-0000-0000-000000000001', 'pct_mandats_exclusifs', '{"debutant": 30, "confirme": 50, "expert": 70}'),
  ('a0000000-0000-0000-0000-000000000001', 'visites_offre', '{"debutant": 12, "confirme": 10, "expert": 8}'),
  ('a0000000-0000-0000-0000-000000000001', 'offres_compromis', '{"debutant": 3, "confirme": 2, "expert": 1.5}'),
  ('a0000000-0000-0000-0000-000000000001', 'mandats_simples_vente', '{"debutant": 8, "confirme": 6, "expert": 4}'),
  ('a0000000-0000-0000-0000-000000000001', 'mandats_exclusifs_vente', '{"debutant": 3, "confirme": 2, "expert": 1.5}');
```

**Step 3: Commit**

```bash
git add supabase/ && git commit -m "feat: add signup trigger, updated_at triggers, and seed data"
```

---

## Task 6: Update TypeScript types for Supabase

**Files:**
- Create: `src/types/database.ts`
- Modify: `src/types/user.ts`

**Step 1: Create database types**

Create `src/types/database.ts`:
```typescript
// Supabase row types (mirrors the SQL schema)
// These are the shapes returned by Supabase queries.

export interface DbOrganization {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  org_id: string;
  team_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: "conseiller" | "manager";
  category: "debutant" | "confirme" | "expert";
  avatar_url: string | null;
  created_at: string;
}

export interface DbPeriodResult {
  id: string;
  user_id: string;
  period_type: "day" | "week" | "month";
  period_start: string;
  period_end: string;
  data: {
    prospection: {
      contactsEntrants: number;
      contactsTotaux: number;
      rdvEstimation: number;
      informationsVente: Array<{
        id: string;
        nom: string;
        commentaire: string;
        statut: "en_cours" | "deale" | "abandonne";
      }>;
    };
    vendeurs: {
      rdvEstimation: number;
      estimationsRealisees: number;
      mandatsSignes: number;
      mandats: Array<{
        id: string;
        nomVendeur: string;
        type: "simple" | "exclusif";
      }>;
      rdvSuivi: number;
      requalificationSimpleExclusif: number;
      baissePrix: number;
    };
    acheteurs: {
      acheteursChauds: Array<{
        id: string;
        nom: string;
        commentaire: string;
        statut: "en_cours" | "deale" | "abandonne";
      }>;
      acheteursSortisVisite: number;
      nombreVisites: number;
      offresRecues: number;
      compromisSignes: number;
    };
    ventes: {
      actesSignes: number;
      chiffreAffaires: number;
      delaiMoyenVente: number;
    };
  };
  created_at: string;
  updated_at: string;
}

export interface DbRatioConfig {
  id: string;
  org_id: string;
  ratio_id: string;
  thresholds: {
    debutant: number;
    confirme: number;
    expert: number;
  };
  updated_at: string;
}

export interface DbObjective {
  id: string;
  user_id: string;
  year: number;
  input: { objectifFinancierAnnuel: number };
  breakdown: Record<string, number>;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Add conversion helpers to map DB types to existing app types**

Add to the bottom of `src/types/database.ts`:
```typescript
import type { PeriodResults } from "./results";
import type { RatioConfig, RatioId } from "./ratios";

/** Convert a Supabase period_results row to the app's PeriodResults type */
export function dbResultToAppResult(row: DbPeriodResult): PeriodResults {
  return {
    id: row.id,
    userId: row.user_id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    prospection: row.data.prospection,
    vendeurs: row.data.vendeurs,
    acheteurs: row.data.acheteurs,
    ventes: row.data.ventes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a set of Supabase ratio_configs rows to the app's Record<RatioId, RatioConfig> */
export function dbRatioConfigsToApp(
  rows: DbRatioConfig[],
  defaults: Record<RatioId, RatioConfig>
): Record<RatioId, RatioConfig> {
  const result = { ...defaults };
  for (const row of rows) {
    const id = row.ratio_id as RatioId;
    if (result[id]) {
      result[id] = {
        ...result[id],
        thresholds: row.thresholds,
      };
    }
  }
  return result;
}
```

**Step 3: Commit**

```bash
git add src/types/database.ts && git commit -m "feat: add Supabase database types and conversion helpers"
```

---

## Task 7: Refactor the Zustand store for dual-mode (Supabase + demo)

**Files:**
- Modify: `src/stores/app-store.ts`

**Step 1: Rewrite the store**

Replace the entire content of `src/stores/app-store.ts` with:

```typescript
import { create } from "zustand";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { DbProfile } from "@/types/database";
import { mockUsers } from "@/data/mock-users";
import { mockResults } from "@/data/mock-results";
import { defaultRatioConfigs } from "@/data/mock-ratios";

export type RemovalReason = "deale" | "abandonne";

export interface RemovedItem {
  id: string;
  nom: string;
  commentaire: string;
  type: "info_vente" | "acheteur_chaud";
  reason: RemovalReason;
  removedAt: string;
}

interface AppState {
  // ── Auth ──
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  profile: DbProfile | null;

  // ── Data (cache for Supabase, or mock for demo) ──
  users: User[];
  results: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  removedItems: RemovedItem[];

  // ── Demo mode ──
  enterDemo: () => void;
  exitDemo: () => void;

  // ── Auth actions (used in demo mode only) ──
  login: (email: string, password: string) => "success" | "not_found" | "wrong_password";
  logout: () => void;
  register: (user: User) => void;
  updateUserPassword: (email: string, newPassword: string) => boolean;

  // ── Supabase auth ──
  setProfile: (profile: DbProfile | null) => void;
  setAuthenticated: (authed: boolean) => void;

  // ── Data actions (used in both modes) ──
  setUser: (user: User) => void;
  switchRole: () => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  assignAgent: (agentId: string, managerId: string) => void;
  unassignAgent: (agentId: string) => void;
  addResults: (result: PeriodResults) => void;
  setResults: (results: PeriodResults[]) => void;
  removeInfoVente: (resultId: string, itemId: string, reason: RemovalReason) => void;
  removeAcheteurChaud: (resultId: string, itemId: string, reason: RemovalReason) => void;
  setRatioConfigs: (configs: Record<RatioId, RatioConfig>) => void;
  updateRatioThreshold: (
    ratioId: RatioId,
    level: "debutant" | "confirme" | "expert",
    value: number
  ) => void;
  resetRatioConfigs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isDemo: false,
  profile: null,
  users: [],
  results: [],
  ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
  removedItems: [],

  // ── Demo mode ──
  enterDemo: () => {
    const demoUser = mockUsers[0];
    document.cookie = "nxt-demo-mode=true;path=/;max-age=86400";
    set({
      isDemo: true,
      isAuthenticated: true,
      user: demoUser,
      users: mockUsers,
      results: mockResults,
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
    });
  },

  exitDemo: () => {
    document.cookie = "nxt-demo-mode=;path=/;max-age=0";
    set({
      isDemo: false,
      isAuthenticated: false,
      user: null,
      users: [],
      results: [],
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      removedItems: [],
    });
  },

  // ── Auth (demo mode only — Supabase mode uses supabase.auth directly) ──
  login: (email, password) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return "not_found";
    if (found.password && found.password !== password) return "wrong_password";
    set({ user: found, isAuthenticated: true });
    return "success";
  },

  logout: () => {
    const isDemo = get().isDemo;
    if (isDemo) {
      get().exitDemo();
    } else {
      set({ user: null, isAuthenticated: false, profile: null });
    }
  },

  register: (user) => {
    set((state) => ({
      users: [...state.users, user],
      user,
      isAuthenticated: true,
    }));
  },

  updateUserPassword: (email, newPassword) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return false;
    set((state) => ({
      users: state.users.map((u) =>
        u.email === email ? { ...u, password: newPassword } : u
      ),
    }));
    return true;
  },

  // ── Supabase auth ──
  setProfile: (profile) => {
    if (profile) {
      const user: User = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        category: profile.category,
        teamId: profile.team_id ?? "",
        avatarUrl: profile.avatar_url ?? undefined,
        createdAt: profile.created_at,
      };
      set({ profile, user, isAuthenticated: true });
    } else {
      set({ profile: null, user: null, isAuthenticated: false });
    }
  },

  setAuthenticated: (authed) => set({ isAuthenticated: authed }),

  // ── Data actions ──
  setUser: (user) => set({ user }),

  switchRole: () => {
    const current = get().user;
    if (!current) return;
    const isManager = current.role === "manager";
    const users = get().users;
    const newUser = isManager
      ? users.find((u) => u.role === "conseiller") ?? current
      : users.find((u) => u.role === "manager") ?? current;
    set({ user: newUser });
  },

  addUser: (user) => {
    set((state) => ({
      users: [...state.users, user],
    }));
  },

  removeUser: (userId) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      results: state.results.filter((r) => r.userId !== userId),
    }));
  },

  assignAgent: (agentId, managerId) => {
    const manager = get().users.find((u) => u.id === managerId);
    if (!manager) return;
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId, teamId: manager.teamId } : u
      ),
    }));
  },

  unassignAgent: (agentId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId: undefined } : u
      ),
    }));
  },

  addResults: (result) => {
    set((state) => ({
      results: [...state.results.filter((r) => r.id !== result.id), result],
    }));
  },

  setResults: (results) => set({ results }),

  removeInfoVente: (resultId, itemId, reason) => {
    set((state) => {
      const result = state.results.find((r) => r.id === resultId);
      const item = result?.prospection.informationsVente.find((i) => i.id === itemId);
      return {
        results: state.results.map((r) =>
          r.id === resultId
            ? {
                ...r,
                prospection: {
                  ...r.prospection,
                  informationsVente: r.prospection.informationsVente.filter(
                    (i) => i.id !== itemId
                  ),
                },
              }
            : r
        ),
        removedItems: item
          ? [
              ...state.removedItems,
              {
                id: item.id,
                nom: item.nom,
                commentaire: item.commentaire,
                type: "info_vente" as const,
                reason,
                removedAt: new Date().toISOString(),
              },
            ]
          : state.removedItems,
      };
    });
  },

  removeAcheteurChaud: (resultId, itemId, reason) => {
    set((state) => {
      const result = state.results.find((r) => r.id === resultId);
      const item = result?.acheteurs.acheteursChauds.find((i) => i.id === itemId);
      return {
        results: state.results.map((r) =>
          r.id === resultId
            ? {
                ...r,
                acheteurs: {
                  ...r.acheteurs,
                  acheteursChauds: r.acheteurs.acheteursChauds.filter(
                    (i) => i.id !== itemId
                  ),
                },
              }
            : r
        ),
        removedItems: item
          ? [
              ...state.removedItems,
              {
                id: item.id,
                nom: item.nom,
                commentaire: item.commentaire,
                type: "acheteur_chaud" as const,
                reason,
                removedAt: new Date().toISOString(),
              },
            ]
          : state.removedItems,
      };
    });
  },

  setRatioConfigs: (configs) => set({ ratioConfigs: configs }),

  updateRatioThreshold: (ratioId, level, value) => {
    set((state) => ({
      ratioConfigs: {
        ...state.ratioConfigs,
        [ratioId]: {
          ...state.ratioConfigs[ratioId],
          thresholds: {
            ...state.ratioConfigs[ratioId].thresholds,
            [level]: value,
          },
        },
      },
    }));
  },

  resetRatioConfigs: () => {
    set({ ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)) });
  },
}));
```

Key changes from the original store:
- Added `isDemo`, `profile`, `enterDemo()`, `exitDemo()`, `setProfile()`, `setAuthenticated()`, `setResults()`
- Store starts with empty data (not pre-loaded with mocks) — demo mode fills it explicitly
- `logout()` now handles both demo and Supabase modes
- All existing actions preserved for backward compatibility

**Step 2: Verify the build compiles**

Run: `npx next build`
Expected: Build succeeds (no type errors).

**Step 3: Commit**

```bash
git add src/stores/app-store.ts && git commit -m "refactor: update Zustand store for dual Supabase/demo mode"
```

---

## Task 8: Create Supabase data hooks

**Files:**
- Create: `src/hooks/use-supabase.ts`
- Create: `src/hooks/use-supabase-results.ts`
- Create: `src/hooks/use-supabase-profile.ts`
- Create: `src/hooks/use-supabase-ratio-configs.ts`

**Step 1: Create the Supabase client hook**

Create `src/hooks/use-supabase.ts`:
```typescript
"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSupabase() {
  return useMemo(() => createClient(), []);
}
```

**Step 2: Create the profile hook**

Create `src/hooks/use-supabase-profile.ts`:
```typescript
"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";

/**
 * Loads the current user's profile from Supabase on mount.
 * In demo mode, does nothing (store already has mock user).
 */
export function useSupabaseProfile() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    if (isDemo || profile) return;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as DbProfile);
      }
    }

    load();
  }, [supabase, isDemo, setProfile, profile]);
}
```

**Step 3: Create the results hook**

Create `src/hooks/use-supabase-results.ts`:
```typescript
"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import { dbResultToAppResult } from "@/types/database";
import type { DbPeriodResult } from "@/types/database";
import type { PeriodResults } from "@/types/results";

/**
 * Loads results from Supabase into the store.
 * In demo mode, the store already has mock results.
 */
export function useSupabaseResults() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setResults = useAppStore((s) => s.setResults);

  useEffect(() => {
    if (isDemo || !profile) return;

    async function load() {
      // Manager gets all org results; agent gets own
      const isManager = profile!.role === "manager";

      let query = supabase.from("period_results").select("*");

      if (!isManager) {
        query = query.eq("user_id", profile!.id);
      }
      // RLS handles org-level filtering for managers

      const { data, error } = await query;

      if (!error && data) {
        const results = (data as DbPeriodResult[]).map(dbResultToAppResult);
        setResults(results);
      }
    }

    load();
  }, [supabase, isDemo, profile, setResults]);

  /** Save (upsert) a PeriodResults to Supabase */
  const saveResult = useCallback(
    async (result: PeriodResults) => {
      if (isDemo) {
        // Demo mode: just update the store
        useAppStore.getState().addResults(result);
        return;
      }

      const { error } = await supabase.from("period_results").upsert(
        {
          id: result.id,
          user_id: result.userId,
          period_type: result.periodType,
          period_start: result.periodStart,
          period_end: result.periodEnd,
          data: {
            prospection: result.prospection,
            vendeurs: result.vendeurs,
            acheteurs: result.acheteurs,
            ventes: result.ventes,
          },
        },
        { onConflict: "user_id,period_type,period_start" }
      );

      if (!error) {
        // Update local store cache
        useAppStore.getState().addResults(result);
      }

      return error;
    },
    [supabase, isDemo]
  );

  return { saveResult };
}
```

**Step 4: Create the ratio configs hook**

Create `src/hooks/use-supabase-ratio-configs.ts`:
```typescript
"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import { dbRatioConfigsToApp } from "@/types/database";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { DbRatioConfig } from "@/types/database";
import type { RatioId } from "@/types/ratios";

/**
 * Loads ratio configs from Supabase into the store.
 * In demo mode, the store already has default configs.
 */
export function useSupabaseRatioConfigs() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const setRatioConfigs = useAppStore((s) => s.setRatioConfigs);

  useEffect(() => {
    if (isDemo || !profile) return;

    async function load() {
      const { data, error } = await supabase
        .from("ratio_configs")
        .select("*");

      if (!error && data) {
        const configs = dbRatioConfigsToApp(
          data as DbRatioConfig[],
          defaultRatioConfigs
        );
        setRatioConfigs(configs);
      }
    }

    load();
  }, [supabase, isDemo, profile, setRatioConfigs]);

  /** Update a single ratio threshold in Supabase */
  const updateThreshold = useCallback(
    async (ratioId: RatioId, level: "debutant" | "confirme" | "expert", value: number) => {
      // Update local store immediately
      useAppStore.getState().updateRatioThreshold(ratioId, level, value);

      if (isDemo || !profile) return;

      // Get current full thresholds from store
      const current = useAppStore.getState().ratioConfigs[ratioId];

      await supabase.from("ratio_configs").upsert(
        {
          org_id: profile.org_id,
          ratio_id: ratioId,
          thresholds: current.thresholds,
        },
        { onConflict: "org_id,ratio_id" }
      );
    },
    [supabase, isDemo, profile]
  );

  return { updateThreshold };
}
```

**Step 5: Commit**

```bash
git add src/hooks/ && git commit -m "feat: add Supabase data hooks (profile, results, ratio configs)"
```

---

## Task 9: Create the data provider component

**Files:**
- Create: `src/components/providers/supabase-provider.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Create the data provider**

Create `src/components/providers/supabase-provider.tsx`:
```typescript
"use client";

import { useSupabaseProfile } from "@/hooks/use-supabase-profile";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { useSupabaseRatioConfigs } from "@/hooks/use-supabase-ratio-configs";

/**
 * Initializes Supabase data loading on mount.
 * Renders nothing — just triggers the hooks.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  useSupabaseProfile();
  useSupabaseResults();
  useSupabaseRatioConfigs();
  return <>{children}</>;
}
```

**Step 2: Wrap the dashboard layout with the provider**

Modify `src/app/(dashboard)/layout.tsx`:

Change the import block to add:
```typescript
import { SupabaseProvider } from "@/components/providers/supabase-provider";
```

Wrap `{children}` in the `<main>` tag:
```tsx
<main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
  <SupabaseProvider>{children}</SupabaseProvider>
</main>
```

**Step 3: Commit**

```bash
git add src/components/providers/ src/app/\(dashboard\)/layout.tsx && git commit -m "feat: add SupabaseProvider to dashboard layout"
```

---

## Task 10: Rewrite the login page for Supabase + demo mode

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Step 1: Rewrite the login page**

Replace the entire content of `src/app/(auth)/login/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(
    resetSuccess ? "Mot de passe réinitialisé avec succès. Connectez-vous." : ""
  );
  const enterDemo = useAppStore((s) => s.enterDemo);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError(authError.message);
      }
      return;
    }

    router.push("/dashboard");
  };

  const handleDemo = () => {
    enterDemo();
    router.push("/dashboard");
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Connexion
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Accédez à votre tableau de bord
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            placeholder="jean@start-academy.fr"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        {success && (
          <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleDemo}
        className="h-10 w-full rounded-lg border border-border bg-background font-medium text-foreground transition-colors hover:bg-muted"
      >
        Tester en démo
      </button>

      <div className="mt-4 flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground"
        >
          Mot de passe oublié ?
        </Link>
        <Link
          href="/register"
          className="text-primary hover:text-primary/80"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx && git commit -m "feat: rewrite login page for Supabase auth + demo mode"
```

---

## Task 11: Rewrite the register page for Supabase

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

**Step 1: Rewrite the register page**

Replace the entire content of `src/app/(auth)/register/page.tsx` with:

```tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole, UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") === "manager" ? "manager" : "conseiller") as UserRole;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    const supabase = createClient();
    setLoading(true);

    let finalInviteCode = inviteCode.trim();

    // If manager is creating a new org, create it first
    if (role === "manager" && !finalInviteCode) {
      if (!orgName.trim()) {
        setError("Le nom de l'organisation est obligatoire pour un manager.");
        setLoading(false);
        return;
      }

      // Generate a unique invite code
      const code = orgName.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 12) + "-" + Date.now().toString(36).slice(-4);

      const { error: orgError } = await supabase
        .from("organizations")
        .insert({ name: orgName.trim(), invite_code: code });

      if (orgError) {
        setError("Erreur lors de la création de l'organisation : " + orgError.message);
        setLoading(false);
        return;
      }

      finalInviteCode = code;
    }

    if (!finalInviteCode) {
      setError("Le code d'invitation est obligatoire.");
      setLoading(false);
      return;
    }

    // Verify invite code exists
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("invite_code", finalInviteCode)
      .single();

    if (!org) {
      setError("Code d'invitation invalide. Vérifiez avec votre manager.");
      setLoading(false);
      return;
    }

    // Sign up with metadata (trigger will create profile)
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          category,
          invite_code: finalInviteCode,
        },
      },
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Cet email est déjà utilisé.");
      } else {
        setError(authError.message);
      }
      return;
    }

    router.push("/dashboard");
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Créer un compte
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Rejoignez NXT-Perf
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClassName}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClassName}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            placeholder="Minimum 6 caractères"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Rôle
          </label>
          <div className="flex gap-3">
            {(["conseiller", "manager"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {r === "conseiller" ? "Conseiller" : "Manager"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Catégorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as UserCategory)}
            className={inputClassName}
          >
            {(["debutant", "confirme", "expert"] as UserCategory[]).map(
              (cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              )
            )}
          </select>
        </div>

        {role === "manager" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nom de l&apos;organisation
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Start Academy, Mon Agence, etc."
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Laissez vide si vous rejoignez une organisation existante avec un code
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Code d&apos;invitation{" "}
            {role === "conseiller" && <span className="text-destructive">*</span>}
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={role === "manager" ? "Optionnel si vous créez une org" : "Ex: START-2026"}
            className={inputClassName}
            required={role === "conseiller"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "conseiller"
              ? "Demandez le code à votre manager"
              : "Renseignez un code si vous rejoignez une organisation existante"}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Création en cours..." : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-primary hover:text-primary/80">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(auth\)/register/page.tsx && git commit -m "feat: rewrite register page for Supabase auth with org creation"
```

---

## Task 12: Rewrite the forgot-password page for Supabase

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`

**Step 1: Rewrite using Supabase password reset**

Replace the entire content with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/login?reset=success` }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Email envoyé
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Consultez votre boîte mail ({email}) pour réinitialiser votre mot de passe.
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-primary hover:text-primary/80"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Mot de passe oublié
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Entrez votre email pour recevoir un lien de réinitialisation
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer le lien"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:text-primary/80">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx && git commit -m "feat: rewrite forgot-password page for Supabase"
```

---

## Task 13: Update dashboard layout auth check

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Update the auth guard to support both modes**

The layout currently checks `isAuthenticated` from the store. This still works because:
- In demo mode: `enterDemo()` sets `isAuthenticated = true`
- In Supabase mode: `useSupabaseProfile()` (in SupabaseProvider) calls `setProfile()` which sets `isAuthenticated = true`
- The middleware handles the server-side redirect for unauthenticated users

No changes needed beyond what Task 9 already did (adding SupabaseProvider).

**Step 2: Add the demo banner**

Modify `src/app/(dashboard)/layout.tsx` to add a demo mode banner. After the existing import of `useAppStore`, the component should show a banner when `isDemo` is true.

Add after `if (!isAuthenticated) return null;`:

```tsx
const isDemo = useAppStore((s) => s.isDemo);
```

Add just inside the outer `<div>`, before the `<aside>`:

```tsx
{isDemo && (
  <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
    Mode démo — Les données ne sont pas sauvegardées.{" "}
    <a href="/register" className="underline hover:no-underline">
      Créer un compte
    </a>
  </div>
)}
```

And add padding-top to the outer div when demo is active:

Change `<div className="flex h-screen overflow-hidden bg-background">` to:
```tsx
<div className={cn("flex h-screen overflow-hidden bg-background", isDemo && "pt-8")}>
```

Also add the import for `cn`:
```typescript
import { cn } from "@/lib/utils";
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx && git commit -m "feat: add demo mode banner to dashboard layout"
```

---

## Task 14: Update the Saisie page to save to Supabase

**Files:**
- Modify: `src/app/(dashboard)/saisie/page.tsx`

**Step 1: Update the save handler**

In `src/app/(dashboard)/saisie/page.tsx`, change line 49 from:
```typescript
const addResults = useAppStore((s) => s.addResults);
```
to:
```typescript
import { useSupabaseResults } from "@/hooks/use-supabase-results";
```
(add to the top imports)

Then inside the component, replace `const addResults = ...` with:
```typescript
const { saveResult } = useSupabaseResults();
```

Then in the `handleSubmit` function, replace:
```typescript
addResults(result);
```
with:
```typescript
const error = await saveResult(result);
if (error) {
  // Could show an error toast here
  console.error("Failed to save:", error);
  return;
}
```

Also make `handleSubmit` async:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/saisie/page.tsx && git commit -m "feat: update Saisie page to save results via Supabase"
```

---

## Task 15: Update the Header logout to support Supabase

**Files:**
- Modify: `src/components/layout/header.tsx`

**Step 1: Find and update the logout handler**

Find the logout button in `header.tsx`. It currently calls `useAppStore(s => s.logout)`.

Update it to also sign out of Supabase:

```typescript
const handleLogout = async () => {
  const isDemo = useAppStore.getState().isDemo;
  if (!isDemo) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  useAppStore.getState().logout();
  router.push("/login");
};
```

Add the import:
```typescript
import { createClient } from "@/lib/supabase/client";
```

**Step 2: Commit**

```bash
git add src/components/layout/header.tsx && git commit -m "feat: update logout to sign out of Supabase"
```

---

## Task 16: Update the Manager Parametres page for Supabase

**Files:**
- Modify: `src/app/(dashboard)/manager/parametres/page.tsx`

**Step 1: Use the Supabase ratio config hook**

Find where `updateRatioThreshold` is used from the store. Replace with the Supabase-aware hook:

Add import:
```typescript
import { useSupabaseRatioConfigs } from "@/hooks/use-supabase-ratio-configs";
```

Replace the store's `updateRatioThreshold` with:
```typescript
const { updateThreshold } = useSupabaseRatioConfigs();
```

Then replace calls to `updateRatioThreshold(ratioId, level, value)` with `updateThreshold(ratioId, level, value)`.

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/manager/parametres/page.tsx && git commit -m "feat: update Parametres page to persist thresholds via Supabase"
```

---

## Task 17: Load org members for manager views

**Files:**
- Create: `src/hooks/use-supabase-team.ts`

**Step 1: Create the team hook**

Create `src/hooks/use-supabase-team.ts`:
```typescript
"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbProfile } from "@/types/database";
import type { User } from "@/types/user";

/**
 * Loads all org members into the store's users[] array.
 * Used by manager views (equipe, cockpit, classement).
 * In demo mode, the store already has mock users.
 */
export function useSupabaseTeam() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const profile = useAppStore((s) => s.profile);
  const addUser = useAppStore((s) => s.addUser);
  const users = useAppStore((s) => s.users);

  useEffect(() => {
    if (isDemo || !profile || users.length > 0) return;

    async function load() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      // RLS ensures we only get profiles from our org

      if (!error && data) {
        const dbProfiles = data as DbProfile[];
        for (const p of dbProfiles) {
          const user: User = {
            id: p.id,
            email: p.email,
            firstName: p.first_name,
            lastName: p.last_name,
            role: p.role,
            category: p.category,
            teamId: p.team_id ?? "",
            managerId: undefined,
            avatarUrl: p.avatar_url ?? undefined,
            createdAt: p.created_at,
          };
          addUser(user);
        }
      }
    }

    load();
  }, [supabase, isDemo, profile, users.length, addUser]);
}
```

**Step 2: Add this hook to the SupabaseProvider**

Modify `src/components/providers/supabase-provider.tsx` — add:
```typescript
import { useSupabaseTeam } from "@/hooks/use-supabase-team";
```

And inside the component:
```typescript
useSupabaseTeam();
```

**Step 3: Commit**

```bash
git add src/hooks/use-supabase-team.ts src/components/providers/supabase-provider.tsx && git commit -m "feat: add team loading hook for manager views"
```

---

## Task 18: Build verification

**Step 1: Run the build**

Run: `npx next build`
Expected: Build succeeds with no type errors.

**Step 2: Fix any type errors**

If there are type errors, fix them one by one. Common issues:
- Missing imports
- Store shape changes breaking component props
- Async functions needing `await`

**Step 3: Manual testing checklist**

Before deploying, test these flows:

1. **Demo mode**: Click "Tester en démo" on login → dashboard loads with mock data → demo banner visible → navigate all pages → logout returns to login
2. **Registration**: Create account with invite code → profile created → redirect to dashboard
3. **Login**: Sign in with real credentials → data loads from Supabase
4. **Saisie**: Enter results → click "Enregistrer" → data persists in Supabase
5. **Manager views**: Manager sees team members and their results
6. **Parametres**: Manager edits ratio thresholds → persisted in Supabase

**Step 4: Final commit**

```bash
git add -A && git commit -m "fix: resolve build errors from Supabase migration"
```

---

## Summary

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 1 | Supabase client setup + env | Small |
| 2 | Next.js middleware | Small |
| 3 | SQL migrations (6 tables) | Medium |
| 4 | RLS policies | Medium |
| 5 | Triggers + seed | Medium |
| 6 | TypeScript DB types | Small |
| 7 | Zustand store refactor | Large |
| 8 | Supabase data hooks (4 files) | Large |
| 9 | SupabaseProvider component | Small |
| 10 | Login page rewrite | Medium |
| 11 | Register page rewrite | Medium |
| 12 | Forgot password rewrite | Small |
| 13 | Dashboard layout update | Small |
| 14 | Saisie page save to Supabase | Small |
| 15 | Header logout update | Small |
| 16 | Parametres page update | Small |
| 17 | Team loading hook | Small |
| 18 | Build verification | Medium |

**Prerequisites**: User must create a Supabase project and add URL + anon key to `.env.local` before Tasks 10+ can be tested against a real backend. Tasks 1-9 can be implemented immediately.
