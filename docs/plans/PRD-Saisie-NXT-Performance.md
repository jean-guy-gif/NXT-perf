# PRD — Saisie de Performances NXT Performance
**Version :** 1.0  
**Date :** Avril 2026  
**Statut :** Validé — Prêt pour implémentation  
**Scope :** Fonctionnalité Saisie (route `/saisie`) — refonte complète avec voix, import enrichi et paramétrage personas

---

## 1. Vision & Objectif Produit

La saisie d'activité est le point d'entrée critique de toute la valeur de NXT Performance. Sans données fiables et régulières, les dashboards, ratios, GPS et projections deviennent inutiles. Pourtant, la saisie manuelle est perçue comme une friction — un formulaire de plus dans une journée déjà chargée.

**L'objectif de cette fonctionnalité est de transformer la saisie en rituel professionnel fluide et valorisant.** Elle ne doit pas ressembler à une obligation administrative, mais à un débriefing rapide et structuré — comme un point de fin de semaine avec son manager, mais sans le manager.

**Trois modes d'entrée coexistent :**
1. **Saisie vocale guidée** — mode principal, hebdomadaire, 2–3 minutes
2. **Import de fichier** — Excel, PDF, photo — pour les conseillers qui exportent depuis un CRM ou un tableau
3. **Saisie manuelle classique** — mode de rattrapage, toujours accessible

---

## 2. État de l'Implémentation Existante (Avril 2026)

**⚠️ Ce PRD ne repart pas de zéro.** Une implémentation fonctionnelle existe déjà. Les phases d'implémentation sont donc des **évolutions ciblées**, pas des reconstructions.

### Ce qui existe et fonctionne

| Composant | Fichier | État |
|---|---|---|
| API d'extraction IA | `src/app/api/saisie-ai/route.ts` | ✅ Fonctionnel — 4 actions |
| Client library | `src/lib/saisie-ai-client.ts` | ✅ Fonctionnel — extract, image, doc, speak |
| Composant UI complet | `src/components/saisie/nxt-voice-assistant.tsx` | ✅ Fonctionnel — 742 lignes |

### Ce que le composant existant couvre déjà

**Flow UI :** `idle → recording → analyzing → missing → confirmation → done` (6 états)

**Import fichiers :** Image / PDF (base64 → API vision) / Excel (XLSX.js côté client) / Word (mammoth.js) → tous envoyés à OpenRouter/Gemini 2.0 Flash pour extraction JSON

**Voix :** Web Speech API (reconnaissance vocale continue) + `speak()` / `stopSpeaking()` (synthèse TTS FR)

**Extraction :** 15 champs métier en 4 sections déjà mappés, fusion des résultats (nouvelles valeurs complètent les anciennes), écran de confirmation avec édition manuelle

**Backend :** OpenRouter → Gemini 2.0 Flash pour les 4 actions (extract, extract_image, extract_document, greet)

### Ce qui manque / ce qui est à construire

| Besoin PRD | Statut |
|---|---|
| Déclenchement fullscreen le lundi | ❌ À construire |
| Conversation guidée structurée (4 blocs, questions séquencées) | ❌ À construire — actuellement l'IA extrait en une fois |
| Reprise sur brouillon interrompu | ❌ À construire |
| 5 personas avec scripts différenciés | ❌ À construire |
| Paramètres voix dans les Settings | ❌ À construire |
| Upgrade vers Gemini 3.1 Flash Live (temps réel, WebSocket) | 🔄 Migration — actuellement Web Speech API |
| Dictionnaire d'alias enrichi (MS, ME, SSP, AA…) | 🔄 Enrichissement du prompt existant |
| Expiration automatique des brouillons | ❌ À construire |
| Adaptation du ton de l'écran lundi par persona | ❌ À construire |

---

## 3. Périmètre & Rôles

| Rôle | Accès à la saisie vocale | Notes |
|---|---|---|
| Conseiller | ✅ Principal | Toujours |
| Manager | ✅ Si activité commerciale propre | Optionnel selon profil |
| Directeur | ❌ | Non pertinent |
| Coach | ❌ | Non pertinent |
| Réseau | ❌ | Non pertinent |

**Période de saisie :** La saisie vocale hebdomadaire alimente la **période mensuelle en cours** par cumul. Il n'y a pas de type de période "semaine" distinct. Chaque saisie vocale ajoute ses valeurs aux totaux du mois en cours dans Supabase.

---

## 3. Déclenchement Hebdomadaire — L'Écran de Bienvenue du Lundi

### 3.1 Logique de déclenchement

Chaque lundi, au premier login du conseiller sur la plateforme, un **écran pleine page** intercale sa navigation avant l'accès au dashboard. Cet écran n'est affiché qu'une seule fois par semaine (flag `lastVoiceSaisiePromptDate` en base ou localStorage, resetté chaque lundi).

