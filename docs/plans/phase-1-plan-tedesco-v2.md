# Phase 1 — Plan d'implémentation post-retours Tedesco

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implémenter les 3 corrections critiques identifiées lors du call de démonstration avec Sébastien Tedesco : (1) recommandations actionables sur les cockpits, (2) benchmark externe + scoring lisible, (3) persistance des vues personnalisées.

**Architecture:** Client-side uniquement — aucun backend. Nouveaux fichiers dans `src/lib/` (pure functions déterministes), `src/data/` (mock data), `src/hooks/` (hook réutilisable), `src/components/dashboard/` (composant UI). Business logic testable et découplée des composants.

**Tech Stack:** Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript strict, Zustand 5, Recharts 3.7, Tailwind CSS 4 (OKLCH color space), Radix UI, Lucide icons.

**Conventions critiques :**
- **French UI language** — caractères réels (é, è, à, ç). JAMAIS d'escape unicode.
- **7 ratios only** — `contacts_rdv`, `estimations_mandats`, `pct_mandats_exclusifs`, `visites_offre`, `offres_compromis`, `mandats_simples_vente`, `mandats_exclusifs_vente`. Ne pas en ajouter.
- **5 roles** — `conseiller`, `manager`, `directeur`, `coach`, `reseau`. Ne pas en ajouter.
- **"Junior" not "Débutant"** — label `debutant` → "Junior" partout.
- **No backend** — tout est client-side mock. Pas de Supabase dans cette phase.
- **No additional state library** — Zustand uniquement.
- **No UI framework beyond Radix + Tailwind** — pas de nouvelle dépendance UI.
- **Pure functions in `src/lib/`** — business logic déterministe et testable.
- **Decision Principles** — chaque feature doit : (1) améliorer la clarté décisionnelle, (2) réduire la charge cognitive, (3) renforcer les 7 ratios, (4) ne pas ajouter de complexité inutile.

---

## Task 1: Créer le hook `usePersistedState`

**Files:**
- Create: `src/hooks/use-persisted-state.ts`

**Step 1: Écrire le hook**

Create `src/hooks/use-persisted-state.ts`:

Hook `useState` avec persistance localStorage. Renvoie le même tuple `[state, setState]` que `useState`. Hydrate depuis localStorage au mount côté client. Retourne `defaultValue` tant que l'hydration n'est pas faite (évite les mismatches SSR/client). Gère silencieusement les erreurs localStorage (incognito, quota dépassé).

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setState(JSON.parse(stored));
      }
    } catch {
      // localStorage unavailable or parse error
    }
    setHydrated(true);
  }, [key]);

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Silently fail
        }
        return next;
      });
    },
    [key]
  );

  return [hydrated ? state : defaultValue, setPersistedState];
}
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/hooks/use-persisted-state.ts
git commit -m "feat: add usePersistedState hook for localStorage persistence"
```

---

## Task 2: Persister les favoris et onglet du dashboard conseiller

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Remplacer useState par usePersistedState pour les favoris**

Ajouter l'import en haut du fichier :
```typescript
import { usePersistedState } from "@/hooks/use-persisted-state";
```

Trouver la ligne :
```typescript
const [favorites, setFavorites] = useState<WidgetId[]>([...valeur initiale...]);
```
Remplacer par :
```typescript
const [favorites, setFavorites] = usePersistedState<WidgetId[]>(
  "nxt-dashboard-favorites",
  ["kpi_estimations", "kpi_mandats", "kpi_compromis", "kpi_ca", "donut_mandats", "chart_evolution", "chart_activite", "performance"]
);
```

**Step 2: Persister l'onglet actif**

Trouver la ligne :
```typescript
const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
```
Remplacer par :
```typescript
const [activeTab, setActiveTab] = usePersistedState<DashboardTab>(
  "nxt-dashboard-tab",
  "overview"
);
```

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: persist dashboard favorites and active tab in localStorage"
```

---

## Task 3: Persister les préférences manager et directeur

