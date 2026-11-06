-- ============================================================================
-- 022 — RLS v2: directeur multi-agences, coach via coaching_links, réseau
-- ============================================================================

-- ── Helper: get director's agency IDs ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_director_agency_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(agency_id), ARRAY[]::UUID[])
  FROM agency_directors
  WHERE director_user_id = auth.uid();
$$;

-- ── Helper: get coach's active coachee IDs ───────────────────────────────────

CREATE OR REPLACE FUNCTION get_coach_coachee_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(coachee_user_id), ARRAY[]::UUID[])
  FROM coaching_links
  WHERE coach_user_id = auth.uid() AND revoked_at IS NULL;
$$;

-- ── Helper: get network agency IDs ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_network_agency_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(o.id), ARRAY[]::UUID[])
  FROM organizations o
  JOIN networks n ON n.id = o.network_id
  WHERE n.admin_user_id = auth.uid();
$$;

-- ── Profiles: enhanced select ────────────────────────────────────────────────

-- Drop old generic select if it blocks
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "profiles_select_v2" ON profiles
  FOR SELECT USING (
    -- Self
    id = auth.uid()
    -- Same org
    OR org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    -- Director: sees profiles in their managed agencies
    OR org_id = ANY(get_director_agency_ids())
    -- Coach: sees active coachees
    OR id = ANY(get_coach_coachee_ids())
    -- Réseau: sees profiles in network agencies
    OR org_id = ANY(get_network_agency_ids())
  );

-- ── Period Results: enhanced select ──────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "period_results_select" ON period_results;
  DROP POLICY IF EXISTS "period_results_select_v2" ON period_results;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "period_results_select_v2" ON period_results
  FOR SELECT USING (
    -- Own results
    user_id = auth.uid()
    -- Manager: team members
    OR user_id IN (
      SELECT p.id FROM profiles p
      JOIN teams t ON t.id = p.team_id
      WHERE t.manager_id = auth.uid()
    )
    -- Director: profiles in managed agencies
    OR user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.org_id = ANY(get_director_agency_ids())
    )
    -- Coach: active coachees
    OR user_id = ANY(get_coach_coachee_ids())
    -- Réseau: profiles in network agencies
    OR user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.org_id = ANY(get_network_agency_ids())
    )
  );

-- ── Objectives: enhanced select ──────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "objectives_select" ON objectives;
  DROP POLICY IF EXISTS "objectives_select_v2" ON objectives;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "objectives_select_v2" ON objectives
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT p.id FROM profiles p
      JOIN teams t ON t.id = p.team_id
      WHERE t.manager_id = auth.uid()
    )
    OR user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.org_id = ANY(get_director_agency_ids())
    )
    OR user_id = ANY(get_coach_coachee_ids())
  );