**Condition de déclenchement :**
- `today === Monday` ET `lastVoiceSaisiePromptDate !== this week's Monday`

**Réinitialisation :** Si le conseiller a déjà fait sa saisie cette semaine (quel que soit le mode), l'écran n'est plus affiché.

### 3.2 Design de l'écran de déclenchement

L'écran doit être **plein écran, immersif, positif.** Il ne doit jamais ressembler à une alerte ou une obligation. Le terme "saisie obligatoire" n'apparaît nulle part.

**Structure visuelle :**
```
[Logo NXT / animation subtile]

  Bonne semaine, [Prénom] 👊
  
  Prends 2 minutes pour faire le point 
  sur ta semaine. C'est le moment.

  [CTA PRINCIPAL — bouton large, couleur primaire]
  "Démarrer mon bilan"

  [Lien texte minimaliste, gris clair, en bas]
  "Passer pour l'instant"
```

**Règles UX du bouton "Passer" :**
- Texte : "Passer pour l'instant" (jamais "Ignorer" ou "Non merci")
- Style : texte simple, couleur `text-muted-foreground`, pas de border, pas de fond
- Taille : 12–13px, non souligné
- Position : centré en bas de l'écran, avec 40px de margin-top minimal depuis le CTA principal
- Il est là (accessible), mais il ne concurrence pas visuellement le CTA

**Ton de l'écran :** Adapté au persona voix sélectionné dans les paramètres. Si "Homme de guerre" est actif, le texte change légèrement :
- Homme de guerre : "Rapport de semaine. 2 minutes. Allons-y."
- Coach sportif : "C'est l'heure du debrief ! Ta semaine en 2 min."
- Bienveillant : "Tu as bossé dur cette semaine. Prends 2 minutes pour en faire le bilan."
- Neutre : "Bonne semaine, [Prénom]. Prends 2 minutes pour saisir ton activité."

### 3.3 Sélection du mode à l'entrée

Après le CTA "Démarrer mon bilan", le conseiller choisit son mode d'entrée :

```
Comment tu veux saisir ?

[🎙️ À la voix]        [📄 Importer un fichier]        [✍️ Saisir manuellement]
  Guidé, 2 min          Excel / PDF / Photo              Formulaire classique
```

---

## 4. Feature 1 — Saisie Vocale Guidée

### 4.1 Principe de fonctionnement

La saisie vocale est une **conversation guidée et structurée** entre le conseiller et NXT. Le système pose les questions, le conseiller répond à l'oral (ou lit les questions à l'écran selon le mode choisi). L'IA extrait les données numériques et qualitatives des réponses et les mappe sur les champs de la saisie.

**Durée cible : 2 à 3 minutes.** La conversation est conçue pour être fluide, non-exhaustive si le conseiller va vite, mais capable d'aller chercher les données manquantes par des questions de relance.

**Deux modes d'interaction :**
- **Mode audio full :** L'IA parle, le conseiller répond à l'oral. Questions lues via Gemini 3.1 Flash Live.
- **Mode texte :** Les questions s'affichent à l'écran, le conseiller répond à l'oral (speech-to-text) ou au clavier. Pas de voix synthétique.

Le choix est fait au lancement de la session via un toggle visible en haut de l'interface.

### 4.2 Architecture de la conversation — 4 blocs

La conversation suit les 4 sections métier, dans l'ordre :

```
[1] PROSPECTION → [2] VENDEURS → [3] ACHETEURS → [4] VENTES
```

Chaque bloc peut être traité en **1 à 3 échanges** selon la densité d'activité du conseiller. Le système s'adapte : si la réponse contient toutes les données du bloc, il passe au suivant sans poser de questions de relance.

### 4.3 Script de conversation — Flow détaillé

#### Ouverture

> "Bonjour [Prénom], on démarre. Cette semaine en prospection : tu as eu combien de contacts au total, et combien venaient directement de tes portails ou de ta vitrine ?"

*L'IA attend une réponse contenant 2 valeurs. Exemple attendu : "j'ai eu 35 contacts en tout, dont 20 entrants".*

Si la réponse ne contient qu'une valeur :
> "Et parmi eux, combien étaient des contacts entrants — portails, vitrine ?"

---

#### BLOC 1 — Prospection

**Champs à remplir :**
- `contactsTotaux`
- `contactsEntrants`
- `rdvEstimation` (nombre de RDV estimation décrochés cette semaine)
- `informationsVente` (infos de vente identifiées — noms + contexte)

**Questions principales :**
> "Et est-ce que tu as décroché des RDV estimation cette semaine ? Combien ?"

> "Tu as identifié des infos de vente — des projets vendeurs pas encore transformés en RDV ? Si oui, donne-moi les noms et un mot sur le contexte."

