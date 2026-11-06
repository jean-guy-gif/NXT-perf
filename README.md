# NXT Performance

Cockpit de performance pour agents immobiliers : visualiser l'activité du mois, suivre les **7 ratios** métier, repérer les points faibles et orienter la formation. Pensé pour les **conseillers** et leurs **managers** (et, hors mode formation, directeurs et réseaux).

## Démarrage local

```bash
npm install
cp .env.local.example .env.local   # puis renseigner les variables
npm run dev                        # http://localhost:3000
```

## Variables d'environnement

Voir `.env.local.example`. L'essentiel :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — backend Supabase (auth + Postgres).
- `AI_FEATURES_ENABLED` (serveur) / `NEXT_PUBLIC_AI_FEATURES` (client) — interrupteur IA, **éteints par défaut** (option A : l'outil calcule, on copie le diagnostic dans son propre assistant).
- `NEXT_PUBLIC_APP_MODE=formation` — mode formation : seuls les rôles conseiller et manager sont visibles.
- `OPENROUTER_API_KEY` — optionnel, requis uniquement si l'IA est activée (option B).

## Déploiement (Vercel)

Projet Next.js déployé sur Vercel. `vercel.json` définit un cron quotidien (`/api/keepalive`) qui, avec le workflow GitHub `supabase-keepalive.yml`, maintient le projet Supabase actif (évite la pause à 7 jours). Renseigner les mêmes variables d'environnement côté Vercel.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — architecture, mode formation, interrupteur IA, conventions.
- [`docs/`](./docs/) — dette technique (`TECH_DEBT.md`), design system, plans produit.
