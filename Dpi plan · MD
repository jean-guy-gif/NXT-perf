# DPI — Diagnostic de Performance Immobilière

## Vue d'ensemble

Le DPI est un questionnaire de 16 questions (6 contexte + 10 performance) accessible SANS compte (juste un email), intégré dans NXT Performance. Il produit un radar 6 axes avec scoring, projections et estimation de CA additionnel. C'est un lead magnet premium pour les sales.

## Parcours utilisateur

```
Page Welcome → bouton "DPI" (animé, clignotant, très visible)
  → Page DPI : saisie email
  → Étape 1/2 : 6 questions contexte (1 par écran, swipe mobile)
  → Étape 2/2 : 10 questions performance (1 par écran, swipe mobile)
  → Page résultats :
      - Score global /100
      - Score potentiel /100
      - Radar 6 axes (actuel + projection 3/6/9 mois + top performer)
      - Estimation CA additionnel
      - Recommandations personnalisées (2-3 leviers prioritaires)
      - Bouton "Télécharger mon diagnostic PDF"
      - Bouton "Créer mon compte NXT Performance"
```

## Architecture technique

### Nouvelles pages (route group /dpi, pages publiques)
- `/dpi` — landing + saisie email
- `/dpi/questionnaire` — les 16 questions (wizard step-by-step)
- `/dpi/resultats` — résultats + radar + PDF

### Nouvelle table Supabase
```sql
CREATE TABLE public.dpi_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'pdf_downloaded')),
  context_answers jsonb NOT NULL DEFAULT '{}',
  performance_answers jsonb NOT NULL DEFAULT '{}',
  scores jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  pdf_downloaded_at timestamptz DEFAULT NULL
);

CREATE INDEX idx_dpi_results_email ON public.dpi_results(email);
CREATE INDEX idx_dpi_results_status ON public.dpi_results(status);

ALTER TABLE public.dpi_results ENABLE ROW LEVEL SECURITY;

-- Pas de RLS restrictive : les DPI sont accessibles en écriture sans auth
CREATE POLICY "dpi_insert" ON public.dpi_results
  FOR INSERT WITH CHECK (true);
CREATE POLICY "dpi_update" ON public.dpi_results
  FOR UPDATE USING (true);
CREATE POLICY "dpi_select" ON public.dpi_results
  FOR SELECT USING (true);
```

### Nouveaux fichiers
```
src/app/(public)/dpi/page.tsx                    — Landing + email
src/app/(public)/dpi/questionnaire/page.tsx      — Wizard 16 questions
src/app/(public)/dpi/resultats/page.tsx          — Résultats + radar
src/app/(public)/layout.tsx                      — Layout public (pas de sidebar)
src/lib/dpi-scoring.ts                           — Moteur de scoring (pure functions)
src/lib/dpi-questions.ts                         — Définition des 16 questions
src/lib/dpi-pdf.ts                               — Génération PDF
src/components/dpi/dpi-radar.tsx                  — Composant radar 6 axes
src/components/dpi/dpi-question-card.tsx          — Carte question (mobile-friendly)
src/components/dpi/dpi-progress-bar.tsx           — Barre de progression
src/components/dpi/dpi-score-card.tsx             — Carte score global
src/app/(dashboard)/admin/dpi/page.tsx            — Dashboard sales (leads DPI)
```

## Scoring

### Chaque réponse = 1 à 4 points

Les 10 questions performance ont chacune 4 réponses ordonnées de la moins bonne (1 pt) à la meilleure (4 pts).

### Score par axe du radar (sur 100)

| Axe | Questions | Calcul |
|-----|-----------|--------|
| Intensité commerciale | Q1 (prospection) | score Q1 × 25 |
| Génération d'opportunités | Q2 (estimations) | score Q2 × 25 |
| Solidité du portefeuille | Q3 (mandats stock) | score Q3 × 25 |
| Maîtrise des ratios | Q4 + Q5 + Q6 (exclu + estim→mandats + mandats→ventes) | moyenne × 25 |
| Valorisation économique | Q7 (honoraires) | score Q7 × 25 |
| Pilotage stratégique | Q8 + Q9 + Q10 (suivi + objectifs + formation) | moyenne × 25 |

### Score global
Moyenne pondérée des 6 axes :
- Intensité commerciale : 10%
- Génération d'opportunités : 20%
- Solidité du portefeuille : 15%
- Maîtrise des ratios : 25%
- Valorisation économique : 15%
- Pilotage stratégique : 15%

### Score potentiel
Pour chaque axe, le potentiel = min(100, score actuel + bonus)
Le bonus dépend du contexte :
- Expérience < 3 ans → bonus +20 sur tous les axes
- Expérience 3-7 ans → bonus +15
- Expérience > 7 ans → bonus +10
- Pas de suivi structuré (Q8 < 3) → bonus +25 sur Pilotage
- Pas d'exclusivité (Q4 < 3) → bonus +20 sur Ratios

