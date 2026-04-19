# PRD — Système de Comptes, Rôles & Rattachement

**Version :** 1.0  
**Date :** Avril 2026  
**Statut :** VALIDÉ — Prêt pour implémentation

---

## 01 — Contexte & Objectifs

### 1.1 Problème à résoudre

NXT Performance est utilisé par des professionnels de l'immobilier aux structures très variées : agents solo, agents en agence, managers d'équipe, directeurs d'agence multi-équipes, coaches externes, et pilotes de réseau. Sans un système de rattachement structuré, il est impossible de :

- Consolider automatiquement les performances d'une équipe ou d'une agence
- Donner à chaque acteur la visibilité exacte à laquelle il a droit — ni plus, ni moins
- Permettre à un manager ou un directeur de piloter sans ressaisie manuelle

### 1.2 Objectifs du PRD

- Définir l'architecture complète des rôles et de leur hiérarchie
- Spécifier le mécanisme de rattachement entre entités (code d'invitation)
- Définir les règles de visibilité pour chaque rôle
- Couvrir les cas hybrides (multi-rôles, multi-agences, coach externe)
- Poser les règles de cycle de vie des comptes (création, modification, départ)

> **Note :** Ce document constitue la référence de conception pour l'implémentation du système d'authentification, de la base de données (Supabase RLS) et de la logique de visibilité des dashboards.

---

## 02 — Architecture des Rôles

Chaque utilisateur se positionne dans l'un des cinq rôles suivants lors de la création de son compte. Ce rôle peut évoluer dans le temps (voir section 07).

### CONSEILLER

L'agent de terrain. Il saisit ses activités, consulte ses propres indicateurs de performance et son DPI. Il ne voit jamais les données des autres membres de l'agence.

- Peut être rattaché à un manager (via CODE ÉQUIPE)
- Peut être rattaché directement à un directeur (via CODE AGENCE, si pas de manager intermédiaire)
- Peut être coaché par un coach externe (en entrant un CODE COACH)
- Ne peut appartenir qu'à une seule structure à la fois

### MANAGER (= CHEF DE LIGNÉE)

Pilote une équipe de conseillers. Le rôle « chef de lignée » (réseau mandataire) bénéficie des mêmes permissions et du même niveau d'accès que le manager classique. Deux sous-profils coexistent :

- **Manager producteur :** il est à la fois manager et conseiller actif. Il saisit sa propre production ET pilote son équipe.
- **Manager non producteur :** il pilote uniquement, sans saisie de production personnelle.

Dans l'interface, le switch entre les vues (vue manager / vue conseiller) se fait via les boutons de navigation existants en haut de page.

### DIRECTEUR

Pilote une ou plusieurs agences, chacune composée d'un ou plusieurs managers et de leurs équipes. Deux sous-profils :

- **Directeur producteur :** il a sa propre activité de conseiller en plus de son rôle de direction.
- **Directeur non producteur :** il pilote uniquement (vue agence + équipes). Aucun bloc de saisie dans son espace.

Un directeur peut superviser plusieurs agences simultanément (ex : directeur régional). Chaque agence possède son propre CODE AGENCE.

### COACH

Acteur externe à toute agence. Il peut coacher des individus de rôles différents et dans des structures différentes, sans appartenir à aucune d'elles. Sa visibilité est dynamique : elle s'adapte au rôle de chaque personne coachée (voir section 05).

- Le coach génère son propre CODE COACH depuis son espace.
- La personne coachée entre ce code depuis son espace pour initier la relation.
- La personne coachée peut supprimer ce rattachement à tout moment — le coach perd alors immédiatement la visibilité.
- Un coach peut coacher simultanément des conseillers, managers et directeurs sans limite de nombre.

### RÉSEAU

Entité faîtière (ex : Century 21 France, IAD, Orpi). Le compte Réseau est créé manuellement par NXT admin. Le responsable réseau reçoit un CODE RÉSEAU unique qu'il transmet aux directeurs d'agence de son réseau.

- Le compte Réseau dispose d'une vue consolidée de toutes les agences qui lui sont rattachées.
- Le Réseau ne saisit jamais de données de production — il pilote uniquement.

---

## 03 — Hiérarchie des Structures

### 3.1 Modèle hiérarchique
RÉSEAU  (ex : Century 21 France)
└── AGENCE 1  (ex : Century 21 Nice Centre)
├── MANAGER A  →  Équipe A
│         ├── Conseiller José
│         └── Conseiller Marie
└── MANAGER B  →  Équipe B
├── Conseiller Ahmed
└── Conseiller Sophie
└── AGENCE 2  (ex : Century 21 Nice Ouest)  [même directeur possible]
└── ...

Un directeur peut superviser plusieurs agences. Chaque agence est une entité distincte avec son propre CODE AGENCE. Le directeur voit l'agrégat de toutes ses agences dans son tableau de bord.

---

## 04 — Mécanisme de Rattachement par Codes

### 4.1 Principe général

Le rattachement entre entités repose exclusivement sur des codes d'invitation à usage multiple. Ce système est :

- **Frictionless :** aucune validation manuelle requise — le code seul suffit à créer le lien.
- **Asynchrone :** le conseiller peut s'inscrire à n'importe quelle heure sans dépendre de la disponibilité du manager.
- **Descendant :** c'est toujours la structure du dessus qui génère le code ; c'est toujours l'entité du dessous qui le saisit.
- **Révocable pour la relation de coaching uniquement.**

### 4.2 Les quatre types de codes

| Type de code | Qui le génère | Qui le saisit | Lien créé |
|---|---|---|---|
| Code Réseau | NXT admin | Le Directeur lors de la création agence | Réseau → Agences |
| Code Agence | Le Directeur lors de la création agence | Le Manager lors de son inscription | Directeur → Managers |
| Code Équipe | Le Manager lors de la création équipe | Le Conseiller lors de son inscription | Manager → Conseillers |
| Code Coach | Le Coach après création compte | La personne coachée depuis son espace | Coach → Coachés (révocable) |

### 4.3 Flux de rattachement pas à pas

**Étape 1 — NXT crée le compte Réseau**
- NXT admin crée le compte Century 21 France dans le back-office.
- Le système génère un CODE RÉSEAU unique (ex : RESEAU-C21-FR-8X3K).
- NXT transmet ce code au responsable national Century 21.

**Étape 2 — Le Directeur crée son agence**
- Le directeur s'inscrit, choisit le rôle « Directeur ».
- Il renseigne les informations de l'agence (nom, ville, réseau d'appartenance).
- Il entre le CODE RÉSEAU → l'agence est automatiquement rattachée au réseau.
- Le système génère un CODE AGENCE unique pour cette agence (ex : C21-NICE-4K2X).
- Si le directeur pilote plusieurs agences, il répète l'opération — chaque agence génère son propre code.

