-- Migration 031 : collecte des intitulés non reconnus par le parseur d'import
-- onboarding, + colonne de synthèse extraction_summary sur performance_imports.
--
-- Permet d'enrichir le dictionnaire de synonymes au fil de l'eau sans
-- redéploiement, et de requery des stats d'extraction sans rappeler Gemini.

-- ── Table: extraction_unknowns ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.extraction_unknowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text,
  file_type text CHECK (file_type IN ('excel', 'pdf', 'image', 'other')),
  raw_label text NOT NULL,
  context text,
  sheet_name text,
  row_number integer,
  column_letter text,
  suggested_field text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_unknowns_label
  ON public.extraction_unknowns(raw_label);
CREATE INDEX IF NOT EXISTS idx_extraction_unknowns_created
  ON public.extraction_unknowns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_unknowns_user
  ON public.extraction_unknowns(user_id);

ALTER TABLE public.extraction_unknowns ENABLE ROW LEVEL SECURITY;

-- Insert libre côté client (tous les users peuvent loguer leurs unknowns)
DROP POLICY IF EXISTS "extraction_unknowns_insert_own" ON public.extraction_unknowns;
CREATE POLICY "extraction_unknowns_insert_own" ON public.extraction_unknowns
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Lecture admin uniquement (role directeur de l'org Start Academy)
DROP POLICY IF EXISTS "extraction_unknowns_select_admin" ON public.extraction_unknowns;
CREATE POLICY "extraction_unknowns_select_admin" ON public.extraction_unknowns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'directeur'
        AND org_id = 'a0000000-0000-0000-0000-000000000001'
    )
  );

COMMENT ON TABLE public.extraction_unknowns IS
  'Intitulés vus par le parseur d''import performance mais non mappés à un champ connu. Source pour enrichir le dictionnaire de synonymes.';

-- ── performance_imports: colonne extraction_summary ────────────────────────

ALTER TABLE public.performance_imports
  ADD COLUMN IF NOT EXISTS extraction_summary jsonb;

COMMENT ON COLUMN public.performance_imports.extraction_summary IS
  'Synthèse par upload: { sheetsRead, sheetsSkipped, fieldsExtracted, fieldsTotal, avgConfidence, unknownCount }. Évite de reparser extracted_data pour des stats.';

-- ── Documentation du piège legacy contacts_entrants ───────────────────────
--
-- Note : il n'existe PAS de colonne `contacts_entrants` sur `period_results`.
-- La table ne contient qu'une colonne JSONB `data` avec la structure :
-- { prospection: { contactsTotaux, rdvEstimation }, vendeurs: {...}, ... }.
-- Le "piège" legacy vivait uniquement dans l'API d'import où le JSON de
-- réponse utilisait la clé snake_case `contacts_entrants` (mappée côté
-- client vers `contactsTotaux`). Depuis ce refactor, l'API retourne
-- directement `contactsTotaux` — la divergence de nommage est éliminée.

COMMENT ON COLUMN public.period_results.data IS
  'Résultats d''une période (JSONB). Structure : { prospection, vendeurs, acheteurs, ventes }. Le champ contactsTotaux (dans data.prospection) agrège tous les contacts : entrants, sortants, mails, messages, conversations, discussions, leads.';
