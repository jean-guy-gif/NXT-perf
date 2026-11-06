# CLAUDE.md

Guide pour Claude Code sur ce dépôt. NXT Performance est un **cockpit de performance** pour agents immobiliers : visualiser la performance, repérer les ratios faibles, orienter la formation.

## Commandes

```bash
npx next dev --port 3000 --hostname 0.0.0.0   # dev (Turbopack)
npx next build                                  # build prod
npx eslint src                                  # lint (doit sortir en 0)
npx tsc --noEmit                                # types
npx vitest run                                  # tests unitaires
```

## Stack réelle

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · **Zustand** (store global `src/stores/app-store.ts`, cache client) · Tailwind 4 (OKLCH) · Radix · Recharts/Chart.js · lucide.
**Supabase = backend** : auth via `@supabase/ssr` (`src/lib/supabase/{client,server}.ts`), données en Postgres. Les `mock-*` de `src/data/` ne servent QUE le **mode démo** (cookie `nxt-demo-mode`, `enterDemo()`).
Alias : `@/*` → `./src/*`.

## Mode formation

`NEXT_PUBLIC_APP_MODE=formation` (voir `src/lib/app-mode.ts`, `isFormationMode()`). En formation, **seuls 2 rôles sont visibles : conseiller + manager** (`FORMATION_ROLES`). Les rôles **directeur** et **réseau** (et les espaces admin / souscription / coaching) sont **masqués, pas supprimés** :
- `rolesToViews()` / `getVisibleViews()` / `switchRole()` filtrent les vues ;
- layouts `src/app/(dashboard)/{directeur,reseau,admin,coaching-debrief}/layout.tsx` → `redirect("/dashboard")` ;
- register + onboarding (`identite → agence|equipe → dashboard`) ne proposent que conseiller/manager.

## Interrupteur IA (option A par défaut)

`src/lib/ai-flags.ts` : `isAiEnabled()` (serveur, `AI_FEATURES_ENABLED === "true"`) et `isAiVisible()` (client, `NEXT_PUBLIC_AI_FEATURES === "on"`). **Éteints par défaut = option A** : l'outil calcule, le stagiaire **copie son diagnostic** (bouton « Copier mon diagnostic ») et le colle dans son propre Claude/ChatGPT. Les 15 routes LLM de `src/app/api/*` renvoient `503 { disabled:true }` quand l'IA est éteinte ; les déclencheurs UI sont masqués via `isAiVisible()`.

## Cœur déterministe (`src/lib/`, pur et testable)

- `ratios.ts` — les **7 ratios** (+ honoraires moyens), calcul + statut.
- `objectifs.ts` — entonnoir **GPS** (CA → actes → … → mandats/RDV).
- `formation.ts` — diagnostic formation (ratios faibles → axes).
- `diagnostic-export.ts` — texte « Copier mon diagnostic » (pièce centrale option A).
- `aggregate-results.ts`, `coaching-debrief.ts`, `personas.ts`, etc.

## Keep-alive Supabase

`/api/keepalive` (GET, ping `ratio_configs`) déclenché par **`vercel.json`** (cron quotidien `0 5 * * *`, plan Hobby) **et** le workflow GitHub `.github/workflows/supabase-keepalive.yml`. But : éviter la mise en pause Supabase à 7 jours d'inactivité.

## Migrations

`supabase/migrations/` = **snapshot réel du 06/11/2026** (`20261106143257_remote_schema.sql`) + migrations suivantes (ex. cleanup voix/Agefice). `supabase/migrations_legacy/` = **archive** des anciennes migrations 001→032 (ne plus utiliser).

## Conventions

- **Français avec accents réels** (é, è, à, ç) — JAMAIS d'échappement unicode (`é`).
- **« Junior »** et non « Débutant » (label de `debutant`, cf. `src/lib/constants.ts`).
- **7 ratios seulement** — `delai_moyen_vente` retiré, ne pas réintroduire (garde ESLint `no-restricted-syntax`, cf. `docs/TECH_DEBT.md`).
- Rôles : `conseiller | manager | directeur | reseau`.
- Pas de nouvelle lib d'état, pas de framework UI hors Radix+Tailwind. Logique métier déterministe et testable dans `src/lib/`.

## Principes de décision (toute nouvelle feature)

1. Améliorer la clarté de décision. 2. Réduire la charge cognitive. 3. Renforcer les 7 ratios. 4. Ne pas ajouter de complexité inutile.
Hiérarchie de la donnée : **KPIs → Ratios → Drill-down → Action de formation.**
