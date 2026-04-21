-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 030 — user_improvement_resources + traçabilité coach_plans
-- Already executed in production Supabase on 2026-04-19
-- This file is the versioned source of truth for Git / CI / new environments
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Table des ressources d'amélioration du conseiller ───────────────────
CREATE TABLE IF NOT EXISTS public.user_improvement_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  resource_type text NOT NULL CHECK (resource_type IN (
    'plan_30j',
    'nxt_coaching',
    'nxt_training',
    'agefice'
  )),

  status text NOT NULL CHECK (status IN (
    'active', 'completed', 'expired',
    'debrief_offered', 'debrief_used',
    'pending_human_coach', 'human_coached',
    'subscribed', 'cancelled',
    'trial_1_used', 'trial_2_used',
    'draft', 'submitted', 'accepted', 'refused',
    'none'
  )),

  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  archived_at timestamptz,

  pain_ratio_id text,
  pain_score numeric,
  debrief_offered_count int DEFAULT 0
);

-- ─── 2. Index et contrainte d'unicité partielle ────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_resource_per_user
  ON public.user_improvement_resources (user_id, resource_type)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_user_type
  ON public.user_improvement_resources (user_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_status
  ON public.user_improvement_resources (status);
CREATE INDEX IF NOT EXISTS idx_resources_expires
  ON public.user_improvement_resources (expires_at)
  WHERE expires_at IS NOT NULL AND archived_at IS NULL;

-- ─── 3. Trigger updated_at ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_updated_at_user_improvement_resources
  ON public.user_improvement_resources;

CREATE TRIGGER set_updated_at_user_improvement_resources
  BEFORE UPDATE ON public.user_improvement_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── 4. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.user_improvement_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_own_all" ON public.user_improvement_resources;
CREATE POLICY "resources_own_all"
  ON public.user_improvement_resources
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "resources_coach_read" ON public.user_improvement_resources;
CREATE POLICY "resources_coach_read"
  ON public.user_improvement_resources
  FOR SELECT
  USING (
    user_id IN (
      SELECT target_id FROM public.coach_assignments
      WHERE coach_id = auth.uid()
        AND target_type = 'AGENT'
        AND status = 'ACTIVE'
    )
  );

-- ─── 5. FK de traçabilité sur coach_plans ──────────────────────────────────
ALTER TABLE public.coach_plans
  ADD COLUMN IF NOT EXISTS source_improvement_resource_id uuid
    REFERENCES public.user_improvement_resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_plans_source
  ON public.coach_plans (source_improvement_resource_id);
