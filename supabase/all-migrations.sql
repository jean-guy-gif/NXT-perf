create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_teams_org_id on public.teams(org_id);

alter table public.teams enable row level security;
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
-- Helper: get current user's org_id
create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

-- Helper: check if current user is a manager
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

-- ORGANIZATIONS
create policy "org_select_by_invite_code"
  on public.organizations for select
  using (true);

create policy "org_update_manager"
  on public.organizations for update
  using (id = public.get_my_org_id() and public.is_manager());

create policy "org_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- TEAMS
create policy "teams_select_org"
  on public.teams for select
  using (org_id = public.get_my_org_id());

create policy "teams_insert_manager"
  on public.teams for insert
  with check (org_id = public.get_my_org_id() and public.is_manager());

create policy "teams_update_manager"
  on public.teams for update
  using (org_id = public.get_my_org_id() and public.is_manager());

create policy "teams_delete_manager"
  on public.teams for delete
  using (org_id = public.get_my_org_id() and public.is_manager());

-- PROFILES
create policy "profiles_select_org"
  on public.profiles for select
  using (org_id = public.get_my_org_id());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- PERIOD_RESULTS
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

create policy "results_insert_own"
  on public.period_results for insert
  with check (user_id = auth.uid());

create policy "results_update_own"
  on public.period_results for update
  using (user_id = auth.uid());

-- RATIO_CONFIGS
create policy "ratio_configs_select_org"
  on public.ratio_configs for select
  using (org_id = public.get_my_org_id());

create policy "ratio_configs_update_manager"
  on public.ratio_configs for update
  using (org_id = public.get_my_org_id() and public.is_manager());

create policy "ratio_configs_insert_manager"
  on public.ratio_configs for insert
  with check (org_id = public.get_my_org_id() and public.is_manager());

-- OBJECTIVES
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

create policy "objectives_insert_own"
  on public.objectives for insert
  with check (user_id = auth.uid());

create policy "objectives_update_own"
  on public.objectives for update
  using (user_id = auth.uid());
-- Trigger: auto-create profile on signup
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
  _org_name text;
  _generated_code text;
begin
  _invite_code := new.raw_user_meta_data ->> 'invite_code';
  _org_name := new.raw_user_meta_data ->> 'org_name';
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'conseiller');

  -- Case 1: Joining existing org via invite code
  if _invite_code is not null and _invite_code != '' then
    select id into _org_id
    from public.organizations
    where invite_code = _invite_code;

    if _org_id is null then
      raise exception 'Invalid invite code: %', _invite_code;
    end if;

  -- Case 2: Manager creating a new org
  elsif _org_name is not null and _org_name != '' and _role = 'manager' then
    _generated_code := upper(replace(left(_org_name, 12), ' ', '-')) || '-' || left(md5(random()::text), 4);

    insert into public.organizations (name, invite_code)
    values (_org_name, _generated_code)
    returning id into _org_id;

  else
    raise exception 'Either invite_code or org_name is required';
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

-- Trigger: auto-update updated_at
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
