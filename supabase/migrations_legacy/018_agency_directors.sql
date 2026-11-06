-- ============================================================================
-- 018 — Agency Directors (directeur → agences, many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agency_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (director_user_id, agency_id)
);

CREATE INDEX idx_agency_directors_director ON agency_directors(director_user_id);
CREATE INDEX idx_agency_directors_agency ON agency_directors(agency_id);

-- Add code_agence to organizations (distinct from invite_code for agents)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS code_agence TEXT UNIQUE
    DEFAULT ('AG-' || upper(substr(md5(random()::text), 1, 6)));

CREATE INDEX idx_organizations_code_agence ON organizations(code_agence);

-- RLS
ALTER TABLE agency_directors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_directors_select_self" ON agency_directors
  FOR SELECT USING (director_user_id = auth.uid());

CREATE POLICY "agency_directors_select_member" ON agency_directors
  FOR SELECT USING (
    agency_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "agency_directors_insert_self" ON agency_directors
  FOR INSERT WITH CHECK (director_user_id = auth.uid());

CREATE POLICY "agency_directors_delete_self" ON agency_directors
  FOR DELETE USING (director_user_id = auth.uid());
