# Ingestion Coach Brain (PR-C)

Pipeline standalone Node.js qui lit le dossier Google Drive du « cerveau du coach » NXT, extrait des **patterns coaching anonymisés** par levier via LLM, et les upsert dans Supabase (`coach_brain_patterns`).

Aucune partie de ce pipeline ne s'exécute dans le bundle Next.js. Aucun secret n'arrive côté client.

---

## Setup initial

### 1. Installer les dépendances

```bash
npm install
```

(ajoute `googleapis` et `tsx` en devDependencies)

### 2. Créer un service account GCP dédié

1. Console GCP → IAM & Admin → Service Accounts → **Create**
2. Nom : `nxt-coach-brain-ingest`
3. Activer l'API Drive : `gcloud services enable drive.googleapis.com` (ou via la console)
4. Créer une clé JSON (Keys → Add key → JSON) et **télécharger**
5. **Copier l'email du service account** (forme `nxt-coach-brain-ingest@<project>.iam.gserviceaccount.com`)

### 3. Partager le dossier Drive avec le service account

Sur le dossier Drive source (ID `17mcuV2rHUOOmFZQHV6xAuMkuLPJdsdB7`) :
**Share** → coller l'email du service account → rôle **Viewer**.

Sans cette étape, l'API renvoie `404 file not found`.

### 4. Variables d'environnement (`.env.local`)

```bash
# Drive — service account
GOOGLE_SERVICE_ACCOUNT_KEY=<JSON brut OU base64>
COACH_BRAIN_DRIVE_FOLDER_ID=17mcuV2rHUOOmFZQHV6xAuMkuLPJdsdB7

# OpenRouter (déjà présent pour coaching-debrief)
OPENROUTER_API_KEY=sk-or-...

# Modèle LLM (optionnel, défaut: openai/gpt-4o-mini)
COACH_BRAIN_OPENROUTER_MODEL=openai/gpt-4o-mini

# Supabase service role (déjà présent pour PR-A)
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

`GOOGLE_SERVICE_ACCOUNT_KEY` accepte deux formats :
- JSON brut (commençant par `{`)
- base64 du JSON (recommandé pour secrets multilignes en CI)

Pour encoder en base64 :
```bash
cat service-account-key.json | base64 -w 0
```

---

## Utilisation

### Run nominal (batch 50)

```bash
npm run ingest:coach-brain
```

### Dry-run (pas d'écriture Supabase)

```bash
npm run ingest:coach-brain -- --dry-run
```

### Limite custom

```bash
npm run ingest:coach-brain -- --limit=10
```

### Forcer la ré-ingestion (ignore state.json)

```bash
npm run ingest:coach-brain -- --force
```

---

## Pipeline interne

```
Drive folder
  ↓
list (mimeType: Google Doc / text/plain / text/markdown)
  ↓
filter via state.json (idempotence — sauf --force)
  ↓
batch limit (défaut 50)
  ↓
download text
  ↓
anonymize (regex pre-scrub : email/tel/civilité+nom/adresse/CP/montants/URL)
  ↓
extract patterns via OpenRouter (JSON strict, prompt anti-PII)
  ↓
validate (8 leviers × 4 axes, longueurs raisonnables, anti-noms-propres)
  ↓
upsert Supabase (insert OU increment frequency_score si texte normalisé identique)
  ↓
mark fileId as ingested in state.json
```

**Politique de rejet** :
- Document trop court / hors sujet / extraction LLM vide → log `no actionable pattern extracted, skip` et marque le fileId comme ingéré (pas de retry).
- Erreur LLM transitoire (timeout, 5xx) → pas de marquage → retry au prochain run.
- Erreur Drive download → marque comme ingéré (évite boucle infinie).

---

## state.json

Fichier local, **gitignored**. Maintient la liste des `fileId` Drive déjà ingérés + stats cumulées.

```json
{
  "ingestedFileIds": ["abc123...", "def456..."],
  "lastRunAt": "2026-05-03T12:34:56.000Z",
  "stats": {
    "totalRuns": 6,
    "totalFilesProcessed": 285,
    "totalPatternsUpserted": 142
  }
}
```

En CI (PR-D — GitHub Actions), `state.json` peut être :
- soit reconstruit à chaque run (idempotent grâce à `frequency_score` + matching de texte normalisé),
- soit persisté via un cache d'artifact GH Actions ou une table Supabase dédiée (`coach_brain_ingest_state`).

À trancher au moment de la PR-D.

---

## Anti-PII (règles de sécurité)

1. **Regex pre-scrub** (`anonymize.ts`) : neutralise les patterns évidents avant LLM.
2. **Prompt LLM strict** : interdit de citer noms/lieux/dates ; demande des formulations génériques uniquement.
3. **Validation côté Node** : rejette tout pattern qui contient une séquence ressemblant à un nom propre (2+ mots capitalisés consécutifs hors début de phrase).
4. **Pas de stockage du transcript brut** : seuls les patterns extraits arrivent en BDD.

Si un pattern PII passe quand même : suppression manuelle via Supabase + raffinage des regex / prompt.

---

## Coûts estimés

| Item | Volume | Coût par run hebdo |
|---|---|---|
| Drive API | 50 fichiers | gratuit (quota standard) |
| OpenRouter (gpt-4o-mini) | 50 × ~3k tokens | ~0,30 €/run |
| Supabase | <100 rows par run | négligeable |

**~1 €/mois** en régime de croisière (4 runs hebdo × 50 docs). Backfill initial des 300 docs : ~2 € en une fois.

---

## Suite — PR-D

- Cron GitHub Actions hebdo (lundi 03:00 UTC).
- Push state.json en cache d'artifact (ou table Supabase dédiée).
- Alerting Slack/email si erreur fatale.