**Étape 3 — Le Manager rejoint l'agence**
- Le manager s'inscrit, choisit le rôle « Manager ».
- Il entre le CODE AGENCE transmis par son directeur.
- Il est immédiatement rattaché au directeur et à l'agence.
- Le système génère un CODE ÉQUIPE unique pour ce manager (ex : TEAM-DUPONT-7Y9Z).

**Étape 4 — Le Conseiller rejoint une équipe**
- Le conseiller s'inscrit, choisit le rôle « Conseiller ».
- Il entre le CODE ÉQUIPE transmis par son manager.
- Il est immédiatement rattaché au manager, et par transitivité à l'agence et au réseau.
- Cas sans manager intermédiaire : le conseiller entre le CODE AGENCE directement. Il est rattaché au directeur sans passer par un manager.

**Étape 5 — Le Coach est invité par la personne coachée**
- Le coach s'inscrit, choisit le rôle « Coach » — le système génère son CODE COACH.
- Le conseiller / manager / directeur concerné entre ce CODE COACH depuis son espace personnel.
- Le lien est créé immédiatement. La personne coachée peut le supprimer à tout moment.

### 4.4 Format des codes

- **CODE RÉSEAU :** `RESEAU-[SIGLE]-[4 car. alphanumériques]` — ex : `RESEAU-C21-8X3K`
- **CODE AGENCE :** `[SIGLE]-[VILLE ABRÉGÉE]-[4 car.]` — ex : `C21-NICE-4K2X`
- **CODE ÉQUIPE :** `TEAM-[NOM MANAGER ABRÉGÉ]-[4 car.]` — ex : `TEAM-DUPONT-7Y9Z`
- **CODE COACH :** `COACH-[4 car. aléatoires]` — ex : `COACH-9M2P`

> **Important :** Les codes sont à usage multiple (plusieurs personnes peuvent entrer le même code). Ils ne sont pas des mots de passe — ils ont vocation à être partagés au sein du bon périmètre. Unicité garantie par contrainte UNIQUE en base.

---

## 05 — Règles de Visibilité

### 5.1 Matrice de visibilité

| Rôle | Ses propres données | Équipe directe | Toute l'agence | Tout le réseau | Multi-agences |
|---|---|---|---|---|---|
| Conseiller | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manager (producteur) | ✅ | ✅ ses conseillers | ❌ | ❌ | ❌ |
| Manager (non prod.) | ❌ | ✅ ses conseillers | ❌ | ❌ | ❌ |
| Directeur (producteur) | ✅ | ✅ tous managers + conseillers | ✅ | ❌ | ✅ |
| Directeur (non prod.) | ❌ | ✅ tous managers + conseillers | ✅ | ❌ | ✅ |
| Réseau | ❌ | ❌ | ✅ toutes agences | ✅ | — |
| Coach → Conseiller | ❌ | ✅ ce conseiller | ❌ | ❌ | ❌ |
| Coach → Manager | ❌ | ✅ ce manager + son équipe | ❌ | ❌ | ❌ |
| Coach → Directeur | ❌ | ✅ tous managers + conseillers | ✅ | ❌ | ❌ |

