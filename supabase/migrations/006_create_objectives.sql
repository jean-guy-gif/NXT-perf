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