**Files:**
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx`
- Modify: `src/app/(dashboard)/directeur/pilotage/page.tsx`
- Modify: `src/app/(dashboard)/directeur/equipes/page.tsx`

**Step 1: Manager cockpit — persister le mode de période**

Ajouter l'import `usePersistedState`. Remplacer le `useState` du mode période (variable nommée `periodMode` ou équivalent) par `usePersistedState` avec clé `"nxt-manager-cockpit-period"`.

**Step 2: Directeur pilotage — persister le thème GPS**

Ajouter l'import `usePersistedState`. Remplacer le `useState` du thème GPS (variable `theme` ou `selectedTheme`, type `GPSTheme`) par `usePersistedState` avec clé `"nxt-directeur-pilotage-theme"`.

**Step 3: Directeur équipes — persister le thème**

Même pattern, clé `"nxt-directeur-equipes-theme"`.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/manager/cockpit/page.tsx src/app/(dashboard)/directeur/pilotage/page.tsx src/app/(dashboard)/directeur/equipes/page.tsx
git commit -m "feat: persist manager and directeur view preferences in localStorage"
```

---

## Task 4: Créer les données de benchmark marché

**Files:**
- Create: `src/data/mock-benchmark.ts`

**Step 1: Écrire le fichier de données**

Create `src/data/mock-benchmark.ts`:

Données de benchmark marché pour les 7 ratios. Valeurs réalistes pour l'immobilier français (ordres de grandeur, seront remplacées par données réseau réelles via Supabase en phase suivante). Structure : moyenne marché + top 10% par ratio.

```typescript
import type { RatioId } from "@/types/ratios";

export interface MarketBenchmark {
  marketAverage: number;
  topPerformer: number;
  label: string;
}

export const MARKET_BENCHMARKS: Record<RatioId, MarketBenchmark> = {
  contacts_rdv: {
    marketAverage: 25,
    topPerformer: 40,
    label: "Moy. marché : 25%",
  },
  estimations_mandats: {
    marketAverage: 55,
    topPerformer: 75,
    label: "Moy. marché : 55%",
  },
  pct_mandats_exclusifs: {
    marketAverage: 30,
    topPerformer: 60,
    label: "Moy. marché : 30%",
  },
  visites_offre: {
    marketAverage: 15,
    topPerformer: 25,
    label: "Moy. marché : 15%",
  },
  offres_compromis: {
    marketAverage: 50,
    topPerformer: 70,
    label: "Moy. marché : 50%",
  },
  mandats_simples_vente: {
    marketAverage: 20,
    topPerformer: 35,
    label: "Moy. marché : 20%",
  },
  mandats_exclusifs_vente: {
    marketAverage: 45,
    topPerformer: 65,
    label: "Moy. marché : 45%",
  },
};
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/data/mock-benchmark.ts
git commit -m "feat: add market benchmark mock data for 7 ratios"
```

---

## Task 5: Créer le helper de scoring humain

**Files:**
- Create: `src/lib/scoring.ts`

**Step 1: Écrire la pure function de scoring**

Create `src/lib/scoring.ts`:

Pure functions déterministes. Pas d'état, pas de side effects. Prennent un `ComputedRatio` et renvoient un scoring lisible pour un humain non-technicien. Respecte la hiérarchie Data : KPIs → Ratios → Drill-down → Training action.

5 niveaux de scoring : `top` (≥120% objectif ET ≥ top performer marché), `bon` (≥100% objectif), `moyen` (≥80% objectif OU ≥ moyenne marché), `faible` (≥50% objectif), `critique` (<50%).

Utilise les constantes de couleur existantes de `src/lib/constants.ts` (`STATUS_COLORS`, `STATUS_BG_COLORS`) + extensions spécifiques au scoring.

