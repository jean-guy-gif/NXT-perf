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
