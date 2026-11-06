-- ============================================================================
-- 023 — Security patches for migrations 017–022
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- C1 FIX: Add SET search_path to ALL SECURITY DEFINER functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper functions
CREATE OR REPLACE FUNCTION get_director_agency_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(array_agg(agency_id), ARRAY[]::UUID[])
  FROM agency_directors
  WHERE director_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_coach_coachee_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(array_agg(coachee_user_id), ARRAY[]::UUID[])
  FROM coaching_links
  WHERE coach_user_id = auth.uid() AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION get_network_agency_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(array_agg(o.id), ARRAY[]::UUID[])
  FROM organizations o
  JOIN networks n ON n.id = o.network_id
  WHERE n.admin_user_id = auth.uid();
$$;

-- RPC functions with search_path
CREATE OR REPLACE FUNCTION redeem_network_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _network_id UUID;
  _user_org_id UUID;
  _user_role TEXT;
BEGIN
  -- Only directeur/reseau can redeem network codes
  SELECT role, org_id INTO _user_role, _user_org_id FROM profiles WHERE id = auth.uid();
  IF _user_role NOT IN ('directeur', 'reseau') THEN
    RETURN jsonb_build_object('error', 'Non autorisé');
  END IF;

  SELECT id INTO _network_id FROM networks WHERE code_reseau = p_code;
  IF _network_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code réseau invalide');
  END IF;
  IF _user_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Profil non trouvé');
  END IF;

  UPDATE organizations SET network_id = _network_id WHERE id = _user_org_id;
  RETURN jsonb_build_object('success', true, 'network_id', _network_id);
END;
$$;

-- C2 FIX: redeem_agency_code clears team_id if changing org
CREATE OR REPLACE FUNCTION redeem_agency_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _org_id UUID;
  _current_org_id UUID;
BEGIN
  SELECT id INTO _org_id FROM organizations WHERE code_agence = p_code;
  IF _org_id IS NULL THEN
    SELECT id INTO _org_id FROM organizations WHERE invite_code = p_code;
  END IF;
  IF _org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code agence invalide');
  END IF;

  SELECT org_id INTO _current_org_id FROM profiles WHERE id = auth.uid();

  -- If changing org, clear team_id to prevent cross-org team reference
  IF _current_org_id IS DISTINCT FROM _org_id THEN
    UPDATE profiles SET org_id = _org_id, team_id = NULL WHERE id = auth.uid();
  ELSE
    UPDATE profiles SET org_id = _org_id WHERE id = auth.uid();
  END IF;

  RETURN jsonb_build_object('success', true, 'org_id', _org_id);
END;
$$;

CREATE OR REPLACE FUNCTION redeem_team_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _team RECORD;
BEGIN
  SELECT id, org_id INTO _team FROM teams WHERE code_equipe = p_code;
  IF _team.id IS NULL THEN
    SELECT id, org_id INTO _team FROM teams WHERE invite_code = p_code;
  END IF;
  IF _team.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code équipe invalide');
  END IF;

  UPDATE profiles
    SET team_id = _team.id, org_id = _team.org_id
    WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true, 'team_id', _team.id, 'org_id', _team.org_id);
END;
$$;

CREATE OR REPLACE FUNCTION redeem_coach_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _coach_id UUID;
  _my_role TEXT;