```typescript
import type { ComputedRatio, RatioId } from "@/types/ratios";
import { MARKET_BENCHMARKS } from "@/data/mock-benchmark";

export type ScoreLevel = "top" | "bon" | "moyen" | "faible" | "critique";

export interface HumanScore {
  level: ScoreLevel;
  label: string;
  color: string;
  bgColor: string;
  vsMarket: "above" | "at" | "below";
  marketAverage: number;
}

const SCORE_CONFIG: Record<ScoreLevel, { label: string; color: string; bgColor: string }> = {
  top:      { label: "Top performer",   color: "text-green-500",  bgColor: "bg-green-500/15" },
  bon:      { label: "Bon niveau",      color: "text-green-500",  bgColor: "bg-green-500/10" },
  moyen:    { label: "Dans la moyenne", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  faible:   { label: "En dessous",      color: "text-orange-500", bgColor: "bg-orange-500/15" },
  critique: { label: "Critique",        color: "text-red-500",    bgColor: "bg-red-500/15" },
};

export function getHumanScore(ratio: ComputedRatio): HumanScore {
  const benchmark = MARKET_BENCHMARKS[ratio.ratioId as RatioId];
  if (!benchmark) {
    return {
      level: "moyen",
      label: "Moyen",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      vsMarket: "at",
      marketAverage: 0,
    };
  }

  const pct = ratio.percentageOfTarget;
  const value = ratio.value;

  let level: ScoreLevel;
  if (pct >= 120 && value >= benchmark.topPerformer) {
    level = "top";
  } else if (pct >= 100) {
    level = "bon";
  } else if (pct >= 80 || value >= benchmark.marketAverage) {
    level = "moyen";
  } else if (pct >= 50) {
    level = "faible";
  } else {
    level = "critique";
  }

  const vsMarket: "above" | "at" | "below" =
    value > benchmark.marketAverage * 1.1 ? "above" :
    value >= benchmark.marketAverage * 0.9 ? "at" : "below";

  return {
    level,
    ...SCORE_CONFIG[level],
    vsMarket,
    marketAverage: benchmark.marketAverage,
  };
}

export function getGlobalScore(ratios: ComputedRatio[]): {
  score: number;
  level: ScoreLevel;
  label: string;
  color: string;
  bgColor: string;
} {
  if (ratios.length === 0) {
    return { score: 0, level: "critique", label: "Aucune donnée", color: "text-red-500", bgColor: "bg-red-500/15" };
  }

  const avg = Math.round(
    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length
  );

  let level: ScoreLevel;
  if (avg >= 120) level = "top";
  else if (avg >= 100) level = "bon";
  else if (avg >= 80) level = "moyen";
  else if (avg >= 50) level = "faible";
  else level = "critique";

  return { score: avg, level, ...SCORE_CONFIG[level] };
}
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat: add deterministic human scoring with market benchmark comparison"
```

---

## Task 6: Créer le composant RecommandationBanner

**Files:**
- Create: `src/components/dashboard/recommandation-banner.tsx`

**Step 1: Écrire le composant**

Create `src/components/dashboard/recommandation-banner.tsx`:

Composant React pur, sans état interne (stateless). Reçoit les recommandations et les affiche. Respecte le design system existant : Tailwind CSS 4, Lucide icons, `cn()` pour les classNames conditionnels. UI en français avec caractères réels. Pas de nouvelle dépendance.

Props :
- `recommendations: FormationRecommendation[]` — depuis `generateFormationDiagnostic()`
- `ratioConfigs: Record<RatioId, RatioConfig>` — pour les labels de ratio
- `maxItems?: number` — défaut 3
- `variant?: "compact" | "full"` — compact = cockpit, full = page dédiée
- `scope?: "conseiller" | "manager" | "directeur"` — adapte le texte selon le rôle

Messages d'interprétation par area (objet interne `ACTION_MESSAGES`) :
```typescript
const ACTION_MESSAGES: Record<FormationArea, { interpretation: string; action: string }> = {
  prospection: {
    interpretation: "Vos contacts ne se transforment pas assez en RDV",
    action: "Relancez vos prospects non contactés et qualifiez mieux vos leads entrants",
  },
  estimation: {
    interpretation: "Vos estimations ne génèrent pas assez de mandats",
    action: "Renforcez votre argumentation prix avec des comparables récents",
  },
  exclusivite: {
    interpretation: "Votre taux d'exclusivité est en dessous de l'objectif",
    action: "Préparez un argumentaire exclusivité structuré pour chaque RDV",
  },
  suivi_mandat: {
    interpretation: "Vos mandats simples ne se vendent pas assez",
    action: "Planifiez un suivi vendeur hebdomadaire et proposez des ajustements prix",
  },
  accompagnement_acheteur: {
    interpretation: "Vos visites ne génèrent pas assez d'offres",
    action: "Améliorez la qualification acheteur avant chaque visite",
  },
  negociation: {
    interpretation: "Vos offres ne se transforment pas assez en compromis",
    action: "Travaillez votre technique de closing et la gestion des objections",
  },
};
```

