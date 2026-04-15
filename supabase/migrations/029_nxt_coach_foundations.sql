-- supabase/migrations/029_nxt_coach_foundations.sql

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE coach_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  org_id          UUID NOT NULL,
  persona_used    TEXT NOT NULL CHECK (persona_used IN ('warrior','sport_coach','kind_coach')),
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('ratio_rouge','lundi_sans_debrief','bouton_manuel')),
  trigger_context JSONB,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','confirming','saved','closed','abandoned')),
  current_step    TEXT NOT NULL DEFAULT 'prompted'
                  CHECK (current_step IN (
                    'prompted','collecting','needs_clarification',
                    'ready_to_confirm','confirming','saved',
                    'reading','prescribing','closed'
                  )),
  saved_result_id UUID REFERENCES period_results(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ CHECK (confirmed_at >= started_at),
  ended_at        TIMESTAMPTZ CHECK (ended_at >= started_at),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coach_draft_states (
  session_id        UUID PRIMARY KEY REFERENCES coach_sessions(id) ON DELETE CASCADE,
  extracted_kpis    JSONB NOT NULL DEFAULT '{}',
  unresolved_fields TEXT[] NOT NULL DEFAULT '{}',
  relance_count     INT NOT NULL DEFAULT 0 CHECK (relance_count >= 0),
  last_transcript   TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  client_turn_id  TEXT,
  role            TEXT NOT NULL CHECK (role IN ('user','coach')),
  channel         TEXT NOT NULL CHECK (channel IN ('voice','text')),
  transcript_text TEXT,
  coach_text      TEXT,
  turn_status     TEXT NOT NULL DEFAULT 'ok' CHECK (turn_status IN ('ok','error','ignored')),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_message_check  CHECK (role <> 'user'  OR (transcript_text IS NOT NULL AND coach_text IS NULL)),
  CONSTRAINT coach_message_check CHECK (role <> 'coach' OR (coach_text IS NOT NULL AND transcript_text IS NULL))
);

CREATE TABLE coach_prescriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  session_id        UUID NOT NULL REFERENCES coach_sessions(id),
  brique            TEXT NOT NULL CHECK (brique IN ('nxt_training','nxt_profiling')),
  module            TEXT CHECK (module IS NULL OR module IN ('prospection','mandats','acheteurs')),
  ratio_id          TEXT CHECK (ratio_id IS NULL OR ratio_id IN (
                      'contacts_estimations','estimations_mandats','taux_exclusivite',
                      'acheteurs_sorties','visites_par_acheteur','visites_offres',
                      'offres_compromis','compromis_actes'
                    )),
  trigger_axis      TEXT,
  current_value     NUMERIC,
  target_value      NUMERIC,
  projected_ca_gain NUMERIC,
  user_response     TEXT CHECK (user_response IN ('accepted','refused')),
  prescribed_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_coach_sessions_user       ON coach_sessions(user_id, status, started_at DESC);
CREATE INDEX idx_coach_messages_session    ON coach_messages(session_id, created_at);
CREATE INDEX idx_coach_prescriptions_user  ON coach_prescriptions(user_id, prescribed_at DESC);
CREATE INDEX idx_coach_prescriptions_sess  ON coach_prescriptions(session_id);

-- Idempotence /turn : un client_turn_id ne peut être traité qu'une fois par session
CREATE UNIQUE INDEX idx_coach_messages_turn_idempotence
  ON coach_messages(session_id, client_turn_id)
  WHERE client_turn_id IS NOT NULL AND role = 'user';

-- ── Profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_persona TEXT DEFAULT 'kind_coach'
    CHECK (coach_persona IN ('warrior','sport_coach','kind_coach')),
  ADD COLUMN IF NOT EXISTS coach_onboarded     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_persona_set_at TIMESTAMPTZ;

-- ── Vue manager ───────────────────────────────────────────────────────────────

CREATE VIEW coach_sessions_manager_view AS
SELECT
  id,
  user_id,
  org_id,
  trigger_type,
  status,
  persona_used,
  started_at,
  confirmed_at,
  ended_at,
  EXISTS (
    SELECT 1 FROM coach_prescriptions p WHERE p.session_id = coach_sessions.id
  ) AS has_prescription
FROM coach_sessions;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE coach_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_draft_states   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_prescriptions  ENABLE ROW LEVEL SECURITY;

-- Utilisateur : ses propres données
CREATE POLICY coach_sessions_user_policy ON coach_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY coach_draft_user_policy ON coach_draft_states
  FOR ALL USING (
    session_id IN (SELECT id FROM coach_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY coach_messages_user_policy ON coach_messages
  FOR SELECT USING (
    session_id IN (SELECT id FROM coach_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY coach_prescriptions_user_policy ON coach_prescriptions
  FOR ALL USING (auth.uid() = user_id);

-- Sécurité vue manager : accès direct interdit, vue uniquement
REVOKE SELECT ON coach_messages     FROM authenticated;
REVOKE SELECT ON coach_draft_states FROM authenticated;
GRANT  SELECT ON coach_sessions_manager_view TO authenticated;
