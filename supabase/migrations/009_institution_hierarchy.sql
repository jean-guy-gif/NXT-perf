-- Migration 009: Institution hierarchy
-- Adds manager_id to teams, helper functions, and team-scoped RLS policies

-- 1. Add manager_id to teams
ALTER TABLE public.teams ADD COLUMN manager_id UUID REFERENCES public.profiles(id);
CREATE UNIQUE INDEX teams_manager_id_unique ON public.teams(manager_id);
CREATE INDEX idx_teams_manager_id ON public.teams(manager_id);

-- 2. Helper function: get_my_team_id()
-- Returns the team ID where the current user is the manager
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.teams WHERE manager_id = auth.uid()
$$;

-- 3. Helper function: is_in_my_team(target_user_id)
-- Returns true if the target user belongs to the current manager's team
CREATE OR REPLACE FUNCTION public.is_in_my_team(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = target_user_id
      AND t.manager_id = auth.uid()
  )
$$;

-- 4. New RLS policy: managers can update team_id on profiles in their org
CREATE POLICY "profiles_update_team_manager"
  ON public.profiles FOR UPDATE
  USING (
    org_id = public.get_my_org_id()
    AND public.is_manager()
  )
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.is_manager()
  );

-- 5. Update results_select policy to filter by team for managers
DROP POLICY IF EXISTS "results_select" ON public.period_results;
CREATE POLICY "results_select"
  ON public.period_results FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      public.is_manager()
      AND user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p.team_id = public.get_my_team_id()
      )
    )
  );

-- 6. Update objectives_select similarly
DROP POLICY IF EXISTS "objectives_select" ON public.objectives;
CREATE POLICY "objectives_select"
  ON public.objectives FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      public.is_manager()
      AND user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p.team_id = public.get_my_team_id()
      )
    )
  );