Messages adaptés scope manager (objet `MANAGER_MESSAGES`) — texte à la 3ème personne :
```typescript
const MANAGER_MESSAGES: Record<FormationArea, string> = {
  prospection: "conseiller(s) en difficulté sur la prospection → coaching appel recommandé",
  estimation: "conseiller(s) en difficulté sur la conversion estimation → mandat",
  exclusivite: "conseiller(s) sous l'objectif exclusivité → travaillez l'argumentaire en équipe",
  suivi_mandat: "mandats simples stagnent → organisez une revue de portefeuille",
  accompagnement_acheteur: "visites sans offre → vérifiez la qualification acheteur",
  negociation: "offres non transformées → session closing recommandée",
};
```

Layout variant `compact` : une seule `<div>` contenant une liste d'items sur fond coloré (pattern existant dans le projet : `rounded-xl border border-[status]/30 bg-[status]/5 p-5`). Chaque item : icône `AlertTriangle` (Lucide) + texte d'interprétation + texte d'action + lien "Voir la formation →" vers `/formation`.

Layout variant `full` : grid de cards (reprend le pattern de `formation/page.tsx` avec `priorityConfig`).

Si `recommendations.length === 0` → ne rien rendre (retourner `null`). Pas de message positif — on n'affiche la bannière que s'il y a quelque chose à dire.

Imports nécessaires : `FormationRecommendation`, `FormationArea` depuis `@/types/formation`, `RatioId`, `RatioConfig` depuis `@/types/ratios`, `AlertTriangle`, `Lightbulb`, `ArrowRight` depuis `lucide-react`, `cn` depuis `@/lib/utils`, `Link` depuis `next/link`.

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/components/dashboard/recommandation-banner.tsx
git commit -m "feat: add RecommandationBanner component for actionable insights"
```

---

## Task 7: Intégrer RecommandationBanner sur le dashboard conseiller

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Ajouter les imports**

Ajouter :
```typescript
import { generateFormationDiagnostic } from "@/lib/formation";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
```

**Step 2: Calculer le diagnostic**

Dans le corps du composant `DashboardContent`, après les hooks existants (`useUser`, `useResults`, `useRatios`), ajouter :
```typescript
const diagnostic = user
  ? generateFormationDiagnostic(computedRatios, ratioConfigs, user.id)
  : null;
```

**Step 3: Placer la bannière dans le JSX**

Insérer entre la div des tabs (onglets) et le panel `expandedKpi`, visible sur tous les onglets :
```tsx
{diagnostic && diagnostic.recommendations.length > 0 && (
  <RecommandationBanner
    recommendations={diagnostic.recommendations}
    ratioConfigs={ratioConfigs}
    maxItems={2}
    variant="compact"
    scope="conseiller"
  />
)}
```

La bannière ne s'affiche que si au moins 1 recommandation existe.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add recommandation banner to conseiller dashboard"
```

---

## Task 8: Intégrer benchmark et scoring sur la page performance conseiller

**Files:**
- Modify: `src/app/(dashboard)/performance/page.tsx`

**Step 1: Ajouter les imports**

```typescript
import { getHumanScore, getGlobalScore } from "@/lib/scoring";
import { MARKET_BENCHMARKS } from "@/data/mock-benchmark";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
```

**Step 2: Ajouter le score global en haut de la page**

Après le titre `<h1>`, insérer un bloc score global. Utiliser `getGlobalScore(computedRatios)` pour obtenir le score, level, label, color, bgColor. Afficher un cercle avec le score % (reprendre le pattern du `overallPerformance` existant dans `dashboard/page.tsx` avec `ProgressBar`), le label humain ("Top performer", "Critique", etc.), et une phrase de contexte.

**Step 3: Enrichir chaque carte de ratio**