*Exemple de réponse attendue pour les infos de vente :* "Oui, M. Brun qui veut vendre sa maison en juin, et Mme Leroy, divorce en cours."  
→ Le système crée 2 entrées dans `informationsVente` avec nom + commentaire dictés.

---

#### BLOC 2 — Vendeurs

**Champs à remplir :**
- `estimationsRealisees`
- `mandatsSignes` + détail type (exclusif / simple) + `nomVendeur`
- `rdvSuivi`
- `requalificationSimpleExclusif`
- `baissePrix`

**Questions principales :**
> "Passons aux vendeurs. Tu as réalisé combien d'estimations cette semaine ?"

> "Et tu as signé des mandats ? Combien, et c'était du simple ou de l'exclusif ? Donne-moi les noms si tu veux."

*Exemple : "Deux mandats, un exclusif avec M. Durant, un simple avec Mme Petit."*  
→ Création de 2 entrées dans `mandats` avec type et nomVendeur.

> "Tu as fait des RDV de suivi avec des vendeurs qui ont déjà un mandat en cours ?"

> "Une requalification simple → exclusif cette semaine ? Une baisse de prix acceptée ?"

*Si le conseiller répond oui/non rapidement, l'IA adapte : "Combien ?" si oui, passe si non.*

---

#### BLOC 3 — Acheteurs

**Champs à remplir :**
- `acheteursChauds` (liste nom + commentaire + statut)
- `acheteursSortisVisite`
- `nombreVisites`
- `offresRecues`
- `compromisSignes`

**Questions principales :**
> "Côté acheteurs. Tu as de nouveaux acheteurs chauds cette semaine ? Des acquéreurs qualifiés avec un financement en place ?"

*Si oui :* "Donne-moi les noms et un mot sur leur projet."

> "Tu as emmené des acheteurs en visite ? Combien d'acheteurs distincts, et combien de visites au total ?"

> "Des offres reçues ? Des compromis signés ?"

---

#### BLOC 4 — Ventes

**Champs à remplir :**
- `actesSignes`
- `chiffreAffaires`
- `delaiMoyenVente`

**Questions principales :**
> "Et pour finir, les ventes. Des actes signés chez le notaire cette semaine ?"

*Si oui :* "Quel chiffre d'affaires tu as réalisé sur ces actes ?"

> "Tu as une idée du délai moyen entre compromis et acte sur ces ventes ?"  
*(Question optionnelle — si le conseiller ne sait pas, le champ reste vide)*

---

#### Clôture

> "C'est tout ! Je récapitule tout ça pour toi. Tu peux vérifier et corriger avant d'enregistrer."

→ Transition vers l'écran de confirmation.

---

### 4.4 Règles de gestion de la conversation

**Extraction intelligente :**
- L'IA doit extraire les données même si le conseiller répond en langage naturel : "j'en ai fait une douzaine" → 12, "une petite dizaine" → 10 (avec flag d'incertitude visuel sur le champ)
- Les alias métier sont reconnus : "MS" = mandat simple, "ME" / "exclusif" = mandat exclusif, "SSP" / "compromis" = compromis signé, "acte" / "AA" = acte authentique
- Les noms dictés à l'oral sont capturés tels quels (sans correction orthographique forcée)

**Questions de relance :**
- Si une donnée est ambiguë, l'IA repose la question de façon précise, une seule fois
- Si le conseiller dit "je ne sais pas" ou "zéro" ou "rien", la valeur 0 est enregistrée
- Maximum 2 relances par bloc pour rester dans la durée cible

**Gestion de l'interruption :**
- Si la session est quittée avant la fin, toutes les données extraites jusqu'à ce point sont sauvegardées en **brouillon** dans Supabase (`draft: true`)
- À la prochaine ouverture de la saisie vocale, le système détecte le brouillon et propose : "Tu avais commencé une saisie. On reprend là où tu t'étais arrêté ?" → reprend au début du bloc interrompu
- Le brouillon est conservé jusqu'au dimanche soir (auto-suppression à la fin de la semaine)

---

## 5. Feature 2 — Écran de Confirmation & Mapping

### 5.1 Structure de l'écran

Après la conversation vocale, le conseiller arrive sur un **écran de confirmation** affichant tous les champs mappés, organisés en 4 sections dépliées (prospection, vendeurs, acheteurs, ventes).

**Design :**
- Fond clair, layout en 2 colonnes sur desktop, 1 colonne sur mobile
- Chaque champ est affiché avec son libellé et sa valeur extraite
- Les champs avec un flag d'incertitude (valeur approximative) sont mis en évidence : icône ⚠️ jaune + bordure orange légère
- Les champs non renseignés (valeur null ou manquante) sont affichés en gris avec placeholder "--"
- Tous les champs sont **éditables inline** : clic sur la valeur → input numérique ou texte

