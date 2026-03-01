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
