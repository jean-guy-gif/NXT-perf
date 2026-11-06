-- ============================================================================
-- 019 — Coaching Links (coach → coachés, soft revoke)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coaching_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coachee_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  coachee_role TEXT NOT NULL CHECK (coachee_role IN ('conseiller', 'manager', 'directeur')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (coach_user_id, coachee_user_id)
);

CREATE INDEX idx_coaching_links_coach ON coaching_links(coach_user_id);
CREATE INDEX idx_coaching_links_coachee ON coaching_links(coachee_user_id);
CREATE INDEX idx_coaching_links_active ON coaching_links(coach_user_id) WHERE revoked_at IS NULL;

-- Add coach_code to profiles for self-service coach attachment
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_code TEXT UNIQUE
    DEFAULT NULL;

-- Generate coach codes only for coach profiles (handled by RPC)

-- RLS
ALTER TABLE coaching_links ENABLE ROW LEVEL SECURITY;

-- Coach sees their active links
CREATE POLICY "coaching_links_select_coach" ON coaching_links
  FOR SELECT USING (coach_user_id = auth.uid());

-- Coachee sees their own links
CREATE POLICY "coaching_links_select_coachee" ON coaching_links
  FOR SELECT USING (coachee_user_id = auth.uid());

-- Only coaches can insert
CREATE POLICY "coaching_links_insert_coach" ON coaching_links
  FOR INSERT WITH CHECK (coach_user_id = auth.uid());

-- Only coaches can update (revoke)
CREATE POLICY "coaching_links_update_coach" ON coaching_links
  FOR UPDATE USING (coach_user_id = auth.uid());