**Actions disponibles :**
- `[Enregistrer]` — bouton CTA principal, valide et persiste en Supabase
- `[Modifier un champ]` — inline, pas de modale
- `[Réécouter / Relancer]` — en haut, permet de relancer la conversation sur un bloc spécifique

### 5.2 Logique de persistance

> **Mise à jour avril 2026 — Règle d'écrasement (remplace la règle de cumul initiale)**

À la validation :
- La saisie validée **remplace intégralement** l'entrée existante du mois en cours (`periodType: "month"`, `periodStart: premier du mois en cours`)
- Si aucune entrée n'existe pour ce mois, une nouvelle entrée est créée
- Si une entrée existe déjà (re-saisie sur la même période), elle est **écrasée**, pas additionnée
- Le flag `lastVoiceSaisieDate` est mis à jour (empêche le déclenchement lundi prochain)

**Règle d'unicité :**
- Clé logique : `(userId, periodType, periodStart)`
- Supabase : `upsert` avec `onConflict: "user_id,period_type,period_start"` → écrasement
- Store Zustand : `addResults()` déduplicaté par la même clé logique → écrasement côté client

**Conséquence :** chaque validation produit un snapshot complet du mois. L'utilisateur saisit ses totaux cumulés du mois en cours, pas un delta hebdomadaire. Une re-validation corrige les données, elle ne les double pas.

---

## 6. Feature 3 — Import de Fichiers Enrichi

### 6.1 Formats supportés

| Format | État actuel | Évolution PRD |
|---|---|---|
| Excel / CSV | ✅ Fonctionnel | Ajouter gestion des alias + colonnes manquantes |
| PDF | ❌ Non implémenté | À construire — extraction via Gemini vision |
| Photo (JPG/PNG) | ❌ Non implémenté | À construire — OCR via Gemini vision |

### 6.2 Gestion des alias et libellés non-standards

Le moteur d'import doit être capable de mapper des libellés non-standards sur les champs NXT. Une couche de normalisation est appliquée avant le mapping.

**Dictionnaire d'alias (non exhaustif — à enrichir) :**

| Alias entrants | Champ NXT |
|---|---|
| MS, Mandat Simple, M. Simple | mandats[].type = "simple" |
| ME, Exclusif, Mandat Exclusif, MEx | mandats[].type = "exclusif" |
| SSP, Compromis, Promesse, CSSP | compromisSignes |
| AA, Acte, Acte Authentique, Vente | actesSignes |
| CA, HO, Honoraires, Comm. | chiffreAffaires |
| Contacts, Appels, Prospects | contactsTotaux |
| Entrants, Portail, Vitrine | contactsEntrants |
| Estim, RDV Estim, Estimation | estimationsRealisees |
| Mandat, Prise de mandat | mandatsSignes |
| Visite, Sortie visite | nombreVisites |
| Offre, OP | offresRecues |

**Logique de traitement :**
1. Upload du fichier → parsing (xlsx / csv / pdf / image)
2. Extraction des colonnes ou zones de texte
3. Normalisation des libellés via le dictionnaire + LLM fallback (Gemini Flash pour les cas ambigus)
4. Mapping sur les champs NXT
5. Affichage de l'écran de confirmation (même écran que post-vocal) avec les champs remplis
6. Les champs non mappés sont mis en évidence avec un flag "Non reconnu" + suggestion manuelle

**Gestion des fichiers incomplets :**
- Les champs manquants restent vides mais visibles sur l'écran de confirmation
- Un résumé en haut indique : "X champs renseignés, Y champs à compléter"
- Le conseiller peut compléter manuellement avant d'enregistrer

### 6.3 Import PDF / Photo

Pour les PDF et photos (tickets, rapports CRM imprimés, tableaux photographiés) :
- Le fichier est envoyé à l'API Gemini (vision multimodale)
- Le prompt système extrait les données structurées dans un JSON normalisé
- Ce JSON est soumis à la même couche d'alias-matching que l'import Excel
- L'extraction est présentée sur l'écran de confirmation avec niveau de confiance par champ

---

## 7. Feature 4 — Paramètres Voix & Personas

### 7.1 Emplacement dans l'interface

Les paramètres voix sont accessibles depuis **Paramètres → Voix & Saisie**. Ils sont personnels (par utilisateur, pas par organisation).

### 7.2 Les 5 Personas

