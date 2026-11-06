-- 013: Add available_roles column to profiles
-- Stores the array of roles a user can switch between (multi-view toggle pills)

-- Add column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_roles text[] DEFAULT NULL;

-- Backfill existing users based on their primary role
UPDATE profiles SET available_roles = ARRAY['directeur', 'manager', 'conseiller'] WHERE role = 'directeur';
UPDATE profiles SET available_roles = ARRAY['manager', 'conseiller'] WHERE role = 'manager';
UPDATE profiles SET available_roles = ARRAY['conseiller'] WHERE role = 'conseiller';
UPDATE profiles SET available_roles = ARRAY['coach'] WHERE role = 'coach';

-- Update the trigger to store available_roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _org_id uuid;
  _role text;
  _available_roles text[];
  _invite_code text;
  _org_name text;
  _generated_code text;
BEGIN
  _invite_code := new.raw_user_meta_data ->> 'invite_code';
  _org_name := new.raw_user_meta_data ->> 'org_name';
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'conseiller');

  -- Parse available_roles from metadata (JSON array → text[])
  IF new.raw_user_meta_data ? 'available_roles' THEN
    SELECT array_agg(elem::text)
    INTO _available_roles
    FROM jsonb_array_elements_text(new.raw_user_meta_data -> 'available_roles') AS elem;
  ELSE
    -- Derive from primary role
    CASE _role
      WHEN 'directeur' THEN _available_roles := ARRAY['directeur', 'manager', 'conseiller'];
      WHEN 'manager' THEN _available_roles := ARRAY['manager', 'conseiller'];
      WHEN 'coach' THEN _available_roles := ARRAY['coach'];
      ELSE _available_roles := ARRAY['conseiller'];
    END CASE;
  END IF;

  -- Coach: org_id is optional
  IF _role = 'coach' THEN
    INSERT INTO public.profiles (id, org_id, email, first_name, last_name, role, available_roles, category, onboarding_status)
    VALUES (
      new.id,
      NULL,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'first_name', ''),
      coalesce(new.raw_user_meta_data ->> 'last_name', ''),
      _role,
      _available_roles,
      coalesce(new.raw_user_meta_data ->> 'category', 'debutant'),
      'DONE'
    );
    RETURN new;
  END IF;

  -- Case 1: Joining existing org via invite code
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT id INTO _org_id
    FROM public.organizations
    WHERE invite_code = _invite_code;

    IF _org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invite code: %', _invite_code;
    END IF;

  -- Case 2: Manager creating a new org
  ELSIF _org_name IS NOT NULL AND _org_name != '' AND _role = 'manager' THEN
    _generated_code := upper(replace(left(_org_name, 12), ' ', '-')) || '-' || left(md5(random()::text), 4);

    INSERT INTO public.organizations (name, invite_code)
    VALUES (_org_name, _generated_code)
    RETURNING id INTO _org_id;

  ELSE
    RAISE EXCEPTION 'Either invite_code or org_name is required';
  END IF;

  INSERT INTO public.profiles (id, org_id, email, first_name, last_name, role, available_roles, category)
  VALUES (
    new.id,
    _org_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    _role,
    _available_roles,
    coalesce(new.raw_user_meta_data ->> 'category', 'debutant')
  );

  RETURN new;
END;
$$;
