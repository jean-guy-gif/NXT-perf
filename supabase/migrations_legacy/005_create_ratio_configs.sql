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