### 5.2 Visibilité Coach — détail par cible

| Cible coachée | Ce que voit le coach pour cette cible |
|---|---|
| Conseiller | Données personnelles du conseiller uniquement (production, KPIs, DPI) |
| Manager producteur | Données personnelles du manager (sa production) + données de toute son équipe individuellement |
| Manager non producteur | Données de toute l'équipe du manager individuellement |
| Directeur producteur | Données personnelles du directeur + tous managers + tous conseillers + agrégat agence |
| Directeur non producteur | Tous managers + tous conseillers + agrégat agence |

La visibilité d'un coach est dynamique et indépendante pour chaque relation de coaching.

### 5.3 Règle de visibilité Manager multi-équipes

Chaque manager ne voit que les conseillers de sa propre équipe. Dans une agence avec plusieurs managers, le Manager A ne voit jamais les conseillers du Manager B. Seul le directeur a la vision croisée de toutes les équipes.

**Exemple validé :** agence avec Manager Dupont (José + Marie) et Manager Martin (Ahmed + Sophie). Le directeur voit les 4 conseillers et les 2 managers. Chaque manager ne voit que ses 2 conseillers.

---

## 06 — Rôles Hybrides & Switch de Vue

### 6.1 Principe du switch de vue

Une même personne peut cumuler plusieurs casquettes. Dans ce cas, l'interface ne fusionne pas les données en un seul écran : l'utilisateur switche entre ses différentes vues grâce aux boutons de navigation existants en haut de page.

