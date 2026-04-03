-- ============================================================================
-- 017 — Networks (réseaux multi-agences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code_reseau TEXT NOT NULL UNIQUE DEFAULT ('NR-' || upper(substr(md5(random()::text), 1, 6))),
  admin_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_networks_code ON networks(code_reseau);
CREATE INDEX idx_networks_admin ON networks(admin_user_id);

-- Add network_id to organizations (agences appartiennent à un réseau)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES networks(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_network ON organizations(network_id);

-- RLS
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "networks_select_member" ON networks
  FOR SELECT USING (
    id IN (
      SELECT o.network_id FROM organizations o
      JOIN profiles p ON p.org_id = o.id
      WHERE p.id = auth.uid()
    )
    OR admin_user_id = auth.uid()
  );

CREATE POLICY "networks_update_admin" ON networks
  FOR UPDATE USING (admin_user_id = auth.uid());
