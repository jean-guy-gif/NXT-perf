# DPI — Diagnostic de Performance Immobilière

## Contexte
Le DPI est un questionnaire de 16 questions (6 contexte + 10 performance) accessible SANS compte (juste un email), intégré dans NXT Performance. Il produit un radar 6 axes avec scoring, projections 3/6/9 mois et estimation de CA additionnel. C'est un lead magnet pour les sales.

## Parcours utilisateur
Page Welcome → bouton "DPI" animé → saisie email → 6 questions contexte → 10 questions performance → page résultats (score + radar + projections + PDF + CTA créer compte)

## Tasks

| # | Description | Status |
|---|-------------|--------|
| 1 | Table Supabase dpi_results | DONE |
| 2 | src/lib/dpi-questions.ts — 16 questions | TODO |
| 3 | src/lib/dpi-scoring.ts — moteur de scoring | TODO |
| 4 | src/app/(public)/layout.tsx — layout public | TODO |
| 5 | src/app/(public)/dpi/page.tsx — landing DPI | TODO |
| 6 | src/app/(public)/dpi/questionnaire/page.tsx — wizard | TODO |
| 7 | Welcome page — bouton DPI animé | TODO |
| 8 | src/components/dpi/dpi-radar.tsx — radar chart | TODO |
| 9 | src/app/(public)/dpi/resultats/page.tsx — résultats | TODO |
| 10 | src/lib/dpi-pdf.ts — génération PDF | TODO |
| 11 | src/app/(dashboard)/admin/dpi/page.tsx — admin | TODO |
| 12 | Sidebar + header — lien admin DPI | TODO |
| 13 | Middleware whitelist /dpi | TODO |
| 14 | Test complet + responsive | TODO |
