# NXT Coach — Design Spec V1

**Date** : 2026-04-15  
**Statut** : Gelé — prêt pour implémentation  
**Produit** : NXT Performance  
**Feature** : NXT Coach — Copilote vocal conversationnel  
**Stack** : Next.js · TypeScript · Supabase · OpenRouter · Gemini Live · ElevenLabs · Zustand  

---

## Décisions de cadrage

| Question | Décision |
|---|---|
| Relation avec l'existant | Surcouche — rien n'est touché dans VocalFlow, saisie, coaching-debrief |
| STT | Gemini Live (infra existante) |
| Signaux bulle V1 | Ratio rouge + lundi sans débrief (auto) + bouton permanent sidebar |
| Personas V1 | 3 existants (warrior / sport_coach / kind_coach), architecture extensible à 5 |
| LLM | `COACH_LLM_MODEL` env var, défaut `gpt-4o-mini` via OpenRouter |
| Architecture | Hybride C : client = orchestrateur UX, serveur = orchestrateur métier |

---

## Section 1 — Architecture générale

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT — Orchestrateur UX                              │
│                                                         │
│  useCoachSession (Zustand)                              │
│  ├── ui_state: idle | prompted | listening |            │
│  │            processing | speaking | confirming |      │
│  │            saving | reading | prescribing |          │
│  │            fallback_text | closed                    │
│  ├── session_id, persona                                │
│  ├── draft_status       ← copie lecture seule serveur   │
│  ├── coach_text, transcript_partial                     │
│  └── pending_turn_id   ← client_turn_id du tour actif  │
│                                                         │
│  CoachBubble        CoachDock                           │
│  (trigger visuel)   (dock bas d'écran)                  │
└──────────────────────────────────────────────────────────┘
                   │ chaque appel porte client_turn_id
┌──────────────────▼──────────────────────────────────────┐
│  SERVER — Orchestrateur métier                          │
│                                                         │
│  /api/coach/session/start   crée session + contexte     │
│  /api/coach/session/resume  rehydrate session active    │
│  /api/coach/turn            extraction + décision       │
│  /api/coach/confirm         sauvegarde + lecture        │
│  /api/coach/prescription/respond  log réponse           │
│                                                         │
│  CoachDecisionEngine (TypeScript pur, zéro LLM)        │
└──────────────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  SUPABASE                                               │
│  coach_sessions · coach_draft_states                    │
│  coach_messages · coach_prescriptions                   │
│  profiles (+ coach_persona, coach_onboarded)            │
└─────────────────────────────────────────────────────────┘
```

### Règles d'autorité

- Le **client** est l'orchestrateur UX : dock, audio live, interruptions, transcription partielle, ressenti utilisateur.
- Le **serveur** est l'orchestrateur métier : extraction KPI, relance, confirmation, lecture, prescription.
- `draft_status` côté client est une **copie lecture seule** du dernier état serveur connu. Le client ne calcule jamais la logique métier.

### Règles de robustesse des tours

- Chaque tour émis par le client porte un `client_turn_id` (UUID généré côté client).
- Le serveur renvoie ce même `client_turn_id` avec chaque réponse.
- Zustand ignore toute réponse dont le `client_turn_id` ne correspond pas au `pending_turn_id` courant.
- `/api/coach/turn` est idempotente par couple `(session_id, client_turn_id)`.

### Règles de reprise d'écoute

- Après fin du TTS coach, la reprise est **manuelle par défaut**.
- `auto_listen: false` en V1 — prévu dans l'architecture mais désactivé.
- La transcription partielle n'est jamais restaurée après refresh. Le draft métier, oui.

### Règles de session

- Session resumable si :
  - `status = 'active'` ET `coach_draft_states.updated_at > now() - COACH_SESSION_TTL_MINUTES`
  - OU `status = 'saved'` ET `current_step IN ('reading', 'prescribing')` — lecture/prescription en cours au moment du refresh
- Dans ce second cas, `/session/resume` renvoie le dernier message coach (lecture ou prescription) pour permettre à l'UX de continuer proprement.
- Si `status = 'saved'` ET `current_step = 'closed'` → `can_resume: false`, session terminée.
- Au rechargement, le client appelle `/api/coach/session/resume` avant de réafficher le dock.

### Mapping server_step → ui_state

| `server_step` | `ui_state` recommandé |
|---|---|
| `prompted` | `speaking` |
| `collecting` | `listening` ou `processing` |
| `needs_clarification` | `listening` |
| `ready_to_confirm` | `confirming` |
| `confirming` | `saving` |
| `saved` | `reading` |
| `prescribing` | `prescribing` |
| `closed` | `closed` |

Le client ne dérive jamais `server_step` à partir de `ui_state`. Les deux sont renvoyés explicitement dans chaque réponse.

**Cas particulier `uiState='prompted'`** : état transitoire côté client uniquement, entre le clic sur "Parler à mon coach" et la première réponse de `/session/start`. Il ne correspond à aucun `server_step`. Dès réception de la réponse serveur (`server_step='prompted'`), le client passe immédiatement à `uiState='speaking'`.

### Failure modes

| Cas | Détection | Comportement serveur | Comportement client |
|---|---|---|---|
| STT session timeout / disconnect | Provider disconnect | — | `uiState='fallback_text'`, session conservée |
| Timeout LLM >8s | AbortController | `{ error_code: 'LLM_TIMEOUT', recoverable: true }` | `transcript_final` conservé, options Réessayer / Passer en texte |
| Erreur DB patch draft | Exception Supabase | Aucun avancement d'état, log technique, **pas** d'écriture `coach_messages` | Message de reprise court, retry explicite |
| TTS indisponible | Fetch échoue | — | Texte seul affiché, session continue |
| Double confirmation | `status in ('saved','closed')` | Renvoie dernier résultat sans réécriture | Client reçoit état final |
| Tour en double | `client_turn_id` déjà traité | Renvoie dernière réponse | Client applique normalement |
| Session expirée | `status='abandoned'` ou `updated_at` dépassé TTL | `can_resume: false` | Dock reste fermé |

**Principe invariant** : un échec partiel ne termine jamais une session active. Le draft validé n'est jamais perdu.

---

## Section 2 — Base de données

### Migration : `029_nxt_coach_foundations.sql`

#### `coach_sessions`

```sql
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

CREATE INDEX idx_coach_sessions_user ON coach_sessions(user_id, status, started_at DESC);
```

#### `coach_draft_states`

```sql
CREATE TABLE coach_draft_states (
  session_id        UUID PRIMARY KEY REFERENCES coach_sessions(id) ON DELETE CASCADE,
  extracted_kpis    JSONB NOT NULL DEFAULT '{}',
  unresolved_fields TEXT[] NOT NULL DEFAULT '{}',
  relance_count     INT NOT NULL DEFAULT 0 CHECK (relance_count >= 0),
  last_transcript   TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

**Contrat JSONB `extracted_kpis` — figé :**

```json
{
  "mandats_signes": {
    "value": 2,
    "confidence": 0.97,
    "status": "confirmed",
    "source": "llm_extraction"
  }
}
```

- `value` : entier ≥ 0
- `confidence` : float dans [0, 1] — rejeté sinon
- `status` : `missing | inferred | needs_confirmation | confirmed`
- `source` : `llm_extraction | user_correction | inferred`

Le serveur valide chaque sous-objet KPI avant persistance. Aucune clé ou valeur hors contrat n'est écrite.

#### `coach_messages`

```sql
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

CREATE INDEX idx_coach_messages_session ON coach_messages(session_id, created_at);

-- Contrainte d'idempotence /turn : un client_turn_id ne peut être traité qu'une fois par session
CREATE UNIQUE INDEX idx_coach_messages_turn_idempotence
  ON coach_messages(session_id, client_turn_id)
  WHERE client_turn_id IS NOT NULL AND role = 'user';
```

**Mécanisme d'idempotence `/turn`** : avant tout traitement, le serveur tente l'INSERT du message `role='user'`. Si la contrainte unique `(session_id, client_turn_id)` lève une violation, le tour a déjà été traité — le serveur récupère le `coach_text` du message `role='coach'` suivant pour ce `client_turn_id` et le renvoie sans retraitement.

Un tour dont le patch draft a échoué n'est **pas** inscrit dans `coach_messages`. Il est marqué en erreur dans le log technique serveur uniquement.

#### `coach_prescriptions`

```sql
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

CREATE INDEX idx_coach_prescriptions_user    ON coach_prescriptions(user_id, prescribed_at DESC);
CREATE INDEX idx_coach_prescriptions_session ON coach_prescriptions(session_id);
```

#### Modifications `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_persona TEXT DEFAULT 'kind_coach'
    CHECK (coach_persona IN ('warrior','sport_coach','kind_coach')),
  ADD COLUMN IF NOT EXISTS coach_onboarded     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_persona_set_at TIMESTAMPTZ;
```

### Vue manager

```sql
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
```

### RLS et sécurité de la vue manager

**Utilisateur :**
- `SELECT / INSERT / UPDATE` sur ses propres `coach_sessions`, `coach_draft_states`, `coach_prescriptions`
- `SELECT` sur ses propres `coach_messages`

**Manager / Directeur :**
- Accès via `coach_sessions_manager_view` uniquement
- Aucun accès direct à `coach_messages`, `coach_draft_states`

**SQL de sécurisation explicite (à inclure dans la migration) :**
```sql
-- Révoquer l'accès direct aux tables sensibles pour le rôle authenticated
REVOKE SELECT ON coach_messages     FROM authenticated;
REVOKE SELECT ON coach_draft_states FROM authenticated;

-- Accorder l'accès à la vue manager uniquement
GRANT SELECT ON coach_sessions_manager_view TO authenticated;

-- Les RLS policies garantissent que chaque utilisateur ne voit que ses propres lignes
-- Le manager/directeur voit les lignes de son org_id via la vue (filtre org_id à ajouter dans la view)
```

> Note : la vue `coach_sessions_manager_view` doit filtrer par `org_id` en production. En V1, le filtre est géré côté applicatif via `requireAuth()` + vérification `org_id`.

---

## Section 3 — Orchestrateur serveur & moteur de décision

### Types

```typescript
export type CoachUIState =
  | 'idle' | 'prompted' | 'listening' | 'processing'
  | 'speaking' | 'confirming' | 'saving' | 'reading'
  | 'prescribing' | 'fallback_text' | 'closed'

export type ServerStep =
  | 'prompted' | 'collecting' | 'needs_clarification'
  | 'ready_to_confirm' | 'confirming' | 'saved'
  | 'reading' | 'prescribing' | 'closed'
```

### `CoachDecisionEngine` — TypeScript pur, zéro LLM

```typescript
// src/lib/coach-decision-engine.ts

interface DecisionInput {
  draft: DraftState
  history: { weeklyResults: PeriodResults[] }  // 4 dernières semaines
  profile: UserProfile
  ratioConfigs: Record<RatioId, RatioConfig>
  activeSubscriptions: string[]
  prescriptionHistory: CoachPrescription[]
  relanceCount: number
}

interface DecisionOutput {
  next_step: ServerStep
  clarification_targets: KpiField[]   // max 2
  can_confirm: boolean
  reading_signal: ReadingSignal | null
  prescription_decision: PrescriptionDecision | null
}
```

**Priorité de relance — figée, jamais décidée par le LLM :**
```
mandats_signes → mandats_exclusifs → contacts_totaux → estimations_realisees
→ nombre_visites → offres_recues → actes_signes → chiffre_affaires
```

**Règles :**
- Max 2 `clarification_targets` par tour
- Si `relance_count >= 3` et champs prioritaires manquants → `ready_to_confirm` avec champs nuls **explicites**, jamais injectés silencieusement
- `can_confirm = true` si tous champs prioritaires ont `status !== 'missing'`
- `next_step` ne dépend jamais d'un output LLM

**Éligibilité prescription (3 conditions requises) :**
1. axe faible clair identifié
2. brique NXT répond précisément à cet axe
3. brique non déjà active dans les abonnements

Une seule prescription par débrief. Jamais si `prescriptionHistory` contient une prescription < 7 jours.

### LLM — 3 prompts distincts

**A. Extraction prompt**
```
Entrée : transcript_final + liste KPI attendus + draft courant
Sortie JSON stricte :
{
  "patches": {
    "mandats_signes": { "value": 2, "confidence": 0.97, "source": "llm_extraction" }
  },
  "ambiguities": ["contacts_totaux mentionné sans chiffre clair"],
  "global_confidence": 0.91
}
Règle : KPI ambigu → pas patché, entre dans ambiguities.
```

**B. Conversation prompt**
```
Entrée : persona + draft_status + clarification_targets + dernier transcript + server_step
Contraintes : phrases courtes, une seule question max, jamais de vocabulaire formulaire, max 3 lignes
Sortie : { "coach_text": "..." }
```

**C. Prescription wording**
```
Entrée : prescription_decision + persona
Structure : lien observation → valeur brique → projection CA → question ouverte
Sortie : { "coach_text": "..." }
```

### Routes API

#### `POST /api/coach/session/start`

```typescript
// Entrée : { trigger_type, trigger_context?, persona? }
// 1. requireAuth()
// 2. Charger contexte utilisateur (4 semaines, profil, ratios, DPI, abonnements)
// 3. Créer coach_sessions + coach_draft_states en DB
// 4. Premier message : template par trigger + persona (V1)
//    ratio_rouge        → "X visites pour 0 offre. On regarde ça ensemble ?"
//    lundi_sans_debrief → "C'est lundi. Tu me racontes ta semaine ?"
//    bouton_manuel      → "On fait le point sur ta semaine ?"
// 5. Log message initial dans coach_messages (role='coach')

// Réponse :
{
  session_id, persona, ui_state: 'speaking', server_step: 'prompted',
  coach_text, draft_status: { confirmed_fields: 0, missing_priority: [...], can_confirm: false },
  client_turn_id: null
}
```

#### `POST /api/coach/session/resume`

```typescript
// Entrée : { session_id? } — si absent, cherche session active du user
// Réponse :
{
  session_id: "uuid",
  can_resume: boolean,
  ui_state, server_step, persona,
  coach_text,       // dernier message coach utile
  draft_status,
  prescription: null | PrescriptionCard
}
```

#### `POST /api/coach/turn`

**Idempotente par `(session_id, client_turn_id)`.**

```typescript
// Entrée : { session_id, transcript_final, channel, client_turn_id }
// 1. requireAuth() + session active
// 2. Idempotence check → renvoyer dernière réponse si client_turn_id déjà traité
// 3. extractKpis() → LLM extraction prompt
// 4. Valider patch (contrat JSONB strict)
// 5. updateDraft() en DB
//    ✓ Succès → logMessage(role='user', turn_status='ok')
//    ✗ Échec  → pas d'écriture coach_messages, log technique uniquement
//               renvoyer { error_code: 'DRAFT_PATCH_FAILED', recoverable: true }
// 6. CoachDecisionEngine.computeNextStep()
// 7. buildCoachReply() → LLM conversation prompt
// 8. logMessage(role='coach', turn_status='ok')
// 9. Mettre à jour coach_sessions.current_step
```

#### `POST /api/coach/confirm`

**Idempotente : si `status in ('saved','closed')` → renvoyer dernier résultat sans réécriture.**

```typescript
// Entrée : { session_id, confirmed: true }
// Toute correction repasse par /turn — jamais par /confirm
// 1. Idempotence check
// 2. Sauvegarder draft dans period_results
// 3. coach_sessions.status = 'saved', confirmed_at = now()
// 4. selectReadingSignal() → LLM → logMessage(role='coach') [lecture]
// 5. evaluatePrescription() → si eligible → LLM wording → logMessage(role='coach') [prescription]
//    → écrire coach_prescriptions
```

#### `POST /api/coach/prescription/respond`

```typescript
// Entrée : { session_id, prescription_id, response: 'accepted' | 'refused' }
// Met à jour coach_prescriptions.user_response
// Log message coach de clôture dans coach_messages
```

#### `POST /api/coach/session/abandon`

```typescript
// Entrée : { session_id }
// 1. requireAuth() + vérifier que session appartient au user
// 2. Si status in ('saved','closed') → no-op, renvoie état courant
// 3. Sinon → coach_sessions.status = 'abandoned', ended_at = now()
// Réponse : { session_id, status: 'abandoned' }
```

---

## Section 4 — Composants client

### Store Zustand

```typescript
// src/stores/coach-session-store.ts

interface CoachSessionState {
  sessionId: string | null
  persona: PersonaId | null
  pendingTurnId: string | null

  uiState: CoachUIState
  serverStep: ServerStep | null   // jamais calculé localement

  coachText: string | null
  transcriptPartial: string       // jamais persisté, jamais restauré après refresh
  draftStatus: DraftStatus | null // copie lecture seule serveur
  prescription: PrescriptionCard | null

  setUIState: (s: CoachUIState) => void
  setTranscriptPartial: (t: string) => void

  startSession: (trigger: CoachTrigger) => Promise<void>   // no-op si uiState !== 'idle'
  resumeSession: () => Promise<void>                        // une seule fois au mount layout
  sendTurn: (transcript: string, channel: 'voice' | 'text') => Promise<void>
  confirmSession: () => Promise<void>
  respondPrescription: (r: 'accepted' | 'refused') => Promise<void>
  dismissUI: () => void            // ferme dock côté client uniquement
  abandonSession: () => Promise<void>  // notifie serveur → status='abandoned'
}
```

**Règles de lifecycle :**
- `pendingTurnId` : défini avant `sendTurn()`, remis à `null` à réception valide ou erreur terminale
- `transcriptPartial` : vidé à chaque nouveau tour et après envoi de `transcript_final`
- `prescription` : vidée au démarrage de toute nouvelle session
- Fermeture session non sauvegardée → `abandonSession()` ; session sauvegardée → `dismissUI()` seul

### Personas — source de vérité unique

```typescript
export interface PersonaConfig {
  id: PersonaId           // seule valeur persistée en DB
  label: string           // affichage UI uniquement, jamais persisté
  description: string
  signature: string
  emoji: string
  voiceEnvKey: string
  geminiVoice: string
}
// Architecture extensible : ajouter une persona = ajouter un objet dans PERSONAS[]
```

### `CoachBubble`

```
src/components/coach/coach-bubble.tsx
Monté dans : src/app/(dashboard)/layout.tsx
```

**Hook `useCoachTrigger` :**
- Clé de cooldown : `coach_bubble:${userId}:ratio_rouge:${ratio_id}` — 7 jours
- Clé de cooldown : `coach_bubble:${userId}:lundi_sans_debrief` — 7 jours
- Trigger lundi évalué en `Europe/Paris` (lundi 00h00 timezone métier)
- Jamais affichée si `uiState !== 'idle'` ou si session active détectée côté serveur
- Affichage uniquement après réponse de `resumeSession()`

### `CoachDock`

```
src/components/coach/coach-dock.tsx
Visible si : uiState !== 'idle'
```

**Comportement bouton micro par état :**

| `uiState` | Bouton micro | Action |
|---|---|---|
| `listening` | actif | coupe l'écoute |
| `processing` | désactivé | — |
| `speaking` | désactivé | attend fin TTS |
| `confirming` | actif | **correction vocale** → sendTurn |
| `reading` | actif | **continuer / répondre** → sendTurn |
| `prescribing` | actif | **répondre à la proposition** → sendTurn |
| `fallback_text` | masqué | input texte |
| `saving` | désactivé | — |

### `PersonaSelector`

```
src/components/coach/persona-selector.tsx
Affiché si : coach_onboarded === false ET premier déclenchement
Au choix : PATCH profiles → coach_persona = id, coach_onboarded = true
```

### `useCoachAudio` — interface générique

```typescript
// src/hooks/use-coach-audio.ts
interface CoachAudioInterface {
  startListening: () => void
  stopListening: () => void
  playCoachSpeech: (text: string, persona: PersonaId) => Promise<void>
  interruptSpeech: () => void
  transcriptPartial: string
  transcriptFinal: string | null
}
// Implémentation V1 : Gemini Live (STT) + ElevenLabs (TTS)
// L'interface est générique — changer de provider = changer l'implémentation, pas l'interface
```

### Rehydration au montage

```typescript
// src/app/(dashboard)/layout.tsx
useEffect(() => {
  if (!user) return
  resumeSession()  // une seule fois, dépendance vide
}, [])
// CoachBubble n'évalue ses triggers qu'après réponse de resumeSession()
```

### Points d'intégration

```typescript
// src/app/(dashboard)/layout.tsx
<>
  {children}
  <CoachBubble />   {/* triggers auto + cooldown */}
  <CoachDock />     {/* visible si session active */}
</>

// src/components/layout/sidebar.tsx
// Bouton permanent "Parler à mon coach" en bas de sidebar
// → startSession({ trigger_type: 'bouton_manuel' })
// → PersonaSelector si coach_onboarded === false
```

---

## Section 5 — Gestion des erreurs & tests

### Codes d'erreur structurés

| `error_code` | `recoverable` | Cas |
|---|---|---|
| `LLM_TIMEOUT` | `true` | Timeout LLM >8s |
| `DRAFT_PATCH_FAILED` | `true` | Erreur DB sur updateDraft |
| `SESSION_NOT_FOUND` | `false` | session_id invalide |
| `SESSION_EXPIRED` | `false` | TTL dépassé |

### Règle d'expiration de session

Session resumable si `status = 'active'` ET `coach_draft_states.updated_at > now() - COACH_SESSION_TTL_MINUTES`.  
Durée : `COACH_SESSION_TTL_MINUTES` (défaut `30`).

### Stratégie de tests

**Unitaires — `vitest`**
```
src/lib/__tests__/coach-decision-engine.test.ts
  - computeNextStep() : relance_count 0→3+, champs manquants, can_confirm
  - selectReadingSignal() : priorité ratio > tendance > DPI
  - evaluatePrescription() : 3 conditions × cas limites
  - validateKpiPatch() : hors contrat rejeté, confidence hors [0,1] rejeté

src/lib/__tests__/coach-trigger.test.ts
  - Cooldown par clé précise (userId + trigger_type + ratio_id)
  - Trigger lundi : timezone Europe/Paris, dim soir vs lun matin
  - No-op si session active, no-op si uiState !== 'idle'
```

**Intégration API**
```
/session/start  : crée session + draft + message initial
/session/resume : can_resume=true si active, false si abandonnée ou expirée
/turn           : idempotence par client_turn_id
/turn           : pas de log coach_messages si patch draft échoue
/confirm        : idempotence si status='saved'
/confirm        : logs lecture + prescription dans coach_messages

Sécurité / RLS :
- utilisateur A ne peut pas lire la session de B
- manager ne peut pas lire coach_messages
- manager ne peut pas lire coach_draft_states
- vue manager expose uniquement les colonnes prévues
```

**E2E — `playwright`**
```
e2e/nxt-coach.spec.ts

1. Happy path complet (fallback_text — CI sans vocal live)
   bulle → PersonaSelector → session → 3 tours texte → confirm → lecture → prescription refused
2. Reprise après refresh
3. Abandon → refresh → can_resume: false → dock fermé
4. Fermeture propre session sauvegardée → dismissUI uniquement
5. Fallback texte si STT indisponible
```

### Variables d'environnement

```bash
# Existantes
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
ELEVENLABS_WARRIOR_VOICE_ID=...
ELEVENLABS_SPORT_COACH_VOICE_ID=...
ELEVENLABS_KIND_COACH_VOICE_ID=...

# Nouvelles
COACH_LLM_MODEL=openai/gpt-4o-mini
COACH_LLM_TIMEOUT_MS=8000
COACH_SESSION_TTL_MINUTES=30
APP_TIMEZONE=Europe/Paris
```

### Périmètre V1 — hors scope

- Conversation libre illimitée
- Mémoire longue entre sessions
- `auto_listen` activé
- Signaux bulle V1.1+ (orange stable 3 semaines, axe DPI faible)
- Personas 4 et 5 (Thomas, Claire)
- NXT Finance dans les prescriptions

---

## Nouveaux fichiers à créer

```
src/types/coach-session.ts              types CoachUIState, ServerStep, DraftStatus...
src/stores/coach-session-store.ts       store Zustand
src/lib/coach-decision-engine.ts        moteur métier TypeScript pur
src/hooks/use-coach-trigger.ts          signaux bulle
src/hooks/use-coach-audio.ts            interface audio générique
src/components/coach/coach-bubble.tsx   déclencheur contextuel
src/components/coach/coach-dock.tsx     dock conversationnel
src/components/coach/persona-selector.tsx  sélecteur premier lancement
src/app/api/coach/session/start/route.ts
src/app/api/coach/session/resume/route.ts
src/app/api/coach/session/abandon/route.ts
src/app/api/coach/turn/route.ts
src/app/api/coach/confirm/route.ts
src/app/api/coach/prescription/respond/route.ts
supabase/migrations/029_nxt_coach_foundations.sql
src/lib/__tests__/coach-decision-engine.test.ts
src/lib/__tests__/coach-trigger.test.ts
e2e/nxt-coach.spec.ts
```

## Fichiers existants à modifier

```
src/lib/personas.ts                     étendre PersonaConfig avec voiceEnvKey, geminiVoice, signature
src/app/(dashboard)/layout.tsx          monter CoachBubble + CoachDock + rehydration
src/components/layout/sidebar.tsx       ajouter bouton permanent "Parler à mon coach"
.env.local.example                      ajouter les 4 nouvelles variables
```
