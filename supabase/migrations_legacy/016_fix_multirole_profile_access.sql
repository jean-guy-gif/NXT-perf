-- 016: Fix multi-role signup — robust trigger + unified RLS SELECT
--
-- Root cause: after multi-role signup, the dashboard layout SELECT on profiles
-- could fail (race condition or RLS miss) → redirect to /welcome.
--
-- Fix A: Rewrite handle_new_user with needs_org logic (not coach_standalone flag)
-- Fix B: Consolidate profiles SELECT RLS into one policy: self OR same-org

-- ══════════════════════════════════════════════════════════════════════════════
-- A) TRIGGER: handle_new_user — deterministic, needs_org-based
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _org_id         uuid;
  _team_id        uuid;
  _main_role      text;
  _roles          text[];
  _invite_code    text;
  _org_name       text;
  _needs_org      boolean;
  _generated_code text;
  _onboarding     text;
BEGIN
  -- ── Read metadata ─────────────────────────────────────────────────
  _main_role := coalesce(
    new.raw_user_meta_data ->> 'main_role',
    new.raw_user_meta_data ->> 'role',
    'conseiller'
  );
  _invite_code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');
  _org_name    := nullif(trim(coalesce(new.raw_user_meta_data ->> 'org_name', '')), '');

  -- ── Parse selected_roles (JSON array → text[]) ───────────────────
  IF new.raw_user_meta_data ? 'selected_roles' THEN
    SELECT array_agg(elem::text)
    INTO _roles
    FROM jsonb_array_elements_text(new.raw_user_meta_data -> 'selected_roles') AS elem;
  END IF;

  -- Fallback: try legacy key 'available_roles'
  IF (_roles IS NULL OR array_length(_roles, 1) IS NULL)
     AND new.raw_user_meta_data ? 'available_roles' THEN
    SELECT array_agg(elem::text)
    INTO _roles
    FROM jsonb_array_elements_text(new.raw_user_meta_data -> 'available_roles') AS elem;
  END IF;

  -- Final fallback: derive from main_role
  IF _roles IS NULL OR array_length(_roles, 1) IS NULL THEN
    CASE _main_role
      WHEN 'directeur' THEN _roles := ARRAY['directeur', 'manager', 'conseiller'];
      WHEN 'manager'   THEN _roles := ARRAY['manager', 'conseiller'];
      WHEN 'coach'     THEN _roles := ARRAY['coach'];
      ELSE                   _roles := ARRAY['conseiller'];
    END CASE;
  END IF;

  -- ── Determine if an org is needed ─────────────────────────────────
  -- Any role that is NOT coach requires an organisation
  _needs_org := _roles && ARRAY['conseiller', 'manager', 'directeur'];

  -- ══════════════════════════════════════════════════════════════════
  -- PATH 1: Coach-only standalone (no org required)
  -- ══════════════════════════════════════════════════════════════════
  IF NOT _needs_org THEN
    INSERT INTO public.profiles (
      id, org_id, team_id, email, first_name, last_name,
      role, available_roles, category, onboarding_status
    ) VALUES (
      new.id,
      NULL,
      NULL,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', ''),
      _main_role,
      _roles,
      coalesce(new.raw_user_meta_data ->> 'category', 'debutant'),
      'DONE'
    );
    RETURN new;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- PATH 2: Needs org → resolve org_id + team_id (NEVER NULL)
  -- ══════════════════════════════════════════════════════════════════

  IF _invite_code IS NOT NULL THEN
    -- ── 2a) Join existing org via invite code ───────────────────────
    SELECT id INTO _org_id
    FROM public.organizations
    WHERE invite_code = _invite_code;

    IF _org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code: %', _invite_code;
    END IF;

    -- Pick first team in org
    SELECT id INTO _team_id
    FROM public.teams
    WHERE org_id = _org_id
    ORDER BY created_at
    LIMIT 1;

    -- If org has no team yet, create one
    IF _team_id IS NULL THEN
      INSERT INTO public.teams (org_id, name)
      VALUES (_org_id, 'Équipe principale')
      RETURNING id INTO _team_id;
    END IF;

    _onboarding := 'NOT_STARTED';

  ELSIF _org_name IS NOT NULL THEN
    -- ── 2b) Create named org ────────────────────────────────────────
    _generated_code := upper(replace(left(_org_name, 12), ' ', '-'))
                       || '-' || left(md5(random()::text), 4);

    INSERT INTO public.organizations (name, invite_code)
    VALUES (_org_name, _generated_code)
    RETURNING id INTO _org_id;

    INSERT INTO public.teams (org_id, name)
    VALUES (_org_id, 'Équipe ' || _org_name)
    RETURNING id INTO _team_id;

    _onboarding := 'DONE';

  ELSE
    -- ── 2c) No invite, no org name → auto-create personal org ──────
    _generated_code := 'PERSO-' || left(md5(random()::text), 6);

    INSERT INTO public.organizations (name, invite_code)
    VALUES ('Espace personnel', _generated_code)
    RETURNING id INTO _org_id;

    INSERT INTO public.teams (org_id, name)
    VALUES (_org_id, 'Équipe personnelle')
    RETURNING id INTO _team_id;

    _onboarding := 'DONE';
  END IF;

  -- ── Insert profile ────────────────────────────────────────────────
  INSERT INTO public.profiles (
    id, org_id, team_id, email, first_name, last_name,
    role, available_roles, category, onboarding_status
  ) VALUES (
    new.id,
    _org_id,
    _team_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    _main_role,
    _roles,
    coalesce(new.raw_user_meta_data ->> 'category', 'debutant'),
    _onboarding
  );

  RETURN new;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- B) RLS: Unified profiles SELECT — self-read always works
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the two old policies (idempotent)
DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Single policy: can read own row OR any row in same org
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR org_id = public.get_my_org_id());
