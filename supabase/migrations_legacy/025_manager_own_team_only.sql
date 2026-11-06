-- ============================================================================
-- 025 — Manager sees own team only (not all org teams)
-- ============================================================================

DROP POLICY IF EXISTS "teams_select_strict" ON teams;

CREATE POLICY "teams_select_strict" ON teams
  FOR SELECT USING (
    -- Conseiller: own team only
    id = (SELECT team_id FROM profiles WHERE id = auth.uid())

    -- Manager: own team only (the one they manage)
    OR (
      get_my_role() = 'manager'
      AND manager_id = auth.uid()
    )

    -- Directeur: teams in own org + managed agencies
    OR (
      get_my_role() = 'directeur'
      AND (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR org_id = ANY(get_director_agency_ids())
      )
    )

    -- Réseau: teams in network agencies
    OR (
      get_my_role() = 'reseau'
      AND org_id = ANY(get_network_agency_ids())
    )
  );
