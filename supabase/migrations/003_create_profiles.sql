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
