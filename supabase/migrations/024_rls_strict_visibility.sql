-- ============================================================================
-- 024 — Strict visibility: conseiller sees SELF ONLY on profiles and teams
-- ============================================================================
-- Closes M4: removes all generic "same org" SELECT policies.
-- Each role now has explicit, minimal visibility.

-- ── Helper: get caller's role ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ── Helper: get caller's team members (for managers) ─────────────────────────

CREATE OR REPLACE FUNCTION get_my_team_member_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[])
  FROM profiles p
  JOIN teams t ON t.id = p.team_id
  WHERE t.manager_id = auth.uid();
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PROFILES — strict role-based visibility
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop ALL previous select policies on profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_v2" ON profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Single strict policy: matrix by role
CREATE POLICY "profiles_select_strict" ON profiles
  FOR SELECT USING (
    -- SELF: everyone sees their own profile
    id = auth.uid()

    -- MANAGER: sees team members
    OR (
      get_my_role() IN ('manager', 'directeur')
      AND id = ANY(get_my_team_member_ids())
    )

    -- DIRECTEUR: sees profiles in managed agencies
    OR (
      get_my_role() = 'directeur'
      AND org_id = ANY(get_director_agency_ids())
    )

    -- COACH: sees active coachees only
    OR (
      get_my_role() = 'coach'
      AND id = ANY(get_coach_coachee_ids())
    )

    -- RÉSEAU: sees profiles in network agencies
    OR (
      get_my_role() = 'reseau'
      AND org_id = ANY(get_network_agency_ids())
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TEAMS — strict role-based visibility
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop old org-wide select
DO $$ BEGIN
  DROP POLICY IF EXISTS "teams_select_org" ON teams;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Strict: conseiller sees only their own team; manager sees org teams;
-- directeur sees managed agency teams
CREATE POLICY "teams_select_strict" ON teams
  FOR SELECT USING (
    -- Conseiller: own team only
    id = (SELECT team_id FROM profiles WHERE id = auth.uid())

    -- Manager: teams in own org (need to see sibling teams for context)
    OR (
      get_my_role() IN ('manager', 'directeur')
      AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    )

    -- Directeur: teams in managed agencies
    OR (
      get_my_role() = 'directeur'
      AND org_id = ANY(get_director_agency_ids())
    )

    -- Réseau: teams in network agencies
    OR (
      get_my_role() = 'reseau'
      AND org_id = ANY(get_network_agency_ids())
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- PERIOD_RESULTS — verify no "same org" leak (already OK in 022+023)
-- No change needed — policy period_results_select_v2 is already role-based.
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- RATIO_CONFIGS — keep org-wide (acceptable: shared config, no personal data)
-- No change.
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- OBJECTIVES — verify no "same org" leak (already OK in 022+023)
-- No change needed.
-- ══════════════════════════════════════════════════════════════════════════════
