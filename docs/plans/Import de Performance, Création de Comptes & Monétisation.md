# PRD — Import de Performance, Création de Comptes & Monétisation

**Version :** 1.0  
**Date :** Avril 2026  
**Statut :** VALIDÉ — Prêt pour implémentation

---

## 01 — Contexte & Objectifs

### 1.1 Problème à résoudre

Un utilisateur qui s'inscrit sur NXT Performance a souvent déjà des données de performance existantes : tableau Excel, PDF de résultats, captures d'écran de son logiciel agence, ou fichiers annuels. Sans mécanisme d'import, il doit tout ressaisir manuellement — frein majeur à l'adoption.

Pour les managers et directeurs, la problématique est double : importer leurs propres données ET créer les comptes de leurs conseillers en masse, sans friction.

### 1.2 Objectifs

- Permettre à tout utilisateur d'importer ses données de performance dès l'onboarding
- Supporter Excel, PDF et images (captures d'écran) via extraction IA
- Permettre aux managers/directeurs d'importer les données de leur équipe et de créer les comptes en masse
- Implémenter le modèle de monétisation : dashboard gratuit, fonctionnalités avancées payantes
- Rendre le flux complet démontrable en mode démo DEMO2024

---

## 02 — Flux Conseiller : Import de Performance

### 2.1 Déclencheur

Dans la page `/onboarding/identite`, après les zones photo + logo + voix coach, ajouter une quatrième zone :

**« Importer ma performance »** avec sous-titre *« Optionnel — Excel, PDF ou capture d'écran »*

### 2.2 Formats acceptés

- Excel (.xlsx, .xls, .csv)
- PDF
- Images (JPG, PNG, HEIC, WebP — captures d'écran de logiciels agence)
- Plusieurs fichiers simultanément (multi-années)

### 2.3 Pipeline d'extraction IA
Fichier uploadé
→ Si Excel/CSV : parser les colonnes via SheetJS
→ Si PDF : extraire le texte via pdf-parse
→ Si image : envoyer à OpenRouter (google/gemini-flash-1.5 vision)
→ Prompt IA : extraire les métriques immobilières standards
→ Résultat structuré JSON
→ Afficher pour validation utilisateur
→ Si données manquantes : demander les champs manquants
→ Valider → enregistrer en base

### 2.4 Métriques extraites

L'IA doit reconnaître et mapper ces champs, peu importe le format source :

| Métrique | Aliases reconnus |
|---|---|
| Contacts entrants | prospects, leads, nouveaux contacts, appels entrants |
| Mandats signés | mandats, listings, signatures mandat |
| Visites réalisées | visites, RDV vendeur, RDV acquéreur |
| Offres reçues | offres, propositions, OAI |
| Compromis signés | avant-contrats, promesses, SCC |
| Actes signés | actes authentiques, ventes définitives |
| CA encaissé | chiffre d'affaires, honoraires, commission |
| Période | mois, trimestre, année, semaine |

### 2.5 Gestion des données manquantes

Si l'IA ne peut pas extraire certains champs :
- Afficher un formulaire de complétion avec uniquement les champs manquants pré-identifiés
- Label : "Nous n'avons pas pu lire ces données — complétez-les manuellement"
- Les champs reconnus sont pré-remplis et éditables
- Bouton "Valider mes données" → enregistrement

### 2.6 Multi-années

Si l'utilisateur importe plusieurs fichiers (ex : 2023, 2024, 2025) :
- Détecter automatiquement l'année de chaque fichier
- Stocker chaque année séparément dans `period_results`
- L'année N-1 alimente automatiquement la section "Comparaison N-1" dans le dashboard
- L'année N-2 et avant : archivées, consultables dans Mes Résultats avec filtre par année

### 2.7 Alimentation des dashboards

Les données importées alimentent automatiquement :
- **Dashboard** : KPIs, charts, progression objectif
- **Mes Résultats** : historique mensuel/annuel
- **Ma Performance** : ratios et benchmarks
- **Ma Formation** : diagnostic basé sur les axes faibles identifiés
- **Comparaison N-1** : si données N-1 importées

---

## 03 — Flux Manager/Directeur : Import Équipe & Création de Comptes

### 3.1 Déclencheur

Dans l'onboarding manager/directeur, après les zones standard, ajouter :

**« Importer les résultats de mon équipe »** avec sous-titre *« Excel, PDF ou capture d'écran — nous détectons vos conseillers automatiquement »*

### 3.2 Pipeline d'extraction équipe
Fichier importé (tableau équipe)
→ IA extrait la liste des individus :
{ nom, prénom, métriques par période }
→ Afficher le récapitulatif détecté :
"Nous avons détecté 3 conseillers : Thomas, Lucie, Roger"
→ Pour chaque conseiller : afficher ses données extraites
→ Demander les emails manquants (jamais dans les fichiers)
→ Vérifier si email déjà existant en base → demander action
→ Récapitulatif de facturation
→ Paiement Stripe
→ Création comptes + envoi invitations

### 3.3 Interface de saisie des emails

Après extraction, afficher une liste :

| Conseiller détecté | Email (à saisir) | Statut |
|---|---|---|
| Thomas Martin | [champ email] | Nouveau compte |
| Lucie Dupont | [champ email] | Nouveau compte |
| Roger Blanc | [champ email] | Nouveau compte |

- Si un email saisi correspond à un compte existant → afficher "Compte existant détecté" avec options : Rattacher à mon équipe / Ignorer
- Validation : tous les emails doivent être renseignés avant de continuer

### 3.4 Données individuelles

Les données extraites du fichier manager sont attribuées individuellement à chaque conseiller :
- Thomas → ses métriques → alimentent son dashboard personnel
- Lucie → ses métriques → alimentent son dashboard personnel
- Roger → ses métriques → alimentent son dashboard personnel
- Le manager voit l'agrégat + les données individuelles dans son cockpit

---

## 04 — Monétisation

### 4.1 Modèle freemium

| Fonctionnalité | Gratuit | Payant |
|---|---|---|
| Dashboard (KPIs, charts) | ✅ | ✅ |
| Mes Résultats | ❌ (cadenas) | ✅ |
| Ma Performance | ❌ (cadenas) | ✅ |
| Comparaison N-1 | ❌ (cadenas) | ✅ |
| Ma Formation | ❌ (cadenas) | ✅ |
| Mes Objectifs | ❌ (cadenas) | ✅ |
| Saisie hebdomadaire | ❌ (cadenas) | ✅ |
| Export JPEG classements | ❌ (cadenas) | ✅ |
| Classements équipe (manager) | ❌ (cadenas) | ✅ |

Pas de limite de temps — les fonctionnalités restent bloquées jusqu'au paiement.

### 4.2 UX des fonctionnalités bloquées

Sur chaque page/section bloquée :
- Icône cadenas 🔒 visible sur le lien de navigation dans la sidebar
- Si l'utilisateur clique sur une section bloquée :
  * Overlay sur la page avec fond flouté
  * Titre : "Débloquez cette fonctionnalité"
  * Description courte de ce que la section apporte
  * Bouton CTA : "Souscrire — 9€/mois" → redirige vers /souscrire
- L'overlay ne bloque pas le retour au dashboard (croix de fermeture)

### 4.3 Pricing affiché en démo

| Offre | Prix | Contenu |
|---|---|---|
| Conseiller Solo | 9€/mois | Accès complet individuel |
| Équipe (manager) | 9€/conseiller/mois | Manager + tous ses conseillers |
| Agence (directeur) | 9€/conseiller/mois | Directeur + managers + conseillers |

Facturation à l'issue de la création de comptes en masse :
- Récapitulatif : "3 comptes créés = 27€/mois"
- Paiement Stripe → validation comptes → envoi invitations email

### 4.4 Intégration Stripe (phase 1 — démo)

Pour la démo : simuler le paiement sans vrai Stripe.
- Afficher la page de récapitulatif avec le montant
- Bouton "Procéder au paiement" → page Stripe simulée avec formulaire carte
- En démo : n'importe quelle carte fictive valide → "Paiement validé"
- En production : intégrer Stripe Checkout réel (à implémenter après)

### 4.5 Post-paiement

Après paiement validé (réel ou simulé) :
- Créer les comptes conseillers en base Supabase
- Envoyer un email d'invitation à chaque conseiller (Resend / smart-service)
  * Objet : "Votre manager vous invite sur NXT Performance"
  * Corps : lien d'activation + données pré-remplies de leur dashboard
- Confirmer au manager : "3 invitations envoyées — vos conseillers peuvent activer leur compte"

---

## 05 — Intégration dans la Démo DEMO2024

### 5.1 Flux démo complet
/demo → DEMO2024 → /onboarding/identite
→ Zone 1 : Photo de profil
→ Zone 2 : Logo agence
→ Zone 3 : Voix coach
→ Zone 4 : "Importer ma performance" (NOUVEAU)
→ Uploader un fichier démo (Excel ou image fournis)
→ IA extrait les données → afficher résultat
→ Valider
→ CTA → /dashboard?gate=1
→ Simulation saisie (3 modes)
→ /dashboard avec KPIs réels (importés + démo)
→ Cliquer sur "Mes Résultats" → overlay cadenas → "Souscrire"
→ Simuler le flux manager : import équipe → emails → facturation → paiement

### 5.2 Fichier démo fourni

Créer un fichier Excel démo `public/demo/performance-demo.xlsx` avec :
- Onglet "2025" : données conseiller réalistes (12 mois)
- Onglet "2024" : données N-1 pour comparaison
- Nommé "Jean-Guy Ourmières — Résultats 2024-2025"

Créer un fichier Excel équipe démo `public/demo/equipe-demo.xlsx` avec :
- 3 conseillers : Thomas Martin, Lucie Dupont, Roger Blanc
- Données de performance sur 12 mois chacun
- Format réaliste (comme un vrai export logiciel agence)

---

## 06 — Migrations Supabase Requises
```sql
-- Table imports : historique des fichiers importés
CREATE TABLE IF NOT EXISTS performance_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  file_type TEXT, -- 'excel' | 'pdf' | 'image'
  status TEXT DEFAULT 'pending', -- 'pending' | 'processed' | 'validated' | 'error'
  extracted_data JSONB,
  periods_detected TEXT[], -- ['2024', '2025']
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE performance_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_imports" ON performance_imports
  FOR ALL USING (user_id = auth.uid());

-- Table subscriptions : état d'abonnement
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free', -- 'free' | 'solo' | 'team' | 'agency'
  status TEXT DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  seats INTEGER DEFAULT 1,
  price_per_seat INTEGER DEFAULT 900, -- centimes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscription" ON subscriptions
  FOR ALL USING (user_id = auth.uid());
```

---

## 07 — Spécifications Techniques

### 7.1 API Route d'extraction

Créer `/api/import-performance` :
- Accepte multipart/form-data avec le fichier
- Si Excel/CSV → SheetJS pour parser
- Si PDF → pdf-parse pour extraire le texte
- Si image → OpenRouter gemini-flash-1.5 vision avec prompt d'extraction
- Retourne JSON structuré avec les métriques détectées et les périodes
- Auth requise (vérifier session Supabase)

### 7.2 Prompt IA d'extraction
Tu es un expert en analyse de performance immobilière.
Analyse ce document et extrais toutes les métriques de performance.
Réponds UNIQUEMENT en JSON avec cette structure :
{
"periods": [
{
"year": 2024,
"month": null, // null si données annuelles
"metrics": {
"contacts_entrants": number | null,
"mandats_signes": number | null,
"visites_realisees": number | null,
"offres_recues": number | null,
"compromis_signes": number | null,
"actes_signes": number | null,
"ca_encaisse": number | null
}
}
],
"individuals": [ // si données équipe
{
"nom": string,
"prenom": string,
"periods": [...]
}
],
"confidence": "high" | "medium" | "low",
"missing_fields": ["liste des champs non trouvés"]
}

### 7.3 Gestion des abonnements côté client

Créer un hook `useSubscription()` :
- Lit `subscriptions.plan` depuis Supabase au login
- Expose `isPremium: boolean`
- Expose `canAccess(feature: string): boolean`

Créer un composant `LockedFeature` :
- Wraps n'importe quelle page/section
- Si `!isPremium` → afficher overlay cadenas
- Props : `featureName`, `featureDescription`

---

## 08 — Plan de Tests

### 8.1 Import conseiller
- Upload Excel → données extraites correctement
- Upload PDF → données extraites correctement
- Upload image → données extraites via IA vision
- Données manquantes → formulaire de complétion affiché
- Multi-fichiers (2024 + 2025) → deux années stockées séparément
- Dashboard alimenté après import

### 8.2 Import manager
- Upload tableau équipe → 3 conseillers détectés
- Formulaire emails → validation avant continuer
- Email existant → proposition de rattachement
- Récapitulatif facturation → montant correct (N × 9€)
- Paiement simulé → comptes créés → invitations envoyées

### 8.3 Monétisation
- Utilisateur free → sidebar avec cadenas sur sections bloquées
- Clic section bloquée → overlay "Débloquez cette fonctionnalité"
- Bouton "Souscrire" → /souscrire
- Utilisateur premium → toutes sections accessibles, aucun cadenas

### 8.4 Démo
- Flux complet démo avec import fichier démo
- Overlay cadenas visible en démo
- Simulation paiement fonctionnelle

---

## 09 — Décisions Validées & Points Ouverts

### 9.1 Validées
- 3 formats acceptés dès V1 : Excel, PDF, image
- IA demande les données manquantes plutôt qu'ignorer
- Emails toujours saisis manuellement (jamais dans les fichiers)
- Email existant → demander action (rattacher ou ignorer)
- Données individuelles attribuées à chaque conseiller
- Pas de limite de temps sur le free — fonctionnalités bloquées uniquement
- Cadenas + overlay "Débloquez" + bouton Souscrire
- Pricing démo : 9€/mois/conseiller
- Stripe simulé en démo, réel en production
- Comparaison N-1 alimentée automatiquement si données N-1 importées
- Directeur paie pour tout le monde dans sa structure

### 9.2 Points ouverts — à décider
- Pricing final (9€/mois/conseiller validé pour la démo, à confirmer pour la production)
- Stripe : compte Stripe à créer et connecter
- Email d'invitation conseiller : contenu exact à rédiger
- Limite de sièges par plan (ex : max 10 conseillers par manager ?)
- Remise volume (ex : -20% au-delà de 10 conseillers) ?
- Accès réseau : pricing spécifique à définir

---

*PRD v1.0 — Validé avril 2026 — Prochaine révision : phase implémentation*