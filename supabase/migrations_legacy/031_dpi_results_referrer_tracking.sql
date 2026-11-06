-- ════════════════════════════════════════════════════════════════════════════
-- PR2k — Application de la migration après validation produit PR2j.
-- NE PAS APPLIQUER avec `supabase db push` tant que PR2k n'a pas été GO
-- par l'utilisateur.
--
-- Périmètre : étend la table public.dpi_results pour supporter le tracking
-- des leads par Directeur (PR2j a livré la page Directeur en mode mocks ;
-- PR2k branchera la lecture/écriture sur cette table).
--
-- Colonnes ajoutées (toutes nullable, non-invasif) :
--   - referrer_id     : Directeur référent (FK profiles.id)
--   - first_name      : prénom du candidat (capturé via questionnaire)
--   - last_name       : nom du candidat
--   - phone           : téléphone optionnel
--   - progress_pct    : progression 0-100 (in_progress)
--   - restarted_at    : timestamp si recommencé après completion
--   - last_opened_at  : dernière ouverture du lien (status "opened")
--
-- Index : referrer_id pour les lookups des leads d'un Directeur.
-- RLS  : un Directeur peut lire ses propres leads (referrer_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.dpi_results
  ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS progress_pct integer
    CHECK (progress_pct IS NULL OR (progress_pct >= 0 AND progress_pct <= 100)),
  ADD COLUMN IF NOT EXISTS restarted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

CREATE INDEX IF NOT EXISTS dpi_results_referrer_id_idx
  ON public.dpi_results(referrer_id);

-- RLS — un Directeur (authentifié) lit ses propres leads.
-- Note : la table dpi_results doit déjà avoir RLS activée. Si non, exécuter :
--   ALTER TABLE public.dpi_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Directors can read their own DPI leads" ON public.dpi_results;
CREATE POLICY "Directors can read their own DPI leads"
  ON public.dpi_results
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());
