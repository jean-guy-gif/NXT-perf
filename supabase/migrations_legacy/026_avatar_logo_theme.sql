-- ================================================-- 026 — Photo de profil, logo agence & thème dynamique
============================
-- ============================================================================

-- avatar_url already exists on profiles (added in earlier migration)
-- Add onboarding_completed if not exists
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add logo + theme colors to organizations (= agences)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6C5CE7',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#4A3FB5';

-- Storage buckets are created via Supabase dashboard or CLI:
-- Bucket "avatars": public=true
-- Bucket "logos": public=true
--
-- Storage policies (to be created in dashboard):
--
-- avatars:
--   INSERT: auth.uid()::text = (storage.foldername(name))[1]
--   UPDATE: auth.uid()::text = (storage.foldername(name))[1]
--   SELECT: true (public)
--
-- logos:
--   INSERT: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id::text = (storage.foldername(name))[1])
--   UPDATE: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id::text = (storage.foldername(name))[1])
--   SELECT: true (public)
