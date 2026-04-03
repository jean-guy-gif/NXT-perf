# PRD — Photo de Profil, Logo Agence & Thème Dynamique

**Version :** 1.0  
**Date :** Avril 2026  
**Statut :** VALIDÉ — Prêt pour implémentation

---

## 01 — Contexte & Objectifs

### 1.1 Problème à résoudre

L'expérience utilisateur actuelle de NXT Performance présente deux lacunes à l'onboarding :

- Aucune photo de profil n'est demandée à la création de compte. Les classements exportables n'affichent que des initiales, sans identité visuelle forte.
- Aucune identité d'agence n'est configurée. Chaque utilisateur voit la même interface NXT générique, sans lien visuel avec son agence ou son réseau.

### 1.2 Objectifs

- Collecter la photo de profil et le logo d'agence en une seule étape d'onboarding fluide.
- Afficher la photo de profil dans la navbar et dans les exports JPEG des classements.
- Appliquer automatiquement les couleurs de l'agence à l'interface dès la connexion.
- Maintenir des performances optimales : compression côté client, pas de stockage lourd côté serveur.

> **Note :** Ce PRD couvre l'intégralité du flux : page onboarding unifiée, compression media, stockage Supabase, extraction de couleur, application du thème CSS, et exports JPEG.

---

## 02 — Page Onboarding Unifiée

### 2.1 Déclencheur & route

Après la création de compte réussie, avant la redirection vers /dashboard, l'utilisateur est redirigé vers :
/onboarding/identite

Cette étape est commune à tous les rôles. Elle ne se présente qu'une seule fois (marquée `onboarding_completed = true` dans le profil après passage).

### 2.2 Layout de la page

Une seule page avec deux zones côte à côte :

