-- 014: Personal onboarding — support multi-role + solo accounts
-- 1) Make org_id nullable (standalone coaches, personal accounts)
-- 2) Extend role check to include 'coach'
-- 3) Replace handle_new_user with personal mode support

-- ─── Schema fixes ───────────────────────────────────────────────
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('conseiller', 'manager', 'directeur', 'coach'));

-- ─── Trigger replacement ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _org_id       uuid;
  _team_id      uuid;
  _main_role    text;
  _selected_roles text[];
  _context_mode text;
  _invite_code  text;
  _org_name     text;
  _coach_standalone boolean;
  _generated_code text;
BEGIN
  -- ── Read metadata ──
  _main_role := coalesce(
    new.raw_user_meta_data ->> 'main_role',
    new.raw_user_meta_data ->> 'role',
    'conseiller'
  );
  _context_mode    := coalesce(new.raw_user_meta_data ->> 'context_mode', '');
  _invite_code     := new.raw_user_meta_data ->> 'invite_code';
  _org_name        := new.raw_user_meta_data ->> 'org_name';
  _coach_standalone := coalesce(
    (new.raw_user_meta_data ->> 'coach_standalone')::boolean,
    false
  );

  -- ── Parse selected_roles (JSON array → text[]) ──
  IF new.raw_user_meta_data ? 'selected_roles' THEN
    SELECT array_agg(elem::text)
    INTO _selected_roles
    FROM jsonb_array_elements_text(new.raw_user_meta_data -> 'selected_roles') AS elem;
  END IF;

  -- Normalise: fallback to ARRAY[main_role]
  IF _selected_roles IS NULL OR array_length(_selected_roles, 1) IS NULL THEN
    _selected_roles := ARRAY[_main_role];
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- A) INVITE — join existing org via invite code
  -- ══════════════════════════════════════════════════════════════
  IF _context_mode = 'invite'
     AND _invite_code IS NOT NULL AND _invite_code != '' THEN

    SELECT id INTO _org_id
    FROM public.organizations
    WHERE invite_code = _invite_code;

    IF _org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code: %', _invite_code;
    END IF;

    -- Pick first team in org (if any) for convenience
    SELECT id INTO _team_id
    FROM public.teams
    WHERE org_id = _org_id
    ORDER BY created_at
    LIMIT 1;

  -- ══════════════════════════════════════════════════════════════
  -- B) CREATE_ORG — manager/directeur creates a named organisation
  -- ══════════════════════════════════════════════════════════════
  ELSIF _context_mode = 'create_org'
        AND _org_name IS NOT NULL AND _org_name != '' THEN

    _generated_code := upper(replace(left(_org_name, 12), ' ', '-'))
                       || '-' || left(md5(random()::text), 4);

    INSERT INTO public.organizations (name, invite_code)
    VALUES (_org_name, _generated_code)
    RETURNING id INTO _org_id;

    INSERT INTO public.teams (org_id, name)
    VALUES (_org_id, 'Équipe ' || _org_name)
    RETURNING id INTO _team_id;

  -- ══════════════════════════════════════════════════════════════
  -- C) PERSONAL — solo / personal account
  -- ══════════════════════════════════════════════════════════════
  ELSIF _context_mode = 'personal' THEN

    IF _coach_standalone AND _selected_roles = ARRAY['coach'] THEN
      -- Coach standalone: no org, no team
      _org_id  := NULL;
      _team_id := NULL;

    ELSIF _org_name IS NOT NULL AND _org_name != '' THEN
      -- Personal with org name → create named org (manager flow)
      _generated_code := upper(replace(left(_org_name, 12), ' ', '-'))
                         || '-' || left(md5(random()::text), 4);

      INSERT INTO public.organizations (name, invite_code)
      VALUES (_org_name, _generated_code)
      RETURNING id INTO _org_id;

      INSERT INTO public.teams (org_id, name)
      VALUES (_org_id, 'Équipe ' || _org_name)
      RETURNING id INTO _team_id;

    ELSE
      -- Truly personal: default names
      _generated_code := 'PERSO-' || left(md5(random()::text), 6);

      INSERT INTO public.organizations (name, invite_code)
      VALUES ('Espace personnel', _generated_code)
      RETURNING id INTO _org_id;

      INSERT INTO public.teams (org_id, name)
      VALUES (_org_id, 'Équipe personnelle')
      RETURNING id INTO _team_id;
    END IF;

  -- ══════════════════════════════════════════════════════════════
  -- LEGACY fallback — old signups without context_mode
  -- ══════════════════════════════════════════════════════════════
  ELSE
    IF _invite_code IS NOT NULL AND _invite_code != '' THEN
      SELECT id INTO _org_id
      FROM public.organizations
      WHERE invite_code = _invite_code;

      IF _org_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code: %', _invite_code;
      END IF;

      SELECT id INTO _team_id
      FROM public.teams
      WHERE org_id = _org_id
      ORDER BY created_at
      LIMIT 1;

    ELSIF _org_name IS NOT NULL AND _org_name != '' THEN
      _generated_code := upper(replace(left(_org_name, 12), ' ', '-'))
                         || '-' || left(md5(random()::text), 4);

      INSERT INTO public.organizations (name, invite_code)
      VALUES (_org_name, _generated_code)
      RETURNING id INTO _org_id;

      INSERT INTO public.teams (org_id, name)
      VALUES (_org_id, 'Équipe ' || _org_name)
      RETURNING id INTO _team_id;

    ELSIF _main_role = 'coach' THEN
      _org_id  := NULL;
      _team_id := NULL;

    ELSE
      -- Default to personal org
      _generated_code := 'PERSO-' || left(md5(random()::text), 6);

      INSERT INTO public.organizations (name, invite_code)
      VALUES ('Espace personnel', _generated_code)
      RETURNING id INTO _org_id;

      INSERT INTO public.teams (org_id, name)
      VALUES (_org_id, 'Équipe personnelle')
      RETURNING id INTO _team_id;
    END IF;
  END IF;

  -- ── Insert profile ──
  INSERT INTO public.profiles (
    id, org_id, team_id, email, first_name, last_name,
    role, available_roles, category, onboarding_status
  )
  VALUES (
    new.id,
    _org_id,
    _team_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    _main_role,
    _selected_roles,
    coalesce(new.raw_user_meta_data ->> 'category', 'debutant'),
    CASE
      WHEN _coach_standalone THEN 'DONE'
      WHEN _context_mode = 'personal' THEN 'DONE'
      WHEN _context_mode = 'create_org' THEN 'DONE'
      ELSE 'NOT_STARTED'
    END
  );

  RETURN new;
END;
$$;
