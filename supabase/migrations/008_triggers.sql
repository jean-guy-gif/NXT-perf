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
begin
  _invite_code := new.raw_user_meta_data ->> 'invite_code';
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'conseiller');

  if _invite_code is not null and _invite_code != '' then
    select id into _org_id
    from public.organizations
    where invite_code = _invite_code;
  end if;

  if _org_id is null then
    raise exception 'Invalid invite code: %', _invite_code;
  end if;

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
