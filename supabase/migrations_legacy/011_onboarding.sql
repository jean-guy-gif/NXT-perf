-- 011: Onboarding fields
-- Add onboarding tracking to profiles + invite_code to teams

-- Add onboarding fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'NOT_STARTED';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type text;

-- Add invite_code to teams (for MG-XXXX codes)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Set existing users as DONE (they already completed old flow)
UPDATE profiles SET onboarding_status = 'DONE' WHERE role IS NOT NULL;