| Persona | Nom affiché | Ton | Type de voix |
|---|---|---|---|
| `warrior` | Homme de guerre | Direct, factuel, sobre. Phrases courtes. Pas de fioritures. Résultats bruts. | Voix masculine grave |
| `sport_coach` | Coach sportif | Énergique, challenge, célèbre les victoires. Pousse à faire mieux. | Voix masculine dynamique |
| `kind_coach` | Coach bienveillant | Chaleureux, positif, valorise l'effort. Jamais de jugement. | Voix féminine douce |
| `neutral_male` | Voix neutre (H) | Professionnel, neutre, informatif. | Voix masculine standard |
| `neutral_female` | Voix neutre (F) | Professionnel, neutre, informatif. | Voix féminine standard |

**Exemples de formulation par persona pour la même question :**

Question : "Combien d'estimations cette semaine ?"

- **Warrior :** "Estimations. Combien ?"
- **Coach sportif :** "Allez, les estimations ! T'as fait combien cette semaine ?"
- **Bienveillant :** "Et du côté des estimations, tu en as réalisé combien cette semaine ?"
- **Neutre (H/F) :** "Combien d'estimations as-tu réalisées cette semaine ?"

**Exemple sur une bonne performance :**

Si actes > 0 :
- **Warrior :** "Acte signé. Bien."
- **Coach sportif :** "Un acte ! C'est ça ! Continue comme ça."
- **Bienveillant :** "Super, un acte signé — c'est le fruit de ton travail de la semaine."
- **Neutre :** "D'accord, un acte signé enregistré."

### 7.3 Paramétrage UI

Interface style Waze / paramètres audio :

```
Choix de la voix de guidage

  [ 🪖 Homme de guerre    ] — sélectionné
  [ 🏋️ Coach sportif      ]
  [ 💙 Coach bienveillant  ]
  [ 🎙️ Voix neutre (H)    ]
  [ 🎙️ Voix neutre (F)    ]

  [▶ Écouter un extrait]

Mode de saisie par défaut
  ○ Audio complet (IA parle + je réponds à l'oral)
  ○ Texte + oral (questions à l'écran, je réponds à l'oral)
  ○ Texte + clavier (tout à l'écran)
```

---

## 8. Architecture Technique

### 8.1 Technologie vocale — Gemini 3.1 Flash Live

**Modèle :** `gemini-3.1-flash-live-preview`  
**API :** Gemini Live API (WebSocket stateful bidirectionnel)  
**Intégration :** Server-to-client via ephemeral tokens (sécurité, clé API non exposée)

**Flow technique :**
```
Client (Next.js) 
  → POST /api/voice/session (Edge Function Vercel)
  → Génère ephemeral token (durée 1 min, session 30 min max)
  → Retourne token au client

Client 
  → Ouvre WebSocket vers Gemini Live API avec token
  → getUserMedia() → capture micro (echoCancellation, noiseSuppression)
  → Downsample 48kHz → 16kHz
  → Float32 → Int16 PCM → Base64
  → send_realtime_input sur WebSocket

Gemini Live 
  → Traitement audio natif
  → Retour audio PCM 24kHz + transcription texte
  → Client joue l'audio via AudioContext + affiche transcription

Client
  → Parse la transcription
  → Extraction des données structurées (LLM side)
  → Mise à jour de l'état local (draft state)
```

**Contraintes à gérer :**
- Session audio limitée à 15 minutes (largement suffisant pour 2–3 min)
- Support du barge-in : le conseiller peut couper l'IA à tout moment
- Tout l'audio généré est watermarké SynthID (transparent pour l'utilisateur)
- Coût estimé : ~0,023$/min → environ 0,05–0,07$ par saisie vocale complète

**Voix par persona :**
Les voix disponibles dans Gemini Live API sont sélectionnées selon le persona actif. La liste exacte est à vérifier contre le catalogue Gemini au moment de l'implémentation (Aoede, Charon, Fenrir, Kore, Puck, Orbit, etc.).

### 8.2 Extraction structurée des données

Après chaque échange vocal, le texte transcrit est envoyé à un **second appel LLM** (Gemini Flash non-live, plus économique) avec le prompt système suivant :

```
Tu es un extracteur de données immobilières. 
Analyse la transcription suivante et retourne UNIQUEMENT un JSON valide.
Les champs possibles sont : contactsTotaux, contactsEntrants, rdvEstimation, 
informationsVente (array {nom, commentaire}), estimationsRealisees, mandatsSignes, 
mandats (array {nomVendeur, type: "simple"|"exclusif"}), rdvSuivi, 
requalificationSimpleExclusif, baissePrix, acheteursChauds (array {nom, commentaire}),
acheteursSortisVisite, nombreVisites, offresRecues, compromisSignes, 
actesSignes, chiffreAffaires, delaiMoyenVente.
Si une valeur est incertaine, ajoute le flag "uncertain: true" sur le champ.
Si non mentionné, n'inclus pas le champ.
Transcription : [TRANSCRIPTION]
```