BEGIN
  SELECT id INTO _coach_id FROM profiles WHERE coach_code = p_code AND role = 'coach';
  IF _coach_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Code coach invalide');
  END IF;

  SELECT role INTO _my_role FROM profiles WHERE id = auth.uid();
  IF _my_role NOT IN ('conseiller', 'manager', 'directeur') THEN
    RETURN jsonb_build_object('error', 'Seuls les conseillers, managers et directeurs peuvent être coachés');
  END IF;

  INSERT INTO coaching_links (coach_user_id, coachee_user_id, coachee_role)
    VALUES (_coach_id, auth.uid(), _my_role)
    ON CONFLICT (coach_user_id, coachee_user_id)
    DO UPDATE SET revoked_at = NULL, coachee_role = _my_role;

  RETURN jsonb_build_object('success', true, 'coach_id', _coach_id);
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_agency_code(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _new_code TEXT;
  _is_director BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM agency_directors
    WHERE director_user_id = auth.uid() AND agency_id = p_org_id
  ) INTO _is_director;

  IF NOT _is_director THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND org_id = p_org_id AND role = 'directeur'
    ) INTO _is_director;
  END IF;

  IF NOT _is_director THEN
    RETURN jsonb_build_object('error', 'Non autorisé');
  END IF;

  _new_code := 'AG-' || upper(substr(md5(random()::text), 1, 6));
  UPDATE organizations SET code_agence = _new_code WHERE id = p_org_id;
  RETURN jsonb_build_object('success', true, 'new_code', _new_code);
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_team_code(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _new_code TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND manager_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Non autorisé');
  END IF;

  _new_code := 'EQ-' || upper(substr(md5(random()::text), 1, 6));
  UPDATE teams SET code_equipe = _new_code WHERE id = p_team_id;
  RETURN jsonb_build_object('success', true, 'new_code', _new_code);
END;
$$;

CREATE OR REPLACE FUNCTION revoke_coaching_link(p_link_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE coaching_links
    SET revoked_at = now()
    WHERE id = p_link_id
      AND (coach_user_id = auth.uid() OR coachee_user_id = auth.uid())
      AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lien non trouvé ou déjà révoqué');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- C3 FIX: upgrade_role restricted to valid transitions only
CREATE OR REPLACE FUNCTION upgrade_role(
  p_new_role TEXT,
  p_new_org_id UUID DEFAULT NULL,
  p_new_team_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  _old RECORD;
  _valid_roles TEXT[] := ARRAY['conseiller', 'manager', 'directeur', 'coach', 'reseau'];
  _allowed BOOLEAN := false;
BEGIN
  IF NOT (p_new_role = ANY(_valid_roles)) THEN
    RETURN jsonb_build_object('error', 'Rôle invalide');
  END IF;

  SELECT role, org_id, team_id INTO _old FROM profiles WHERE id = auth.uid();

  -- Allowed transitions:
  -- conseiller → manager (promotion)
  -- manager → directeur (promotion)
  -- any → coach (career change, keeps data)
  -- Same role (no-op but allowed for org/team change)
  IF _old.role = p_new_role THEN _allowed := true;
  ELSIF _old.role = 'conseiller' AND p_new_role = 'manager' THEN _allowed := true;
  ELSIF _old.role = 'manager' AND p_new_role = 'directeur' THEN _allowed := true;
  ELSIF p_new_role = 'coach' THEN _allowed := true;
  END IF;

  IF NOT _allowed THEN
    RETURN jsonb_build_object('error', 'Transition de rôle non autorisée');
  END IF;

  INSERT INTO role_history (user_id, old_role, new_role, old_org_id, new_org_id, old_team_id, new_team_id, reason)
    VALUES (auth.uid(), _old.role, p_new_role, _old.org_id, COALESCE(p_new_org_id, _old.org_id),
            _old.team_id, p_new_team_id, p_reason);

  UPDATE profiles SET
    role = p_new_role,
    org_id = COALESCE(p_new_org_id, org_id),
    team_id = p_new_team_id,
    available_roles = CASE
      WHEN p_new_role = 'directeur' THEN ARRAY['directeur', 'manager', 'conseiller']
      WHEN p_new_role = 'manager' THEN ARRAY['manager', 'conseiller']
      WHEN p_new_role = 'reseau' THEN ARRAY['reseau']
      WHEN p_new_role = 'coach' THEN ARRAY['coach']
      ELSE ARRAY['conseiller']
    END
  WHERE id = auth.uid();

  RETURN jsonb_build_object('success', true, 'new_role', p_new_role);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- M1 FIX: agency_directors INSERT restricted to directeurs only
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "agency_directors_insert_self" ON agency_directors;
CREATE POLICY "agency_directors_insert_directeur" ON agency_directors
  FOR INSERT WITH CHECK (
    director_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'directeur')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- M2 FIX: GRANT EXECUTE only to authenticated
-- ══════════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION redeem_network_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_network_code(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION redeem_agency_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_agency_code(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION redeem_team_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_team_code(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION redeem_coach_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_coach_code(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION regenerate_agency_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION regenerate_agency_code(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION regenerate_team_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION regenerate_team_code(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION revoke_coaching_link(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_coaching_link(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION upgrade_role(TEXT, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upgrade_role(TEXT, UUID, UUID, TEXT) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- M3 FIX: coaching_links INSERT restricted to coaches only
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "coaching_links_insert_coach" ON coaching_links;
CREATE POLICY "coaching_links_insert_coach_v2" ON coaching_links
  FOR INSERT WITH CHECK (
    coach_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
  );
