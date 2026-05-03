-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 032 — coach_brain_patterns
-- Source de vérité pour les patterns coaching (PR-A — PR3.8 follow-up).
-- Cette PR crée uniquement la structure ; aucune donnée n'est ingérée.
-- L'application continue de fonctionner via le fallback hardcoded
-- `src/lib/coaching/coaching-patterns.ts` tant que la table est vide.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_brain_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ExpertiseRatioId (cf. src/data/ratio-expertise.ts) — texte libre côté
  -- BDD, validation au niveau application (route + load-patterns).
  expertise_id text NOT NULL,

  -- Quel axe de pattern :
  --   'behavior' → CoachingPattern.observedBehaviors
  --   'mistake'  → CoachingPattern.recurringMistakes
  --   'question' → CoachingPattern.signalQuestions
  --   'angle'    → CoachingPattern.coachingAngles
  axis text NOT NULL CHECK (axis IN (
    'behavior',
    'mistake',
    'question',
    'angle'
  )),

  -- Texte du pattern (déjà anonymisé à l'ingestion). NEVER raw transcript.
  text text NOT NULL,

  -- Compteur d'apparitions agrégé sur le corpus (sert au tri).
  frequency_score int NOT NULL DEFAULT 1,

  -- Dernière fois où ce pattern a été observé / re-confirmé par l'ingestion.
  last_seen timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Index pour le top-N par axis ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coach_brain_patterns_lookup
  ON public.coach_brain_patterns (expertise_id, axis, frequency_score DESC);

-- ─── 3. Trigger updated_at ─────────────────────────────────────────────────
-- Réutilise la fonction `public.update_updated_at()` créée dans une migration
-- précédente (cf. 030). On suppose qu'elle existe ; sinon on la (re)crée.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_coach_brain_patterns
  ON public.coach_brain_patterns;

CREATE TRIGGER set_updated_at_coach_brain_patterns
  BEFORE UPDATE ON public.coach_brain_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── 4. RLS — service_role uniquement ─────────────────────────────────────
-- Aucun accès anon ni authenticated : le contenu est lu côté serveur via
-- SUPABASE_SERVICE_ROLE_KEY, jamais directement par le navigateur. RLS
-- activé sans policy permissive ⇒ tout accès non service_role est bloqué
-- par défaut.
ALTER TABLE public.coach_brain_patterns ENABLE ROW LEVEL SECURITY;

-- Pas de policy `FOR SELECT` / `FOR INSERT` / etc. côté anon/authenticated :
-- service_role bypass RLS de manière implicite, donc l'API serveur peut
-- lire/écrire sans policy explicite. Toute autre identité voit la table
-- vide.

COMMENT ON TABLE public.coach_brain_patterns IS
  'Patterns coaching anonymisés extraits du cerveau du coach (Drive). '
  'Lecture/écriture exclusive via service_role côté serveur (cf. '
  'src/lib/server/coach-brain/load-patterns.ts).';