Pour chaque ratio affiché (boucle sur `computedRatios`), appeler `getHumanScore(ratio)` et ajouter :
- Un badge avec le `label` du scoring (ex: `<span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", score.bgColor, score.color)}>{score.label}</span>`)
- Sous la `ProgressBar` existante, ajouter une ligne : `<p className="text-xs text-muted-foreground mt-1">Moy. marché : {score.marketAverage}%</p>`
- Icône directionnelle : `TrendingUp` si `vsMarket === "above"` (vert), `TrendingDown` si `below` (rouge), `Minus` si `at` (neutre)

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/performance/page.tsx
git commit -m "feat: add human scoring and market benchmark to performance page"
```

---

## Task 9: Intégrer RecommandationBanner sur le cockpit manager

**Files:**
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx`

**Step 1: Ajouter les imports**

```typescript
import { generateFormationDiagnostic } from "@/lib/formation";
import { computeAllRatios } from "@/lib/ratios";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
```

**Step 2: Calculer les recommandations agrégées de l'équipe**

Le manager voit les problèmes les plus fréquents dans son équipe. Créer un `useMemo` :

```typescript
const teamRecommendations = useMemo(() => {
  const areaCount: Record<string, { count: number; area: FormationArea; label: string; totalGap: number }> = {};

  for (const user of conseillers) {
    const results = allResults.find((r) => r.userId === user.id);
    if (!results) continue;
    const ratios = computeAllRatios(results, user.category, ratioConfigs);
    const diag = generateFormationDiagnostic(ratios, ratioConfigs, user.id);

    for (const rec of diag.recommendations.filter((r) => r.priority <= 2)) {
      if (!areaCount[rec.area]) {
        areaCount[rec.area] = { count: 0, area: rec.area, label: rec.label, totalGap: 0 };
      }
      areaCount[rec.area].count++;
      areaCount[rec.area].totalGap += rec.gapPercentage;
    }
  }

  // Convertir en FormationRecommendation[] triées par fréquence décroissante
  return Object.values(areaCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => ({
      area: item.area,
      label: `${item.count} ${item.label.toLowerCase()}`,
      priority: (item.count >= 3 ? 1 : 2) as 1 | 2 | 3,
      currentRatio: 0,
      targetRatio: 0,
      gapPercentage: Math.round(item.totalGap / item.count),
      description: `${item.count} conseiller(s) en difficulté`,
    }));
}, [conseillers, allResults, ratioConfigs]);
```

**Step 3: Placer la bannière dans le JSX**