| Zone Gauche | Zone Droite |
|---|---|
| **Photo de profil** | **Logo de l'agence** |
| Visible par tous les rôles sans exception | Visible uniquement si l'utilisateur est rattaché à une agence. Masquée pour les agents solo et coaches non rattachés. |
| Preview : aperçu circulaire (comme dans la navbar) | Preview : aperçu carré sur fond blanc (comme dans l'UI agence) |

**En bas de page :**
- CTA principal : **« Accéder à mon dashboard »**
- Lien discret en dessous : *« Passer cette étape »* — skippe les deux zones en même temps

### 2.3 Règles de visibilité de la zone logo

| Rôle | Zone logo agence affichée ? |
|---|---|
| Conseiller rattaché à une agence | ✅ Oui |
| Manager rattaché à une agence | ✅ Oui |
| Directeur (créateur de l'agence) | ✅ Oui |
| Coach (externe, non rattaché) | ❌ Non — zone masquée |
| Agent solo (aucune agence) | ❌ Non — zone masquée |

### 2.4 Comportement logo multi-utilisateurs

Plusieurs utilisateurs de la même agence peuvent uploader un logo. Règle : **last-write-wins**. Le nouveau logo remplace l'ancien dans le bucket et dans `agencies.logo_url`. Les couleurs sont réextractées automatiquement.

### 2.5 Marquage onboarding complété

À la fin de l'étape (CTA ou skip), mettre `onboarding_completed = true` dans le profil utilisateur. Ce flag empêche de re-présenter la page à chaque connexion.

---

## 03 — Compression & Upload Media

### 3.1 Contraintes communes (photo profil et logo agence)

La compression est effectuée **entièrement côté client**, avant tout envoi au serveur.

| Paramètre | Valeur |
|---|---|
| Résolution max | 400 × 400 px (centré, recadré si nécessaire) |
| Format de sortie | WebP |
| Qualité initiale | 0.82 |
| Taille max après compression | 150 Ko |
| Comportement si > 150 Ko | Réduire la qualité par paliers de 0.05 jusqu'à passer sous 150 Ko |
| Qualité plancher | 0.50 (en dessous, afficher un avertissement à l'utilisateur) |
| Formats d'entrée acceptés | JPG, PNG, WebP, HEIC, GIF (première frame) |
| Taille max fichier d'entrée | 10 Mo (rejeté avec message d'erreur si dépassé) |

### 3.2 Preview temps réel

- Photo profil : preview circulaire — représente exactement l'affichage dans la navbar (40×40px) et dans les classements.
- Logo agence : preview carré sur fond blanc — représente l'affichage dans le header du dashboard.
- La preview se met à jour immédiatement après compression, sans rechargement de page.

### 3.3 Stockage Supabase Storage

| Élément | Photo profil | Logo agence |
|---|---|---|
| Bucket | `avatars` | `logos` |
| Path | `{user_id}/avatar.webp` | `{agency_id}/logo.webp` |
| Visibilité bucket | public: true | public: true |
| Champ DB mis à jour | `profiles.avatar_url` | `agencies.logo_url` |
| Policy INSERT/UPDATE | `auth.uid()` uniquement | Tout membre de l'agence |
| Policy SELECT | Public (URL publique) | Public (URL publique) |
| Policy DELETE | Non exposé côté client | Non exposé côté client |

---

## 04 — Dashboard Post-Onboarding

### 4.1 Photo de profil dans la navbar

Après l'onboarding, la photo de profil remplace le logo NXT Performance en haut à gauche de la sidebar/navbar.

| État | Affichage |
|---|---|
| Photo de profil uploadée | Image circulaire 40×40px — remplace le logo NXT |
| Pas de photo (skip ou premier login) | Initiales de l'utilisateur sur fond coloré (comportement actuel) |
| Photo en cours de chargement | Skeleton loader circulaire 40×40px |

> **Important :** La photo remplace le logo NXT uniquement dans la zone utilisateur en haut à gauche. Le nom « NXT Performance » dans le titre de l'onglet ou le favicon n'est pas impacté.

### 4.2 Export JPEG des classements

- Colonne avatar : photo circulaire 40×40px à gauche du nom.
- Si pas de photo : initiales sur fond coloré (comportement actuel conservé).
- Export via html2canvas (ou équivalent déjà installé).
- Format export : JPEG, qualité 0.92, fond blanc.
- Résolution export : 2x pour rendu net sur écrans retina.

---

## 05 — Extraction Couleur & Thème Dynamique

### 5.1 Extraction de la couleur dominante

Dès qu'un logo agence est uploadé et compressé, la couleur dominante est extraite côté client via la librairie **colorthief**.
npm install colorthief

- Extraire la couleur dominante (`getColor`) et une palette de 2 couleurs (`getPalette`).
- Couleur primaire = couleur dominante du logo.
- Couleur secondaire = couleur complémentaire calculée (rotation de 30° sur la roue HSL).

> **Note :** L'extraction se fait sur l'image compressée (WebP 400×400) déjà disponible dans le navigateur — aucun appel serveur supplémentaire requis.

### 5.2 Vérification contraste WCAG AA

Vérifier le ratio de contraste sur fond blanc (#FFFFFF) avant d'appliquer les couleurs.

| Cas | Action |
|---|---|
| Ratio ≥ 4.5:1 (WCAG AA) | Appliquer la couleur telle quelle |
| Ratio < 4.5:1 | Assombrir par paliers de 10% en luminosité HSL jusqu'à atteindre 4.5:1 |
| Impossible d'atteindre 4.5:1 | Fallback palette NXT par défaut (#6C5CE7) |
| Extraction échoue (logo corrompu, transparent) | Fallback palette NXT par défaut (#6C5CE7) |
| Logo non fourni (skip ou pas encore uploadé) | Fallback palette NXT par défaut (#6C5CE7) |

### 5.3 Sauvegarde en base

- `agencies.primary_color` (VARCHAR 7) — ex : `#2563EB`
- `agencies.secondary_color` (VARCHAR 7) — ex : `#1D4ED8`
- Sauvegardé via upsert à chaque upload de logo.
- Override manuel possible depuis **Paramètres > Mon Agence** : color picker libre (avec même vérification contraste).

### 5.4 Application du thème au dashboard

Au login, les couleurs de l'agence sont injectées comme CSS custom properties sur l'élément `:root`, avant le premier rendu.
```css
:root {
  --agency-primary:   #2563EB;   /* couleur extraite ou fallback NXT */
  --agency-secondary: #1D4ED8;   /* couleur secondaire calculée */
}
```

Éléments UI remplacés par `--agency-primary` :

| Élément UI | Propriété CSS remplacée |
|---|---|
| Sidebar — bordure item actif | `border-left-color` |
| Sidebar — icône item actif | `color` |
| Boutons primaires | `background-color` |
| Boutons primaires hover | `background-color` (assombri 10%) |
| Headers de section | `color` |
| Badges et indicateurs | `background-color` |
| Barre de progression DPI | `background-color` |
| Accent radar chart (axe actif) | `stroke / fill` |

### 5.5 Périmètre d'application du thème

| Rôle | Voit le thème de son agence ? |
|---|---|
| Conseiller | ✅ Oui — thème de l'agence à laquelle il est rattaché |
| Manager | ✅ Oui — thème de son agence |
| Directeur | ✅ Oui — thème de son agence (ou agence principale si multi-agences) |
| Coach | ❌ Non — palette NXT par défaut (pas d'agence) |
| Agent solo | ❌ Non — palette NXT par défaut |
| Réseau | ❌ Non — palette NXT par défaut (le réseau n'impose pas sa charte) |

> **Validé :** Deux agences différentes d'un même réseau peuvent avoir des couleurs totalement différentes. Le réseau n'impose pas sa charte graphique aux agences.

---

## 06 — Migrations Supabase Requises

### 6.1 Modifications de tables
```sql
-- Table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Table agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6C5CE7',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#4A3FB5';
```

### 6.2 Buckets Storage

- Bucket `avatars` — public: true — policy RLS : INSERT/UPDATE par `auth.uid()` owner uniquement.
- Bucket `logos` — public: true — policy RLS : INSERT/UPDATE par tout membre de l'agence (via `agency_id` dans le path), SELECT public.
- Aucun DELETE exposé côté client sur les deux buckets.

---

## 07 — Plan de Tests

### 7.1 Onboarding & Upload

- Page `/onboarding/identite` s'affiche après inscription.
- Zone logo masquée pour un agent solo ou un coach non rattaché.
- Zone logo visible pour un conseiller, manager ou directeur rattaché.
- Upload photo → compression WebP < 150Ko → preview circulaire correcte.
- Upload logo → compression WebP < 150Ko → preview carré sur fond blanc.
- Fichier > 10Mo → message d'erreur, pas d'upload.
- CTA « Accéder à mon dashboard » → redirection /dashboard.
- « Passer cette étape » → redirection /dashboard sans upload.
- `onboarding_completed = true` après CTA ou skip.
- Page non re-présentée à la connexion suivante (flag vérifié).

### 7.2 Dashboard — Photo & Navbar

- Photo de profil apparaît en haut à gauche à la place du logo NXT.
- Sans photo → initiales sur fond coloré (comportement actuel inchangé).
- Export JPEG classement → avatars circulaires présents.
- Export JPEG sans photo → initiales affichées.

### 7.3 Thème Dynamique

- Logo uploadé → couleur extraite via colorthief → CSS custom properties injectées.
- Couleur insuffisante en contraste → assombrissement automatique jusqu'à WCAG AA.
- Logo absent ou skip → fallback palette NXT (#6C5CE7) appliqué.
- Deux utilisateurs de deux agences différentes → deux thèmes différents en session.
- Override manuel (color picker) → couleur sauvegardée et appliquée immédiatement.
- Coach ou agent solo → palette NXT par défaut, aucun thème agence.

### 7.4 Multi-utilisateurs même agence

- Utilisateur A uploade logo → `logo_url` mis à jour.
- Utilisateur B uploade nouveau logo → `logo_url` remplacé (last-write-wins).
- Les deux utilisateurs voient le nouveau logo et les nouvelles couleurs à la prochaine connexion.

---

## 08 — Décisions Validées & Points Ouverts

### 8.1 Décisions définitivement validées

- Page onboarding unifiée : photo profil (gauche) + logo agence (droite) sur une seule page.
- Zone logo conditionnelle : masquée si pas d'agence rattachée (coach, agent solo).
- Compression client : WebP, 400×400px max, 150Ko max, qualité plancher 0.50.
- Photo profil remplace le logo NXT en haut à gauche du dashboard.
- Thème dynamique via CSS custom properties injectées au login.
- Fallback systématique : palette NXT (#6C5CE7 / #4A3FB5) si aucun logo ou extraction échouée.
- Réseau n'impose pas sa charte aux agences — chaque agence a ses propres couleurs.
- Last-write-wins pour le logo agence (plusieurs uploadeurs possibles).
- Export JPEG classements : avatars circulaires 40px, fond blanc, qualité 0.92.

### 8.2 Points non tranchés — à décider en phase UX/Dev

- Notification aux autres membres de l'agence quand le logo est remplacé : oui ou non ?
- Le directeur multi-agences voit le thème de quelle agence ? Agence principale à définir, ou sélecteur.
- Possibilité de supprimer sa photo de profil depuis les paramètres : V1 ou V2 ?
- Animation de transition lors de l'injection du thème (éviter le flash de la couleur NXT avant le thème agence).

---

*PRD v1.0 — Validé avril 2026 — Prochaine révision : phase implémentation*