# PRD — Refonte Navigation, Dashboard Pilotage, Badges Performance & Onboarding GPS

**Version :** 2.0  
**Date :** Avril 2026  
**Statut :** VALIDÉ — Prêt pour implémentation

---

## 01 — Contexte & Objectifs

Ce PRD consolide les évolutions issues du retour terrain (Seb Tedesco + Jean-Guy Ourmières) et restructure l'expérience utilisateur de NXT Performance autour de 5 chantiers majeurs :

1. Refonte de la navigation et renommage des rubriques
2. Dashboard conseiller = vue pilotage (identique GPS Directeur, à l'échelle individuelle)
3. Nouveaux badges performance mensuels avec progression/régression
4. Bouton "Améliorer ce ratio" dans Mes Ratios de Transformation
5. Intégration GPS dans l'onboarding (conseiller, manager, directeur) + suppression "Mes Objectifs"

---

## 02 — Refonte Navigation & Renommages

### 2.1 Sidebar conseiller

| Avant | Après |
|---|---|
| Tableau de bord | Tableau de bord *(inchangé)* |
| Mes Résultats | Mon Volume d'Activité |
| Ma Performance | Mes Ratios de Transformation |
| Comparaison | Ma Comparaison |
| Ma Formation | Ma Formation *(inchangé)* |
| Mes Objectifs | **Supprimé** |

### 2.2 Sidebar manager

| Avant | Après |
|---|---|
| Tableau de bord | Tableau de bord *(inchangé)* |
| Équipe (volume) | Mon Volume d'Activité |
| Équipe (ratios) | Mes Ratios de Transformation |
| Alertes | Alertes *(inchangé)* |
| GPS Équipe | GPS Équipe *(inchangé)* |
| Ma Comparaison | Ma Comparaison *(inchangé)* |
| Ma Formation | Ma Formation *(inchangé)* |
| Mes Objectifs | **Supprimé** |

### 2.3 Sidebar directeur

| Avant | Après |
|---|---|
| Pilotage Agence | Tableau de bord *(renommé)* |
| Équipe | Mon Volume d'Activité |
| Performance | Mes Ratios de Transformation |
| GPS Directeur | GPS Directeur *(inchangé)* |
| Pilotage Financier | Pilotage Financier *(inchangé)* |
| Formation Collective | Formation Collective *(inchangé)* |
| Mes Objectifs | **Supprimé** |

---

## 03 — Dashboard Conseiller : Vue Pilotage

### 3.1 Principe

Le dashboard conseiller adopte la même vue que le GPS Directeur existant, à l'échelle de la production individuelle du conseiller.

La vue GPS Directeur est déjà implémentée et validée. Il s'agit de la réutiliser en remplaçant les données agence par les données personnelles du conseiller.

### 3.2 Structure de la page

**Onglets de métriques (identiques au GPS Directeur) :**
Estimations | Mandats | % Exclusivité | Visites | Offres | Compromis | Actes | CA Compromis | CA Acte

**Pour chaque onglet :**
- Objectif mensuel (défini dans le GPS onboarding)
- Réalisé ce mois
- Écart (positif en vert, négatif en rouge)
- Projection annuelle
- Barre d'avancement

**Vue d'ensemble individuelle — ce mois :**
Tableau récapitulatif de toutes les métriques sur une ligne avec % d'objectif atteint pour chacune.

### 3.3 Onglets supplémentaires du dashboard

Les onglets existants sont conservés :
- **Vue d'ensemble** — version actuelle
- **Favoris** — personnalisable (voir 3.4)
- **Ce mois** — vue pilotage (nouveau, décrit ci-dessus)
- **Suivi contacts** — inchangé

### 3.4 Favoris personnalisables

L'utilisateur peut choisir ce qu'il affiche dans ses favoris :
- Volumes (contacts, mandats, visites, actes, CA)
- Ratios de transformation
- Les deux

Bouton "Personnaliser" en haut à droite → modale de sélection par drag & drop des KPI cards.

### 3.5 Dashboard manager

Identique au dashboard conseiller mais à l'échelle de l'équipe complète du manager (agrégat de tous ses conseillers).

---

## 04 — Mon Volume d'Activité (ex Mes Résultats)

Aucun changement fonctionnel. Uniquement le renommage.

Contenu inchangé : volumes par semaine / mois / année sur les catégories Prospection / Vendeur / Acheteur / Vente.

---

## 05 — Mes Ratios de Transformation (ex Ma Performance)

### 5.1 Suppressions

- **Score global supprimé** — remplacé par les badges performance (voir section 07)

### 5.2 Vue chiffres / pourcentages

Toggle en haut de page :
- **Vue chiffres** : "10 contacts → 2 RDV estimation" (valeurs absolues)
- **Vue pourcentages** : "20% de transformation contacts → RDV"

Les deux vues affichent les mêmes ratios, juste le format change.

### 5.3 Bouton "Améliorer ce ratio"

Sur chaque card de ratio en état **vigilance** (orange) ou **sous-performance** (rouge) :

Bouton "Améliorer ce ratio →" visible en bas de la card.

**Au clic → card qui s'ouvre/expand en place (pas de navigation) avec :**

- Détail du ratio : valeur actuelle vs objectif vs référence NXT
- Explication simple : "Vous transformez 1 contact sur 10 en RDV. L'objectif est 1 sur 5."
- 4 boutons d'action :
  * 📋 **Voir mon diagnostic** → redirige vers Ma Formation > Diagnostic
  * 🗓️ **Générer un plan 30 jours** → redirige vers Ma Formation > Plan 30 jours
  * 🎯 **M'entraîner** → redirige vers Ma Formation > S'entraîner
  * 📚 **Voir les formations** → redirige vers Ma Formation > Catalogue

L'idée : un seul clic depuis le ratio → accès direct à tous les leviers de progression, sans chercher.

---

## 06 — Ma Formation

### 6.1 Structure des onglets (inchangée)

- Diagnostic
- Plan 30 jours
- S'entraîner
- Financement
- **Catalogue** *(nouveau)*

### 6.2 Onglet Catalogue (nouveau)

Affichage en iframe du catalogue Start Academy :
`https://www.start-academy.fr/consultez-catalogue-formation-immobiliere/`

Si l'utilisateur appartient à un réseau qui a son propre catalogue → afficher le catalogue du réseau à la place (URL définie dans la table networks).

Migration :
```sql
ALTER TABLE networks ADD COLUMN IF NOT EXISTS catalogue_url TEXT;
```

---

## 07 — Badges Performance (nouveaux)

### 7.1 Principe

Ces badges sont **distincts** des 15 badges gamification existants.
Ils sont liés aux ratios de transformation et aux volumes, **mensuels et réversibles** : on les gagne si la performance est atteinte sur la période, on les perd si la performance baisse.

### 7.2 Système de niveaux

Chaque badge a 4 niveaux selon la durée de la performance :

| Niveau | Couleur | Condition |
|---|---|---|
| Bronze | 🥉 | 1 mois consécutif en surperf |
| Argent | 🥈 | 1 trimestre (3 mois) consécutifs |
| Or | 🥇 | 1 semestre (6 mois) consécutifs |
| Diamant | 💎 | 1 an (12 mois) consécutifs |

**Régression :** si la surperf est interrompue, le badge redescend d'un niveau (Diamant → Or → Argent → Bronze → perdu).

### 7.3 Liste des badges performance (non exhaustive)

| Badge | Condition de surperf |
|---|---|
| 🔍 Prospecteur | Taux contacts → RDV > objectif |
| 🏠 Roi de l'Estimation | Taux estimations → mandats > objectif |
| ⭐ Maître de l'Exclusivité | % exclusivité > objectif |
| 👁️ Visiteur Pro | Taux visites → offres > objectif |
| 🤝 Closing Master | Taux offres → compromis > objectif |
| ⚡ Finisher | Taux compromis → actes > objectif |
| 💰 Top CA | CA mensuel > objectif |
| 📈 Régularité | Aucun ratio en sous-perf sur le mois |

### 7.4 Stockage
```sql
CREATE TABLE IF NOT EXISTS performance_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  level TEXT NOT NULL, -- 'bronze' | 'argent' | 'or' | 'diamant'
  consecutive_months INTEGER DEFAULT 1,
  last_awarded_month DATE NOT NULL, -- 1er du mois
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, badge_key)
);
ALTER TABLE performance_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_performance_badges" ON performance_badges
  FOR ALL USING (user_id = auth.uid());
```

### 7.5 Calcul mensuel

Le 1er de chaque mois, pour chaque utilisateur :
- Comparer les résultats du mois précédent aux objectifs
- Pour chaque ratio en surperf : incrémenter consecutive_months, recalculer le level
- Pour chaque ratio en sous-perf : décrémenter d'un niveau ou passer is_active = false
- Déclencher la célébration BadgeCelebration si nouveau niveau atteint

---

## 08 — Ma Comparaison (manager)

### 8.1 Onglets disponibles pour le manager

| Onglet | Contenu |
|---|---|
| Comparer deux conseillers | Sélectionner 2 conseillers de l'équipe → vue côte à côte de leurs métriques |
| Mon équipe vs autre équipe | Comparer l'agrégat de son équipe avec une autre équipe de l'agence |
| Classement NXT | Top 20 prénoms anonymes (identique au conseiller) |
| Comparaison DPI | Radar DPI interactif (identique au conseiller) |

### 8.2 Comparaison deux conseillers

- Sélecteurs : "Conseiller A" + "Conseiller B" (dropdown avec tous les conseillers de l'équipe)
- Métriques côte à côte : volumes + ratios
- Le manager peut aussi sélectionner un conseiller d'une autre équipe de l'agence (pas hors agence)

---

## 09 — Alertes Manager

### 9.1 Consolidation

Supprimer les alertes en doublon (alertes dans le header ET alertes prioritaires séparées).
Une seule liste d'alertes, unifiée.

### 9.2 Aging et code couleur

| Durée non traitée | Couleur | Label |
|---|---|---|
| 0-3 jours | 🟢 Vert | "Nouveau" |
| 4-7 jours | 🟡 Jaune | "Non traité depuis X jours" |
| 8-14 jours | 🟠 Orange | "En attente depuis X jours" |
| 15 jours et + | 🔴 Rouge | "Urgent — X jours sans action" |

### 9.3 Actions sur chaque alerte

- Bouton ✅ "Traité" → alerte archivée
- Si non traitée → label aging mis à jour automatiquement chaque jour
- Vue filtrée : Toutes / Non traitées / Traitées

---

## 10 — GPS dans l'Onboarding

### 10.1 Nouvelle séquence onboarding (tous rôles)
Étape 1 : /onboarding/identite
→ Photo de profil
→ Logo agence
→ Voix coach
→ Import historique performances
Étape 2 : /onboarding/dpi
→ Réalisation du DPI (16 questions, 3 minutes)
→ Skippable avec relance automatique
Étape 3 : /onboarding/gps
→ GPS Conseiller (si rôle conseiller)
→ GPS Manager (si rôle manager)
→ GPS Directeur (si rôle directeur)
→ Skippable
Étape 4 : /dashboard

### 10.2 GPS Conseiller dans l'onboarding

Réutiliser le GPS existant (déjà implémenté) dans une page onboarding.
L'utilisateur définit ses objectifs annuels :
- CA annuel cible
- Nb de mandats cible/mois
- % exclusivité cible
- Etc.

Ces objectifs alimentent directement la vue pilotage du dashboard (section 03).

### 10.3 GPS Manager dans l'onboarding

Même logique que le GPS Conseiller mais à l'échelle équipe :
- Objectif CA équipe
- Objectif mandats équipe
- Répartition par conseiller si souhaité

### 10.4 GPS Directeur dans l'onboarding

Réutiliser le GPS Directeur existant.

### 10.5 Relances automatiques

| Événement | Déclencheur |
|---|---|
| DPI mensuel | 1er lundi du mois (toute l'année) |
| GPS annuel | 1er lundi du mois de janvier uniquement |

Implémentation : cron job Supabase Edge Function ou vérification au login.

### 10.6 Suppression de "Mes Objectifs"

Retirer le lien "Mes Objectifs" de la sidebar pour les rôles conseiller, manager et directeur.
Les objectifs restent visibles dans le dashboard (barre de progression, projection annuelle) mais il n'y a plus de page dédiée accessible depuis la navigation.

---

## 11 — Migrations Supabase Requises
```sql
-- Badges performance mensuels
CREATE TABLE IF NOT EXISTS performance_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  level TEXT NOT NULL,
  consecutive_months INTEGER DEFAULT 1,
  last_awarded_month DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, badge_key)
);
ALTER TABLE performance_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_performance_badges" ON performance_badges
  FOR ALL USING (user_id = auth.uid());

-- Catalogue réseau
ALTER TABLE networks ADD COLUMN IF NOT EXISTS catalogue_url TEXT;

-- Onboarding GPS complété
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS onboarding_gps_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_dpi_completed BOOLEAN DEFAULT FALSE;
```

---

## 12 — Ordre d'Implémentation Recommandé

1. Renommages navigation (rapide, sans risque)
2. Suppression "Mes Objectifs" sidebar
3. Dashboard conseiller → vue pilotage (réutilisation GPS Directeur)
4. Toggle chiffres/pourcentages dans Mes Ratios
5. Bouton "Améliorer ce ratio" avec card expandable
6. Alertes manager consolidées + aging
7. Catalogue Ma Formation (iframe Start Academy)
8. Badges performance mensuels + calcul mensuel
9. GPS dans l'onboarding (étapes DPI + GPS)
10. Comparaison manager (deux conseillers, équipe vs équipe)
11. Migrations Supabase

---

## 13 — Décisions Validées

- Dashboard conseiller = réutilisation GPS Directeur à l'échelle individuelle
- Badges performance réversibles (Bronze → Argent → Or → Diamant, perdable)
- Score global supprimé des Ratios de Transformation
- "Mes Objectifs" supprimé de la navigation (objectifs dans dashboard uniquement)
- GPS dans onboarding : relance DPI tous les 1ers lundis du mois, GPS uniquement en janvier
- Catalogue en iframe (Start Academy ou catalogue réseau)
- Alertes manager : une liste unique avec aging vert/jaune/orange/rouge

## 14 — Points Ouverts

- Nom exact de chaque badge performance (liste exhaustive à compléter)
- Seuils de surperf par profil (Junior / Confirmé / Expert) pour les badges — identiques au système DPI ?
- Catalogue réseau : qui saisit l'URL du catalogue dans le back-office ?
- Notifications push (mobile) pour les alertes manager non traitées ?