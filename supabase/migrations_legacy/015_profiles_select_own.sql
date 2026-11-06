-- 015: Allow users to read their own profile
-- Fixes: new signups redirected to /welcome because RLS blocked self-read
-- The existing profiles_select_org policy requires org_id = get_my_org_id()
-- which is circular for new users and always fails for coach standalone (org_id NULL)

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());
