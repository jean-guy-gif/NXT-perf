# Audit design-system v2 — refonte UI

Date : 2026-04-26  
Référence : `docs/design-system-v2.md`  
Branche : `feat/refonte-v2`

## Méthode

Audit automatisé par grep des anti-patterns et bons patterns sur les 6 pages clés du produit. Pour chaque page, comptage des occurrences :

- **Anti-patterns** (à éliminer) : `py-20+`, `rounded-2xl+`, `shadow-xl+`, `max-w-7xl`, breakpoint `sm:`
- **Bons patterns** (à étendre) : éyebrow pill, card standard, icon wrapper, H2 standard, H1 hero, CTA principal, encart primary

## Résultats par page

| Page | Anti-patterns | Bons patterns | Verdict |
|---|---|---|---|
| `/welcome` | 0 | 5 | Référence — à conserver |
| `/formation` | 6 | 0 | Pire score — refonte prioritaire |
| `/dashboard` | 6 | 5 | Mixte — polish ciblé |
| `/performance` | 3 | 2 | Moyen — polish léger |
| `/login` | 1 | 1 | Quasi clean — micro-fix |
| `/resultats` | 1 | 0 | Minimaliste — peu de gain |

## Plan de refonte

| Ordre | Page | Type d'intervention | Effort estimé |
|---|---|---|---|
| 1 | `/formation` | Refonte structurelle | ~2h |
| 2 | `/dashboard` | Polish ciblé | ~1h |
| 3 | `/performance` | Polish léger | ~30 min |
| 4 | `/login` | Micro-fix `rounded-2xl` | ~5 min |
| 5 | `/resultats` | Polish léger | ~30 min |

`/welcome` reste tel quel (déjà aligné).

## Périmètre d'application du design-system v2

Le design-system a été extrait de `/pourquoi-nxt` (page marketing). Toutes ses briques **ne s'appliquent pas littéralement aux pages utilitaires** :

**À appliquer partout** :
- Briques visuelles : cards, icon wrappers, encarts, éyebrows, typographie
- Règles structurelles : max-width adapté, `py-12` pour sections, breakpoints `md:`/`lg:` uniquement
- Élimination des anti-patterns

**Réservé aux pages marketing/landing** (`/pourquoi-nxt`, `/welcome`, `/login`, `/register`) :
- Hero complet (H1 + sous-titre + CTA + subline)
- Témoignages
- Storytelling narratif

**À éviter sur les pages produit** :
- Hero "marketing" sur `/dashboard`, `/resultats`, etc.
- Témoignages dans le contexte utilitaire
- Densité narrative excessive

## Suivi des refontes

À mesure que les refontes avancent, mettre à jour ce fichier avec :
- Date du commit de refonte
- Lien vers le commit
- Score post-refonte (anti-patterns / bons patterns)
