-- Coach assignments
CREATE TABLE IF NOT EXISTS coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES profiles(id),
  target_type text NOT NULL CHECK (target_type IN ('AGENT', 'MANAGER', 'INSTITUTION')),
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  excluded_manager_ids jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Coach actions
CREATE TABLE IF NOT EXISTS coach_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_assignment_id uuid NOT NULL REFERENCES coach_assignments(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'DONE')),
  due_date date DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Coach plans
CREATE TABLE IF NOT EXISTS coach_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_assignment_id uuid NOT NULL REFERENCES coach_assignments(id),
  start_date date NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  weeks jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_plans ENABLE ROW LEVEL SECURITY;

-- Coach can see their own assignments
CREATE POLICY "coach_own_assignments" ON coach_assignments
  FOR ALL USING (coach_id = auth.uid());

-- Coachés can see assignments targeting them
CREATE POLICY "target_view_assignments" ON coach_assignments
  FOR SELECT USING (
    target_type = 'AGENT' AND target_id = auth.uid()
    OR target_type = 'MANAGER' AND target_id = auth.uid()
    OR target_type = 'INSTITUTION' AND target_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Coachés can revoke their own assignment
CREATE POLICY "target_revoke_assignment" ON coach_assignments
  FOR UPDATE USING (
    target_type = 'AGENT' AND target_id = auth.uid()
    OR target_type = 'MANAGER' AND target_id = auth.uid()
  ) WITH CHECK (status = 'REVOKED');

-- Coach can manage actions on their assignments
CREATE POLICY "coach_own_actions" ON coach_actions
  FOR ALL USING (
    coach_assignment_id IN (SELECT id FROM coach_assignments WHERE coach_id = auth.uid())
  );

-- Coach can manage plans on their assignments
CREATE POLICY "coach_own_plans" ON coach_plans
  FOR ALL USING (
    coach_assignment_id IN (SELECT id FROM coach_assignments WHERE coach_id = auth.uid())
  );
