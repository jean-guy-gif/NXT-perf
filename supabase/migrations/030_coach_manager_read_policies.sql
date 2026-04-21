-- Migration: coach_manager_read_policies
-- But : permettre aux managers et directeurs de lire les sessions, messages
--       et prescriptions coach des membres de leur organisation.
--
-- Contexte : la migration 029 (nxt_coach_foundations) a créé la vue
-- coach_sessions_manager_view mise en SECURITY INVOKER. Mais les policies RLS
-- sur coach_sessions, coach_messages et coach_prescriptions ne couvrent que
-- user_id = auth.uid(). Les managers ne voyaient donc que leurs propres
-- données à travers la vue.
--
-- Pattern : utilise get_my_role() et get_my_org_id() (fonctions SECURITY DEFINER
-- déjà présentes dans le projet) pour éviter la récursion RLS.
--
-- Les policies user existantes restent actives. En PostgreSQL, les policies
-- multiples sur une table sont combinées en OR — un user voit ses données ET
-- les managers voient les données de leur org.

-- 1. coach_sessions : lecture manager/directeur sur leur org
CREATE POLICY coach_sessions_manager_read
  ON coach_sessions
  FOR SELECT
  USING (
    get_my_role() IN ('manager', 'directeur')
    AND org_id = get_my_org_id()
  );

-- 2. coach_messages : lecture manager/directeur via sessions de leur org
CREATE POLICY coach_messages_manager_read
  ON coach_messages
  FOR SELECT
  USING (
    get_my_role() IN ('manager', 'directeur')
    AND session_id IN (
      SELECT id FROM coach_sessions
      WHERE org_id = get_my_org_id()
    )
  );

-- 3. coach_prescriptions : lecture manager/directeur via sessions de leur org
CREATE POLICY coach_prescriptions_manager_read
  ON coach_prescriptions
  FOR SELECT
  USING (
    get_my_role() IN ('manager', 'directeur')
    AND session_id IN (
      SELECT id FROM coach_sessions
      WHERE org_id = get_my_org_id()
    )
  );