En haut du contenu principal, après le header et avant les KPI cards :
```tsx
{teamRecommendations.length > 0 && (
  <RecommandationBanner
    recommendations={teamRecommendations}
    ratioConfigs={ratioConfigs}
    maxItems={3}
    variant="compact"
    scope="manager"
  />
)}
```

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/manager/cockpit/page.tsx
git commit -m "feat: add team recommandation banner to manager cockpit"
```

---

## Task 10: Intégrer RecommandationBanner sur le cockpit directeur

**Files:**
- Modify: `src/app/(dashboard)/directeur/pilotage/page.tsx`

**Step 1: Ajouter les imports**

```typescript
import { generateFormationDiagnostic } from "@/lib/formation";
import { computeAllRatios } from "@/lib/ratios";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
```

**Step 2: Calculer les recommandations agrégées de l'agence**

Même pattern que Task 9 mais avec `allConseillers` et `allResults` depuis `useDirectorData()` (ou `useAgencyGPS()` selon le hook disponible dans la page). Le `useMemo` est identique, remplacer `conseillers` par la liste de tous les conseillers de l'agence.

**Step 3: Placer la bannière dans le JSX**

En haut du contenu principal, après le header.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**

```bash
git add src/app/(dashboard)/directeur/pilotage/page.tsx
git commit -m "feat: add agency-wide recommandation banner to directeur pilotage"
```

---

## Task 11: Intégrer benchmark sur les pages GPS manager et performance directeur

**Files:**
- Modify: `src/app/(dashboard)/manager/gps/page.tsx`
- Modify: `src/app/(dashboard)/directeur/performance/page.tsx`

**Step 1: Manager GPS — ajouter ligne benchmark sous chaque ratio**

Importer `MARKET_BENCHMARKS` et `getHumanScore`. Pour chaque ratio affiché dans le GPS (individuellement par conseiller), ajouter sous la `ProgressBar` une ligne secondaire `text-xs text-muted-foreground` avec la moyenne marché. Si la valeur du conseiller est en dessous de la moyenne marché, ajouter un indicateur visuel discret (petit point rouge ou icône `TrendingDown`).

**Step 2: Directeur performance — ajouter scoring et benchmark**

Même logique que Task 8 : score global en haut, badge scoring par ratio, référence marché sous chaque `ProgressBar`.

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**

```bash
git add src/app/(dashboard)/manager/gps/page.tsx src/app/(dashboard)/directeur/performance/page.tsx
git commit -m "feat: add benchmark reference to manager GPS and directeur performance"
```

---

## Task 12: Full build verification + smoke test

**Step 1: Full build**

Run: `npx next build`
Expected: Clean build, zero errors.

**Step 2: Fix any type errors**

Si erreurs de type : vérifier les imports, les noms de props, les types `FormationArea` et `RatioId`.

**Step 3: Manual testing checklist**

Tester ces flows en mode démo :

1. `/dashboard` → rafraîchir → les favoris sont conservés
2. `/dashboard` → changer d'onglet → rafraîchir → même onglet actif
3. `/dashboard` → un conseiller avec ratio danger voit une recommandation avec texte d'interprétation ET action concrète
4. `/dashboard` → cliquer "Voir la formation" → navigue vers `/formation`
5. `/performance` → chaque ratio affiche un badge scoring ("Top performer", "Critique", etc.)
6. `/performance` → chaque ratio affiche "Moy. marché : X%"
7. `/performance` → score global en haut avec label humain
8. `/manager/cockpit` → rafraîchir → même période sélectionnée
9. `/manager/cockpit` → bannière affiche les problèmes agrégés de l'équipe avec nombre de conseillers
10. `/directeur/pilotage` → rafraîchir → même thème GPS sélectionné
11. `/directeur/pilotage` → bannière affiche les problèmes agrégés de l'agence

**Step 4: Commit final**

```bash
git add -A && git commit -m "fix: resolve any remaining build issues from Phase 1"
```

---

## Summary

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 1 | Hook usePersistedState | Small |
| 2 | Persister favoris dashboard conseiller | Small |
| 3 | Persister préférences manager + directeur | Small |
| 4 | Données benchmark marché (mock) | Small |
| 5 | Helper scoring humain (pure function) | Small |
| 6 | Composant RecommandationBanner | Medium |
| 7 | Intégrer bannière dashboard conseiller | Small |
| 8 | Intégrer benchmark + scoring page performance | Medium |
| 9 | Intégrer bannière cockpit manager | Medium |
| 10 | Intégrer bannière cockpit directeur | Small |
| 11 | Intégrer benchmark GPS manager + perf directeur | Medium |
| 12 | Build verification + smoke test | Small |

## New files (4)

| File | Type | Description |
|------|------|-------------|
| `src/hooks/use-persisted-state.ts` | Hook | localStorage persistence |
| `src/data/mock-benchmark.ts` | Data | Benchmark marché 7 ratios |
| `src/lib/scoring.ts` | Lib | Pure functions scoring humain |
| `src/components/dashboard/recommandation-banner.tsx` | Component | Bannière recommandations |

## Modified files (7)

| File | Changes |
|------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` | + usePersistedState + RecommandationBanner |
| `src/app/(dashboard)/performance/page.tsx` | + getHumanScore + getGlobalScore + MARKET_BENCHMARKS |
| `src/app/(dashboard)/manager/cockpit/page.tsx` | + usePersistedState + RecommandationBanner (team) |
| `src/app/(dashboard)/manager/gps/page.tsx` | + MARKET_BENCHMARKS + getHumanScore |
| `src/app/(dashboard)/directeur/pilotage/page.tsx` | + usePersistedState + RecommandationBanner (agency) |
| `src/app/(dashboard)/directeur/equipes/page.tsx` | + usePersistedState |
| `src/app/(dashboard)/directeur/performance/page.tsx` | + getHumanScore + getGlobalScore + MARKET_BENCHMARKS |