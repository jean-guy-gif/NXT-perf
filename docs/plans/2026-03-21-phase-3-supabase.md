# Phase 3 — Supabase : données réelles

**Goal:** Finaliser l'intégration Supabase pour que NXT Performance fonctionne avec de vraies données persistées, tout en conservant le mode démo client-side.

**État actuel :** Le projet Supabase existe. Les 6 tables sont créées. Les fichiers client Supabase, middleware, pages auth (login/register/forgot-password) et le hook useSupabaseResults existent déjà dans le repo. RLS policies, triggers et seed data sont appliqués sur Supabase. Il reste : quelques hooks manquants, SupabaseProvider, et le branchement complet.

**Architecture:** Supabase Client Direct — le frontend appelle Supabase via @supabase/supabase-js. RLS dans Postgres gère l'autorisation. Zustand reste comme cache local. Le flag isDemo route les hooks vers mock data ou Supabase.

**Tech Stack:** Next.js 16.1.6, React 19, TypeScript strict, Zustand 5, Supabase (Auth + Postgres + RLS), @supabase/supabase-js, @supabase/ssr.

**Tasks 1-3 done manually on Supabase (RLS policies, triggers, seed data).**

---

## Task 4: Créer les hooks Supabase manquants

- Create if missing: src/hooks/use-supabase-profile.ts
- Create if missing: src/hooks/use-supabase-ratio-configs.ts
- Create if missing: src/hooks/use-supabase-team.ts
- Verify: src/hooks/use-supabase-results.ts exists with saveResult

## Task 5: Créer le SupabaseProvider et l'intégrer au layout

- Create if missing: src/components/providers/supabase-provider.tsx
- Modify: src/app/(dashboard)/layout.tsx — wrap children with SupabaseProvider
- Add demo banner when isDemo is true

## Task 6: Vérifier et ajuster le Zustand store pour le dual mode

- Verify: src/stores/app-store.ts has isDemo, enterDemo, exitDemo, setProfile, setResults, setRatioConfigs, logout
- Fix only what's missing

## Task 7: Brancher la page Saisie sur Supabase

- Verify: src/app/(dashboard)/saisie/page.tsx uses saveResult from useSupabaseResults
- Replace addResults with saveResult if needed

## Task 8: Mettre à jour le Header pour le logout Supabase

- Verify: src/components/layout/header.tsx calls supabase.auth.signOut() on logout
- Add Supabase signOut if missing

## Task 9: Full build verification

- Run npx next build
- Fix any remaining errors
- Final commit
