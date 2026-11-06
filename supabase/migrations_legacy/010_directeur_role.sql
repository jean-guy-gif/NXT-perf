-- Migration 010: Add directeur role
-- Extends the role check constraint on profiles to include 'directeur'

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('conseiller', 'manager', 'directeur'));

CREATE OR REPLACE FUNCTION public.is_directeur()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'directeur'
  )
$$;

-- Extend results policy for directeur org-wide access
DROP POLICY IF EXISTS "results_select" ON public.period_results;
CREATE POLICY "results_select" ON public.period_results
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_in_my_team(user_id)
    OR (public.is_directeur() AND user_id IN (
      SELECT id FROM public.profiles WHERE org_id = public.get_my_org_id()
    ))
  );

-- Extend objectives policy for directeur
DROP POLICY IF EXISTS "objectives_select" ON public.objectives;
CREATE POLICY "objectives_select" ON public.objectives
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_in_my_team(user_id)
    OR (public.is_directeur() AND user_id IN (
      SELECT id FROM public.profiles WHERE org_id = public.get_my_org_id()
    ))
  );