### 8.3 Persistance — Supabase

**Nouvelle colonne à ajouter :** `draft` (boolean) sur la table `period_results`  
**Nouveau champ :** `voice_session_id` pour traçabilité  
**Nouveau champ :** `last_voice_saisie_date` sur `profiles` (date ISO du dernier lundi traité)

**Table `voice_drafts` (nouvelle) :**
```sql
CREATE TABLE voice_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  period_start DATE NOT NULL,
  partial_data JSONB,
  last_block TEXT, -- "prospection" | "vendeurs" | "acheteurs" | "ventes"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- dimanche soir de la semaine en cours
);
```

**RLS :** L'utilisateur ne peut accéder qu'à ses propres drafts (`user_id = auth.uid()`).

### 8.4 Paramètres vocaux — Supabase

**Table `user_voice_preferences` (nouvelle) :**
```sql
CREATE TABLE user_voice_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  persona TEXT DEFAULT 'neutral_female',
  input_mode TEXT DEFAULT 'audio_full', -- audio_full | text_audio | text_keyboard
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 9. Mapping Complet des Champs

| Champ UI | Clé JSON | Type | Section | Obligatoire |
|---|---|---|---|---|
| Contacts totaux | `contactsTotaux` | number | Prospection | Oui |
| Contacts entrants | `contactsEntrants` | number | Prospection | Oui |
| RDV estimation (prospection) | `rdvEstimation` | number | Prospection | Non |
| Infos de vente | `informationsVente[]` | array | Prospection | Non |
| — Nom vendeur | `.nom` | string | | |
| — Commentaire | `.commentaire` | string | | |
| Estimations réalisées | `estimationsRealisees` | number | Vendeurs | Oui |
| Mandats signés | `mandatsSignes` | number | Vendeurs | Oui |
| — Nom vendeur mandat | `mandats[].nomVendeur` | string | | |
| — Type mandat | `mandats[].type` | "simple"\|"exclusif" | | |
| RDV suivi vendeur | `rdvSuivi` | number | Vendeurs | Non |
| Requalification S→E | `requalificationSimpleExclusif` | number | Vendeurs | Non |
| Baisses de prix | `baissePrix` | number | Vendeurs | Non |
| Acheteurs chauds | `acheteursChauds[]` | array | Acheteurs | Non |
| — Nom acheteur | `.nom` | string | | |
| — Commentaire | `.commentaire` | string | | |
| — Statut | `.statut` | "en_cours"\|"deale" | | |
| Acheteurs sortis en visite | `acheteursSortisVisite` | number | Acheteurs | Non |
| Nombre de visites | `nombreVisites` | number | Acheteurs | Non |
| Offres reçues | `offresRecues` | number | Acheteurs | Non |
| Compromis signés | `compromisSignes` | number | Acheteurs | Non |
| Actes signés | `actesSignes` | number | Ventes | Non |
| Chiffre d'affaires | `chiffreAffaires` | number (€) | Ventes | Non |
| Délai moyen vente | `delaiMoyenVente` | number (jours) | Ventes | Non |

---

## 10. Critères d'Acceptation (Definition of Done)

### Feature — Déclenchement hebdomadaire
- [ ] L'écran plein page s'affiche au premier login du lundi
- [ ] Il ne s'affiche qu'une fois par semaine (même si l'utilisateur se reconnecte)
- [ ] Il ne s'affiche pas si la saisie a déjà été complétée cette semaine
- [ ] Le bouton "Passer" est fonctionnel mais visuellement discret
- [ ] Le ton de l'écran s'adapte au persona sélectionné dans les paramètres

### Feature — Saisie vocale guidée
- [ ] La session démarre en moins de 2 secondes après clic sur "Démarrer"
- [ ] Les 4 blocs (prospection, vendeurs, acheteurs, ventes) sont couverts
- [ ] Le barge-in fonctionne (interruption de l'IA possible)
- [ ] Les champs qualitatifs (noms, commentaires) sont capturés correctement
- [ ] Les alias métier (MS, ME, SSP, AA) sont reconnus et mappés
- [ ] Une session interrompue génère un brouillon repris à la prochaine ouverture
- [ ] Le brouillon expire le dimanche soir
- [ ] La session complète dure ≤ 3 minutes pour un conseiller habitué
- [ ] Le mode texte fonctionne (questions affichées, réponse à l'oral ou clavier)

### Feature — Écran de confirmation
- [ ] Tous les champs extraits sont affichés avec leur valeur
- [ ] Les champs à incertitude sont signalés visuellement
- [ ] Tous les champs sont éditables inline
- [ ] L'enregistrement cumule correctement sur le mois en cours
- [ ] Un message de confirmation s'affiche après enregistrement

### Feature — Import de fichiers
- [ ] Import Excel/CSV : tous les alias du dictionnaire sont reconnus
- [ ] Import PDF : extraction fonctionnelle sur des tableaux simples
- [ ] Import photo : OCR fonctionnel sur tableaux manuscrits ou imprimés propres
- [ ] Les champs non reconnus sont signalés avec suggestion manuelle
- [ ] Le résumé "X champs renseignés / Y à compléter" est affiché

### Feature — Paramètres voix
- [ ] Les 5 personas sont sélectionnables
- [ ] Un extrait audio de chaque persona est écoutable avant sélection
- [ ] Le ton de l'IA en session vocale correspond au persona sélectionné
- [ ] Le mode de saisie (audio full / texte+oral / texte+clavier) est persisté

---

## 11. Phases d'Implémentation

> **Principe :** Le composant `nxt-voice-assistant.tsx` et l'API `saisie-ai/route.ts` sont la base. On enrichit, on n'reconstruit pas.

### Phase 1 — Déclenchement hebdomadaire fullscreen
Durée estimée : 1 session  
**Fichiers impactés :** nouveau composant `MondayGate.tsx`, layout dashboard, table `profiles` (Supabase)

- Créer le composant fullscreen `<MondayGate>` avec détection du lundi + flag `last_voice_saisie_date`
- Intégrer le sélecteur de mode (vocal / import / manuel) dans ce composant
- Stocker `last_voice_saisie_date` sur le profil Supabase (reset automatique chaque lundi)
- Bouton "Passer pour l'instant" : fonctionnel mais visuellement discret
- Le ton du texte lit le persona depuis `user_voice_preferences`

### Phase 2 — Import enrichi (alias + dictionnaire)
Durée estimée : 0,5 session  
**Fichiers impactés :** `src/app/api/saisie-ai/route.ts` (enrichissement du prompt)

- Injecter le dictionnaire d'alias complet dans le prompt système des actions `extract_document` et `extract_image`
- Tester avec des exports CRM réels (Apimo, Hektor, Netty) et ajuster
- Ajouter le résumé "X champs renseignés / Y à compléter" sur l'écran de confirmation existant

### Phase 3 — Conversation guidée structurée
Durée estimée : 1–2 sessions  
**Fichiers impactés :** `nxt-voice-assistant.tsx`, `saisie-ai-client.ts`, `route.ts`

- Remplacer le mode "extraction en une fois" par un **flow conversationnel en 4 blocs séquencés**
- Ajouter la logique de questions de relance (champ manquant → question ciblée)
- Maintenir l'état de conversation dans le composant (`currentBlock`, `extractedSoFar`)
- Ajouter l'action `greet_block` dans l'API pour générer la question d'amorce de chaque bloc selon le persona
- Créer la table `voice_drafts` en Supabase + sauvegarder à chaque fin de bloc
- Logique de reprise au démarrage : détecter draft existant → proposer la reprise

### Phase 4 — Upgrade Gemini 3.1 Flash Live
Durée estimée : 1–2 sessions  
**Fichiers impactés :** nouveau `src/app/api/voice/session/route.ts`, `saisie-ai-client.ts`, `nxt-voice-assistant.tsx`

- Créer l'Edge Function de génération d'ephemeral tokens
- Remplacer Web Speech API par WebSocket Gemini Live (audio PCM 16kHz in, 24kHz out)
- Conserver Web Speech API en fallback si Gemini Live indisponible ou refus micro
- Barge-in : gérer l'interruption propre de l'audio en cours
- Sélection de la voix Gemini selon le persona actif

### Phase 5 — Personas & Paramètres
Durée estimée : 1 session  
**Fichiers impactés :** nouvelle page `src/app/(dashboard)/settings/voice/page.tsx`, `route.ts`

- UI paramètres voix (sélecteur persona + mode de saisie)
- Créer la table `user_voice_preferences` en Supabase
- Injecter le persona dans tous les prompts système de l'API (ton adapté par persona)
- Extrait audio écoutable pour chaque persona avant sélection

### Phase 6 — Polissage & Tests terrain
Durée estimée : 1 session

- Tests mobile (micro, latence WebSocket, barge-in)
- Optimisation durée session (target < 3 minutes)
- Edge cases : connexion coupée, micro refusé, réponse ambiguë ("une douzaine")
- Tests avec données CRM réelles et libellés non-standards

---

## 12. Décisions Finales — Questions Closes

### Q1 — Mapping voix Gemini par persona
**Décision :** Choix à faire à l'implémentation après écoute réelle des voix disponibles.  
**Pour Claude Code :** Implémenter un mapping configurable (`PERSONA_VOICE_MAP`) dans une constante isolée, de façon à ce que Julien puisse ajuster les voix sans toucher à la logique. Structure attendue :
```typescript
const PERSONA_VOICE_MAP: Record<PersonaId, string> = {
  warrior:        "Charon",   // à ajuster après écoute
  sport_coach:    "Fenrir",   // à ajuster après écoute
  kind_coach:     "Zephyr",   // à ajuster après écoute
  neutral_male:   "Orbit",    // à ajuster après écoute
  neutral_female: "Kore",     // à ajuster après écoute
};
```
Les valeurs ci-dessus sont des suggestions par cohérence de profil — elles sont remplaçables en une ligne chacune.

---

### Q2 — Feedback ratio post-saisie + renvoi vers le coaching
**Décision :** OUI. À la fin de chaque saisie validée, l'IA produit un **feedback bref sur les 2–3 ratios les plus impactés** par la semaine écoulée, adapté au ton du persona.

**Règle de sélection des ratios :** On identifie les ratios dont la valeur calculée depuis les données de la semaine s'écarte le plus de l'objectif (en % d'écart), et on en sélectionne 2–3 maximum.

**Exemple (persona Coach sportif, ratio contacts/RDV en rouge) :**
> "Cette semaine, 35 contacts pour 2 RDV estimation — ton ratio est à 17,5. Ton objectif est 15. T'es proche, pousse encore sur la qualification. Et si tu veux travailler ton pitch d'appel, ton coach NXT t'attend dans la section Formation."

**Lien vers NXT Training — mode coaching vocal :**  
Le message de feedback inclut systématiquement **un renvoi vers le mode coaching** de la section Formation, formulé selon le persona. Ce renvoi est un CTA cliquable dans l'interface (texte ou bouton discret), pas juste oral.

Format du CTA :
- Texte : "Raconter mon RDV à mon coach →" (lien vers `/formation` section coaching vocal)
- Visible uniquement si l'utilisateur a accès au module Training (vérification `activeTools`)

**Pour Claude Code :** Le feedback est généré par un appel à l'API `saisie-ai/route.ts` avec une nouvelle action `feedback_ratio`. Les données d'entrée sont les `extractedData` de la session + la catégorie du conseiller (pour comparer aux seuils). La réponse est du texte brut formaté par le persona actif.

---

### Q3 — Visibilité manager sur les saisies
**Décision :** Mise à jour **en temps réel** dans le cockpit manager dès que le conseiller valide son écran de confirmation.

**Comportement attendu :**
- À la validation (`handleSave`), la période mensuelle en cours est mise à jour dans Supabase
- Le cockpit manager lit les `period_results` en temps réel (Supabase Realtime ou revalidation à la prochaine navigation)
- Aucune UI spécifique "saisie en cours" côté manager — le tableau se met simplement à jour avec les nouvelles valeurs cumulées

**Pour Claude Code :** Vérifier que le cockpit manager (`/manager/cockpit`) utilise bien un fetch avec `revalidate` ou une souscription Supabase Realtime sur `period_results`. Si ce n'est pas le cas, ajouter la revalidation au niveau de la page.

---

### Q4 — Email récap hebdomadaire post-saisie
**Décision :** OUI — email ultra-court, déclenché automatiquement après chaque saisie validée.

**Contenu de l'email :**
- Objet : "Ta semaine en 3 chiffres — [Prénom]"
- Corps : 3 KPIs clés de la semaine (les plus significatifs selon l'activité saisie)
- 1 ligne de feedback positif (ton neutre, pas personnalisé au persona)
- 1 lien "Voir mon dashboard →"
- Signature NXT Performance

**Sélection des 3 KPIs :** Prioriser dans l'ordre — actes signés (si > 0), compromis signés, mandats signés, estimations réalisées, contacts totaux. On prend les 3 premiers qui ont une valeur > 0. Si tout est à 0, on affiche contacts / estimations / mandats.

**Pour Claude Code :** Utiliser l'Edge Function `smart-service` existante (Resend API). Créer une nouvelle fonction déclenchée depuis le handler de validation de la saisie. Une fois le domaine `start-academy.fr` vérifié (DNS en attente), l'email sortira de spam.

---

### Q5 — Intégration CRM
**Décision :** Améliorer la reconnaissance des exports manuels uniquement. Pas d'API CRM directe.

**Scope :** Enrichissement du dictionnaire d'alias dans les prompts de `extract_document` et `extract_image`. Tester avec des exports réels des CRMs cibles (Apimo, Hektor, AC3, Netty) et des portails (SeLoger, LeBonCoin) pour couvrir les libellés les plus fréquents.

L'intégration API CRM directe est déclassée en **backlog non daté** — à reconsidérer après le lancement commercial si la demande utilisateur est avérée.

---

*Document produit dans le cadre du projet NXT Performance — Antigravity Dashboard*  
*À transmettre à Claude Code pour implémentation*