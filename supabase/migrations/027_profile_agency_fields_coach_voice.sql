-- 027: Add per-profile agency branding fields + coach voice preference
-- Allows users without org_id to still upload a logo and set theme colors.
-- coach_voice stores the AI coaching tone preference.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS agency_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS agency_primary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS agency_secondary_color VARCHAR(7),
  ADD COLUMN IF NOT EXISTS coach_voice VARCHAR(20) DEFAULT 'bienveillant';