### Projections 3/6/9 mois
- 3 mois : score actuel + (potentiel - actuel) × 0.3
- 6 mois : score actuel + (potentiel - actuel) × 0.6
- 9 mois : score actuel + (potentiel - actuel) × 0.9

### Top performer (référence fixe)
```
Intensité commerciale : 70 (pas 100 — les top ne prospectent pas autant)
Génération d'opportunités : 90
Solidité du portefeuille : 85
Maîtrise des ratios : 95
Valorisation économique : 85
Pilotage stratégique : 90
```

### Estimation CA additionnel
Basé sur le CA actuel (Q6 du contexte) et l'écart entre score actuel et potentiel :
- Écart × facteur multiplicateur selon le CA actuel
- Ex: CA 100-250k, écart 20 points → estimation +30 000 à +60 000 €

## Design du radar

Recharts RadarChart avec :
- 3 couches : actuel (surface pleine bleu/violet), potentiel (pointillés), top performer (ligne fine grise)
- Toggle pour projections 3/6/9 mois (remplace la couche potentiel)
- Animation d'apparition progressive
- Labels sur chaque axe avec le score
- Couleurs NXT (gradient bleu #3375FF / violet #A055FF)
- Responsive mobile-first

## Design des questions

Chaque question = 1 écran full-height (mobile-friendly) :
- Numéro de question (1/16)
- Barre de progression en haut
- Titre de la question en gros
- 4 boutons de réponse empilés verticalement
- Clic sur une réponse → slide automatique vers la question suivante
- Bouton "Précédent" discret en bas
- Pas de bouton "Suivant" — le clic sur la réponse avance automatiquement

## Page Welcome — Bouton DPI

Sur la page Welcome existante, ajouter en haut un bouton DPI très visible :
- Fond gradient bleu/violet avec animation pulse (clignotement subtil)
- Icône radar ou target
- Texte : "Diagnostic de Performance Immobilière — Gratuit, 3 minutes"
- Sous-texte : "Découvrez votre score et votre potentiel"
- Au clic → `/dpi`

## Dashboard Sales (admin)

Page `/admin/dpi` accessible uniquement aux rôles directeur/réseau :
- Tableau des leads DPI triés par date (plus récent en haut)
- Colonnes : Email, Date, Statut (🟡 démarré, 🟢 complété, 📄 PDF téléchargé), Score global, Score potentiel, CA actuel, Leviers identifiés
- Filtre par statut
- Export CSV
- Clic sur une ligne → détail du DPI (toutes les réponses + radar)

## Tasks d'implémentation

### Phase A — Fondations (Supabase + scoring + questions)

**Task 1** : Créer la table dpi_results sur Supabase (MANUEL)
**Task 2** : Créer src/lib/dpi-questions.ts (définition des 16 questions)
**Task 3** : Créer src/lib/dpi-scoring.ts (moteur de scoring pur)

### Phase B — UI Questionnaire

**Task 4** : Créer le layout public src/app/(public)/layout.tsx
**Task 5** : Créer la page landing DPI `/dpi` (email + intro)
**Task 6** : Créer la page questionnaire `/dpi/questionnaire` (wizard 16 questions)
**Task 7** : Modifier la page Welcome — ajouter le bouton DPI animé

### Phase C — Résultats + Radar

**Task 8** : Créer le composant radar DPI (src/components/dpi/dpi-radar.tsx)
**Task 9** : Créer la page résultats `/dpi/resultats` (score + radar + recommandations)
**Task 10** : Créer la génération PDF (src/lib/dpi-pdf.ts)

### Phase D — Dashboard Sales

**Task 11** : Créer la page admin `/admin/dpi` (tableau des leads)
**Task 12** : Ajouter le lien admin dans la sidebar pour directeur/réseau

### Phase E — Tests + Polish

**Task 13** : Test complet du flow (email → questions → résultats → PDF → admin)
**Task 14** : Responsive mobile + animations

## Valeurs attendues (exemple de test)

Un utilisateur qui répond :
- Q1: "3 à 6h" (2 pts) → Intensité: 50
- Q2: "3 à 5" (2 pts) → Opportunités: 50
- Q3: "10 à 20" (3 pts) → Portefeuille: 75
- Q4: "20 à 40%" (2 pts), Q5: "50 à 70%" (3 pts), Q6: "30 à 50%" (2 pts) → Ratios: 58
- Q7: "entre 4 et 5%" (3 pts) → Valorisation: 75
- Q8: "régulièrement" (3 pts), Q9: "oui mais peu suivi" (3 pts), Q10: "occasionnellement" (2 pts) → Pilotage: 67

Score global = 0.10×50 + 0.20×50 + 0.15×75 + 0.25×58 + 0.15×75 + 0.15×67 = 60.5/100
Score potentiel (expérience 3-7 ans, bonus +15) ≈ 75/100
CA additionnel estimé (si CA actuel 100-250k, écart 15 pts) ≈ +25 000 à +45 000 €