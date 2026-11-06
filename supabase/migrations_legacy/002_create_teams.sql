create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_teams_org_id on public.teams(org_id);

alter table public.teams enable row level security;
