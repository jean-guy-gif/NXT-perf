-- ============================================================================
-- 020 — Profiles: sub-profile + code_equipe
-- ============================================================================

-- Sub-profile: producteur vs non-producteur for manager/directeur
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sub_profile TEXT DEFAULT NULL
    CHECK (sub_profile IS NULL OR sub_profile IN ('producteur', 'non_producteur'));

-- Team code on teams for agent self-join
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS code_equipe TEXT UNIQUE
    DEFAULT ('EQ-' || upper(substr(md5(random()::text), 1, 6)));

CREATE INDEX idx_teams_code_equipe ON teams(code_equipe);

-- Role history for audit trail
CREATE TABLE IF NOT EXISTS role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  old_org_id UUID REFERENCES organizations(id),
  new_org_id UUID REFERENCES organizations(id),
  old_team_id UUID REFERENCES teams(id),
  new_team_id UUID REFERENCES teams(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT DEFAULT NULL
);

CREATE INDEX idx_role_history_user ON role_history(user_id);

ALTER TABLE role_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_history_select_self" ON role_history
  FOR SELECT USING (user_id = auth.uid());