| Profil hybride | Vues disponibles |
|---|---|
| Manager producteur | Vue Conseiller (sa propre production) + Vue Manager (son équipe) |
| Directeur producteur | Vue Conseiller (sa propre production) + Vue Directeur (managers + équipes + agence) |
| Directeur + Manager + producteur | Vue Conseiller + Vue Manager (son équipe directe) + Vue Directeur (toute l'agence) |
| Chef de lignée (réseau mandataire) | Identique au Manager producteur — mêmes vues, même logique |

---

## 07 — Cycle de Vie des Comptes

### 7.1 Création de compte

Tous les comptes (sauf Réseau) sont créés en self-service. Le flux est identique pour chaque rôle :

- L'utilisateur renseigne : email, mot de passe, prénom, nom, rôle principal.
- Si le rôle nécessite un rattachement (tous sauf Coach et Réseau), il entre le code correspondant à son niveau.
- Le compte est activé immédiatement — aucune validation manuelle.
- L'utilisateur reçoit un email de bienvenue (Resend / Edge Function Supabase).

### 7.2 Évolution de rôle

Un utilisateur peut changer de rôle dans le temps. Règles :

- L'historique de données est toujours conservé et reste accessible.
- Le changement de rôle est effectué par l'utilisateur depuis ses paramètres, ou par un admin NXT.
- Exemple : un conseiller devient manager. Son historique de saisie reste accessible dans sa vue Conseiller. Sa nouvelle vue Manager affiche son équipe.
- Le nouveau rôle génère les codes associés automatiquement (ex : conseiller → manager génère un CODE ÉQUIPE).

### 7.3 Départ d'une structure

Quand un utilisateur quitte une agence ou est détaché d'un manager :

- Les données historiques restent la propriété de l'utilisateur. Il continue de les voir dans son espace personnel.
- L'ancien manager et l'ancien directeur perdent immédiatement la visibilité sur cet utilisateur.
- Les agrégats historiques de l'agence (ex : bilan 2024) sont figés à la date du départ et ne sont pas recalculés.

> **Principe :** le conseiller est propriétaire de sa performance. L'agence est propriétaire de ses agrégats historiques. Les deux coexistent sans conflit.

### 7.4 Relation de coaching — révocation

La relation coach / coaché est la seule qui peut être supprimée unilatéralement par la personne coachée :

- La personne coachée accède à la liste de ses coaches actifs depuis ses paramètres.
- Elle supprime le lien en un clic.
- Le coach perd immédiatement toute visibilité sur cette personne.
- Notification de suppression au coach : à décider en phase UX.

---

## 08 — Spécifications Techniques

### 8.1 Modèle de données — tables clés

| Table | Champs principaux | Rôle dans le système |
|---|---|---|
| `networks` | id, name, code_reseau, created_by_nxt | Entités réseau. Créées par NXT admin. code_reseau = clé de rattachement des agences. |
| `agencies` | id, name, director_user_id, network_id, code_agence | Une agence par entrée. Rattachée à un réseau via network_id. |
| `teams` | id, name, manager_user_id, agency_id, code_equipe | Une équipe par manager. Rattachée à une agence. |
| `profiles` | id (= auth.uid), role, sub_role, agency_id, team_id, is_productive | Profil étendu de chaque utilisateur. sub_role = 'chef_lignee' si applicable. is_productive = booléen. |
| `coaching_links` | id, coach_user_id, coachee_user_id, created_at, revoked_at | Liens coach/coaché. revoked_at = NULL si actif. Jamais supprimé physiquement. |
| `agency_directors` | agency_id, director_user_id | Table de liaison pour les directeurs multi-agences (1 directeur → N agences). |

### 8.2 Logique RLS (Row Level Security)

Les politiques Supabase RLS doivent implémenter les règles suivantes :

- Un utilisateur voit ses propres lignes (`user_id = auth.uid()`).
- Un manager voit les lignes des profils dont `team_id` correspond à son équipe.
- Un directeur voit les lignes des profils dont `agency_id` correspond à l'une de ses agences (via `agency_directors`).
- Un réseau voit les lignes agrégées de toutes les agences rattachées à son `network_id`.
- Un coach voit les lignes des profils pour lesquels il existe un `coaching_link` actif (`revoked_at IS NULL`).

> **Note :** Les fonctions SECURITY DEFINER existantes (`get_my_org_id()`, `get_my_role()`) devront être étendues ou complétées pour supporter cette nouvelle hiérarchie multi-niveaux.

### 8.3 Génération des codes

Les codes sont générés côté serveur (Edge Function ou API Route Next.js) au moment de la création de l'entité. Format : préfixe lisible + suffixe aléatoire alphanumérique en majuscules (4 caractères). Unicité garantie par contrainte UNIQUE en base. En cas de collision, régénération automatique.

---

## 09 — Flux Utilisateur Clés

### 9.1 Inscription d'un conseiller avec rattachement manager

1. Accès à `/inscription`
2. Saisie : prénom, nom, email, mot de passe
3. Choix du rôle : Conseiller
4. Champ : « Code de mon équipe » (CODE ÉQUIPE du manager)
5. Validation → compte créé → rattachement automatique → email de bienvenue → redirection `/dashboard` (vue Conseiller)

### 9.2 Inscription d'un directeur avec création d'agence

1. Accès à `/inscription`
2. Saisie : prénom, nom, email, mot de passe
3. Choix du rôle : Directeur
4. Choix du sous-profil : Producteur / Non producteur
5. Formulaire agence : nom de l'agence, ville
6. Champ optionnel : « Code réseau » (si appartenance à un réseau)
7. Validation → agence créée → CODE AGENCE généré et affiché → email de bienvenue → redirection `/dashboard` (vue Directeur)

### 9.3 Activation d'une relation de coaching

1. La personne coachée accède à Paramètres > Coaching
2. Saisie du CODE COACH fourni par le coach
3. Validation → lien créé immédiatement → le coach accède à la visibilité correspondante
4. La personne coachée voit la liste de ses coaches actifs et peut révoquer chaque lien individuellement

### 9.4 Accès au code par le manager / directeur

1. Depuis Paramètres > Mon équipe (manager) ou Paramètres > Mon agence (directeur)
2. Affichage du code avec bouton « Copier »
3. Option : régénérer un nouveau code (l'ancien est invalidé — les membres existants ne sont pas décrochés)

---

## 10 — Décisions Validées & Points Ouverts

### 10.1 Décisions définitivement validées

- Mécanisme de rattachement : codes d'invitation uniquement, sans validation manuelle.
- Hiérarchie : Réseau > Agence > Équipe > Conseiller.
- Un conseiller n'appartient qu'à une seule structure à la fois.
- Chef de lignée = Manager avec permissions identiques.
- Rôles hybrides gérés par switch de vue (boutons de navigation existants).
- Départ d'une structure : données propriété du conseiller, visibilité révoquée, agrégats figés.
- Relation de coaching révocable par la personne coachée uniquement.
- Un directeur peut superviser plusieurs agences (via `agency_directors`).
- Compte Réseau créé manuellement par NXT admin.
- Changement de rôle possible, avec conservation intégrale de l'historique.

### 10.2 Points non tranchés — à décider en phase UX/Dev

- Notification au coach lors de la révocation d'un lien : oui ou non ?
- Invalidation du code lors d'un changement de code : les membres existants sont-ils décrochés ?
- Interface admin NXT pour gérer les comptes Réseau : fonctionnalités minimales requises ?
- Gestion des agents sans structure (agent solo sans manager ni directeur) : flux d'inscription simplifié à définir.
- Limite maximale de conseillers par équipe / agences par directeur : à définir selon contraintes produit.

---

*PRD v1.0 — Validé avril 2026 — Prochaine révision : phase d'implémentation Supabase*