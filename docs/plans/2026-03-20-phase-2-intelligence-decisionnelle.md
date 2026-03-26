# Phase 2 — Intelligence décisionnelle

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrichir NXT Performance avec (1) un scoring dynamique visible partout, (2) des alertes proactives basées sur les ratios et l'activité, (3) des indicateurs de tendance. Transformer le dashboard de "lecture" en "pilotage" — le pivot clé identifié par Tedesco.

**Architecture:** Client-side uniquement — aucun backend. Nouvelles pure functions dans `src/lib/`, enrichissement du système de notifications existant (`src/lib/notifications.ts`), nouveaux composants dans `src/components/dashboard/`. Toute business logic déterministe et testable.

**Tech Stack:** Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript strict, Zustand 5, Recharts 3.7, Tailwind CSS 4 (OKLCH color space), Radix UI, Lucide icons.

**Conventions critiques :**
- **French UI language** — caractères réels (é, è, à, ç). JAMAIS d'escape unicode.
- **7 ratios only** — ne pas en ajouter.
- **5 roles** — ne pas en ajouter.
- **"Junior" not "Débutant"** — label `debutant` → "Junior" partout.
- **No backend** — tout est client-side mock.
- **No additional state library** — Zustand uniquement.
- **Pure functions in `src/lib/`** — business logic déterministe et testable.
- **Decision Principles** — (1) améliorer la clarté décisionnelle, (2) réduire la charge cognitive, (3) renforcer les 7 ratios, (4) ne pas ajouter de complexité inutile.

**Prérequis :** Phase 1 terminée (scoring.ts, mock-benchmark.ts, recommandation-banner.tsx, use-persisted-state.ts existent).

---

## Task 1: Enrichir les notifications avec les alertes ratio

**Files:**
- Modify: `src/lib/notifications.ts`

**Step 1: Ajouter les imports scoring et ratios**

Ajouter en haut du fichier :
```typescript
import { computeAllRatios } from "@/lib/ratios";
import { getHumanScore, getGlobalScore } from "@/lib/scoring";
import type { RatioConfig, RatioId } from "@/types/ratios";
```

**Step 2: Ajouter le paramètre ratioConfigs à computeNotifications**

Modifier la signature :
```typescript
export function computeNotifications(
  user: User | null,
  results: PeriodResults[],
  allUsers: User[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[]
```

Passer `ratioConfigs` aux fonctions internes `computeConseillerNotifications` et `computeManagerNotifications`.

**Step 3: Ajouter les alertes ratio au conseiller**

Dans `computeConseillerNotifications`, après les alertes existantes (saisie retard, contacts retard), ajouter :
```typescript
if (ratioConfigs) {
  const latestResult = userResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  if (latestResult) {
    const ratios = computeAllRatios(latestResult, user.category, ratioConfigs);
    const dangerRatios = ratios.filter((r) => r.status === "danger");
    const globalScore = getGlobalScore(ratios);

    if (dangerRatios.length >= 3) {
      notifs.push({
        id: "ratios-critiques",
        type: "warning",
        message: `${dangerRatios.length} ratios en zone critique`,
        detail: dangerRatios.map((r) => ratioConfigs[r.ratioId as RatioId]?.name?.split("→")[0].trim()).join(", "),
        link: "/performance",
      });
    } else if (dangerRatios.length > 0) {
      for (const ratio of dangerRatios) {
        const config = ratioConfigs[ratio.ratioId as RatioId];
        notifs.push({
          id: `ratio-danger-${ratio.ratioId}`,
          type: "warning",
          message: `${config?.name?.split("→")[0].trim()} en zone critique`,
          detail: `${ratio.value}${config?.unit ?? ""} — objectif : ${ratio.thresholdForCategory}${config?.unit ?? ""}`,
          link: "/performance",
        });
      }
    }

    if (globalScore.level === "critique") {
      notifs.push({
        id: "score-global-critique",
        type: "warning",
        message: "Performance globale critique",
        detail: `Score : ${globalScore.score}% — des actions urgentes sont nécessaires`,
        link: "/formation",
      });
    }
  }
}
```

**Step 4: Ajouter les alertes ratio au manager**

Dans `computeManagerNotifications`, après les alertes existantes, ajouter :
```typescript
if (ratioConfigs) {
  let weakCount = 0;
  for (const conseiller of teamConseillers) {
    const cResults = results.filter((r) => r.userId === conseiller.id);
    const latest = cResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
    if (latest) {
      const ratios = computeAllRatios(latest, conseiller.category, ratioConfigs);
      const score = getGlobalScore(ratios);
      if (score.level === "faible" || score.level === "critique") weakCount++;
    }
  }

  if (weakCount > 0 && teamConseillers.length > 0) {
    const pct = Math.round((weakCount / teamConseillers.length) * 100);
    notifs.push({
      id: "team-weak-performers",
      type: "warning",
      message: `${weakCount} conseiller${weakCount > 1 ? "s" : ""} en difficulté (${pct}% de l'équipe)`,
      detail: "Consultez le GPS Équipe pour identifier les axes d'amélioration",
      link: "/manager/gps",
    });
  }
}
```

**Step 5: Verify build**

Run: `npx next build`

**Step 6: Commit**
```bash
git add src/lib/notifications.ts
git commit -m "feat: enrich notifications with ratio-based and scoring alerts"
```

---

## Task 2: Brancher ratioConfigs dans l'appel computeNotifications du Header

**Files:**
- Modify: `src/components/layout/header.tsx`

**Step 1: Ajouter ratioConfigs au useMemo des notifications**

Trouver la ligne où `computeNotifications` est appelé (dans un `useMemo`). Ajouter `ratioConfigs` au store read :
```typescript
const ratioConfigs = useAppStore((s) => s.ratioConfigs);
```

Puis passer `ratioConfigs` comme 4ème argument :
```typescript
const notifications = useMemo(
  () => computeNotifications(user, results, users, ratioConfigs),
  [user, results, users, ratioConfigs]
);
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**
```bash
git add src/components/layout/header.tsx
git commit -m "feat: pass ratioConfigs to notification system for ratio alerts"
```

---

## Task 3: Créer le composant ScoreBadge réutilisable

**Files:**
- Create: `src/components/dashboard/score-badge.tsx`

**Step 1: Écrire le composant**

Create `src/components/dashboard/score-badge.tsx`:

Composant stateless, réutilisable partout où un score humain doit être affiché.
```typescript
"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HumanScore } from "@/lib/scoring";

interface ScoreBadgeProps {
  score: HumanScore;
  showMarket?: boolean;
  showTrend?: boolean;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, showMarket = false, showTrend = false, size = "sm" }: ScoreBadgeProps) {
  const TrendIcon = score.vsMarket === "above" ? TrendingUp
    : score.vsMarket === "below" ? TrendingDown
    : Minus;

  const trendColor = score.vsMarket === "above" ? "text-green-500"
    : score.vsMarket === "below" ? "text-red-500"
    : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "rounded-full font-medium",
          score.bgColor,
          score.color,
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
        )}
      >
        {score.label}
      </span>
      {showTrend && (
        <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
      )}
      {showMarket && score.marketAverage > 0 && (
        <span className="text-xs text-muted-foreground">
          Moy. marché : {score.marketAverage}%
        </span>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**
```bash
git add src/components/dashboard/score-badge.tsx
git commit -m "feat: add reusable ScoreBadge component for human scoring display"
```

---

## Task 4: Créer le composant TrendIndicator pour les KPI

**Files:**
- Create: `src/components/dashboard/trend-indicator.tsx`

**Step 1: Écrire le composant**

Create `src/components/dashboard/trend-indicator.tsx`:

Composant stateless qui affiche une tendance entre deux périodes.
```typescript
"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: "number" | "percent" | "currency";
  invertColor?: boolean;
}

export function TrendIndicator({ current, previous, format = "number", invertColor = false }: TrendIndicatorProps) {
  if (previous === 0) return null;

  const delta = current - previous;
  const deltaPct = Math.round((delta / previous) * 100);

  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }

  const isPositive = invertColor ? deltaPct < 0 : deltaPct > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-green-500" : "text-red-500"
      )}
    >
      {deltaPct > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {deltaPct > 0 ? "+" : ""}{deltaPct}%
    </span>
  );
}
```

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**
```bash
git add src/components/dashboard/trend-indicator.tsx
git commit -m "feat: add TrendIndicator component for month-over-month comparison"
```

---

## Task 5: Intégrer les tendances sur le dashboard conseiller

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

**Step 1: Ajouter l'import**
```typescript
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { useAllResults } from "@/hooks/use-results";
```

**Step 2: Calculer les données du mois précédent**

Dans le composant, après les hooks existants, ajouter :
```typescript
const allResultsData = useAllResults();
const previousResults = useMemo(() => {
  if (!user) return null;
  const userResults = allResultsData
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  return userResults.length >= 2 ? userResults[1] : null;
}, [allResultsData, user]);
```

**Step 3: Ajouter les tendances aux KpiCards de l'onglet "Ce mois"**

Dans l'onglet `mois`, sous chaque `KpiCard`, ajouter un `TrendIndicator` comparant la valeur courante à la valeur du mois précédent. Appliquer aux 4 KPI : estimations, mandats, compromis, CA.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**
```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add month-over-month trend indicators to dashboard KPIs"
```

---

## Task 6: Intégrer ScoreBadge sur le cockpit manager

**Files:**
- Modify: `src/lib/scoring.ts`
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx`

**Step 1: Ajouter globalScoreToHumanScore dans scoring.ts**

Ajouter à la fin de `src/lib/scoring.ts` :
```typescript
export function globalScoreToHumanScore(global: ReturnType<typeof getGlobalScore>): HumanScore {
  return {
    level: global.level,
    label: global.label,
    color: global.color,
    bgColor: global.bgColor,
    vsMarket: "at",
    marketAverage: 0,
  };
}
```

**Step 2: Ajouter les imports dans manager cockpit**
```typescript
import { getGlobalScore, globalScoreToHumanScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/dashboard/score-badge";
```

**Step 3: Ajouter un ScoreBadge à chaque conseiller listé**

Pour chaque conseiller affiché dans le cockpit, calculer `getGlobalScore(ratios)` et afficher un `ScoreBadge` avec `globalScoreToHumanScore()`.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**
```bash
git add src/lib/scoring.ts src/app/(dashboard)/manager/cockpit/page.tsx
git commit -m "feat: add score badges to conseillers in manager cockpit"
```

---

## Task 7: Intégrer ScoreBadge et tendances sur le cockpit directeur

**Files:**
- Modify: `src/app/(dashboard)/directeur/pilotage/page.tsx`

**Step 1: Ajouter les imports**
```typescript
import { getGlobalScore, globalScoreToHumanScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
```

**Step 2: Ajouter un ScoreBadge au bloc GPS agence**

Calculer le score global de l'agence (moyenne des scores de tous les conseillers) et afficher un `ScoreBadge` à côté du titre ou en dessous de la barre d'avancement.

**Step 3: Ajouter des TrendIndicators au détail par équipe**

Dans le tableau "Détail par équipe", pour chaque équipe, comparer le réalisé du mois courant au mois précédent et afficher un `TrendIndicator`.

**Step 4: Verify build**

Run: `npx next build`

**Step 5: Commit**
```bash
git add src/app/(dashboard)/directeur/pilotage/page.tsx
git commit -m "feat: add score badges and trend indicators to directeur pilotage"
```

---

## Task 8: Ajouter les alertes directeur aux notifications

**Files:**
- Modify: `src/lib/notifications.ts`

**Step 1: Ajouter une fonction computeDirecteurNotifications**

Après `computeManagerNotifications`, ajouter :
```typescript
function computeDirecteurNotifications(
  user: User,
  results: PeriodResults[],
  allUsers: User[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[] {
  const notifs: AppNotification[] = [];

  const allConseillers = allUsers.filter(
    (u) => u.role === "conseiller" && u.institutionId === user.institutionId
  );

  const lateName: string[] = [];
  for (const c of allConseillers) {
    const cResults = results.filter((r) => r.userId === c.id);
    const latestUpdatedAt = cResults.reduce<string | null>((latest, r) => {
      if (!latest || r.updatedAt > latest) return r.updatedAt;
      return latest;
    }, null);
    if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
      lateName.push(`${c.firstName} ${c.lastName}`);
    }
  }

  if (lateName.length > 0) {
    notifs.push({
      id: "directeur-saisie-retard",
      type: "warning",
      message: `${lateName.length} collaborateur${lateName.length > 1 ? "s" : ""} sans saisie récente`,
      detail: lateName.slice(0, 5).join(", ") + (lateName.length > 5 ? ` et ${lateName.length - 5} autres` : ""),
      link: "/directeur/performance",
    });
  }

  if (ratioConfigs) {
    let totalScore = 0;
    let scoredCount = 0;
    for (const c of allConseillers) {
      const cResults = results.filter((r) => r.userId === c.id);
      const latest = cResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
      if (latest) {
        const ratios = computeAllRatios(latest, c.category, ratioConfigs);
        const score = getGlobalScore(ratios);
        totalScore += score.score;
        scoredCount++;
      }
    }
    if (scoredCount > 0) {
      const avgScore = Math.round(totalScore / scoredCount);
      if (avgScore < 60) {
        notifs.push({
          id: "directeur-performance-faible",
          type: "warning",
          message: "Performance globale agence en dessous des objectifs",
          detail: `Score moyen : ${avgScore}% — consultez le pilotage pour identifier les leviers`,
          link: "/directeur/pilotage",
        });
      }
    }
  }

  return notifs;
}
```

**Step 2: Intégrer dans computeNotifications**

Dans la fonction `computeNotifications`, ajouter le cas directeur AVANT le cas manager :
```typescript
if (user.role === "directeur") {
  return computeDirecteurNotifications(user, results, allUsers, ratioConfigs);
}
```

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**
```bash
git add src/lib/notifications.ts
git commit -m "feat: add directeur-specific notifications with agency performance alerts"
```

---

## Task 9: Créer le composant AlertesPrioritaires pour les cockpits

**Files:**
- Create: `src/components/dashboard/alertes-prioritaires.tsx`

**Step 1: Écrire le composant**

Create `src/components/dashboard/alertes-prioritaires.tsx`:

Composant stateless qui affiche les alertes les plus urgentes d'une équipe ou agence.

Props :
```typescript
interface AlertesPrioritairesProps {
  alerts: Array<{
    id: string;
    type: "danger" | "warning" | "info";
    title: string;
    detail: string;
    conseillerName?: string;
    link?: string;
  }>;
  maxItems?: number;
}
```

Layout : section avec header "Alertes prioritaires" + icône AlertTriangle + compteur badge. Liste verticale de cards compactes avec icône colorée (rouge danger, orange warning, bleu info), titre bold, détail secondaire, nom du conseiller si applicable, et lien cliquable via `useRouter`. Si `alerts.length === 0`, retourner `null`.

Réutiliser les patterns existants : `rounded-xl border`, `border-red-500/30 bg-red-500/5` pour danger, `border-orange-500/30 bg-orange-500/5` pour warning. Lucide icons : `AlertTriangle`, `Info`, `XCircle`.

**Step 2: Verify build**

Run: `npx next build`

**Step 3: Commit**
```bash
git add src/components/dashboard/alertes-prioritaires.tsx
git commit -m "feat: add AlertesPrioritaires component for manager/directeur dashboards"
```

---

## Task 10: Intégrer AlertesPrioritaires sur les cockpits manager et directeur

**Files:**
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx`
- Modify: `src/app/(dashboard)/directeur/pilotage/page.tsx`

**Step 1: Manager cockpit — générer les alertes prioritaires**

Créer un `useMemo` nommé `priorityAlerts` qui détecte :
- Conseiller avec 0 contact (prospection.contactsTotaux === 0)
- Conseiller avec score global "critique" (getGlobalScore → level === "critique")
- Conseiller avec 3+ ratios en danger

Mapper chaque situation en objet `{ id, type, title, detail, conseillerName, link }`. Passer le résultat au composant `AlertesPrioritaires` placé après la RecommandationBanner et avant les KPI cards.

**Step 2: Directeur pilotage — générer les alertes agence**

Même logique mais à l'échelle agence avec `allConseillers` depuis `useDirectorData()` ou `useAgencyGPS()`. Alertes supplémentaires :
- Équipe entière sous les 60% de performance moyenne
- Plus de 50% des conseillers de l'agence avec au moins 1 ratio critique

Placer le composant `AlertesPrioritaires` après la RecommandationBanner.

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit**
```bash
git add src/app/(dashboard)/manager/cockpit/page.tsx src/app/(dashboard)/directeur/pilotage/page.tsx
git commit -m "feat: integrate priority alerts into manager and directeur cockpits"
```

---

## Task 11: Full build verification + smoke test

**Step 1: Full build**

Run: `npx next build`
Expected: Clean build, zero errors.

**Step 2: Fix any type errors**

Erreurs courantes attendues :
- Import manquant de `RatioId` ou `RatioConfig`
- Signature de `computeNotifications` modifiée → vérifier tous les appels
- `getGlobalScore` renvoyant un type incomplet pour `ScoreBadge` → utiliser `globalScoreToHumanScore`

**Step 3: Manual testing checklist**

1. Cloche notifications → affiche les alertes ratio en plus des alertes saisie
2. Dashboard onglet "Ce mois" → tendances ↑/↓ sous les KPI
3. Performance → badges scoring toujours visibles (Phase 1)
4. Manager cockpit → ScoreBadge à côté de chaque conseiller
5. Manager cockpit → section alertes prioritaires avec détail
6. Manager cockpit → cloche → "X conseillers en difficulté"
7. Directeur pilotage → ScoreBadge global agence
8. Directeur pilotage → tendances par équipe
9. Directeur pilotage → alertes prioritaires agence
10. Directeur pilotage → cloche → alerte si performance < 60%

**Step 4: Commit final**
```bash
git add -A && git commit -m "fix: resolve any remaining build issues from Phase 2"
```

---

## Summary

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 1 | Enrichir notifications avec alertes ratio | Medium |
| 2 | Brancher ratioConfigs dans Header | Small |
| 3 | Composant ScoreBadge réutilisable | Small |
| 4 | Composant TrendIndicator | Small |
| 5 | Tendances sur dashboard conseiller | Medium |
| 6 | ScoreBadge sur cockpit manager | Medium |
| 7 | ScoreBadge + tendances cockpit directeur | Medium |
| 8 | Notifications directeur | Medium |
| 9 | Composant AlertesPrioritaires | Small |
| 10 | Intégrer alertes sur cockpits | Medium |
| 11 | Build verification + smoke test | Small |

## New files (3)

| File | Type | Description |
|------|------|-------------|
| `src/components/dashboard/score-badge.tsx` | Component | Badge scoring réutilisable |
| `src/components/dashboard/trend-indicator.tsx` | Component | Indicateur tendance mois/mois |
| `src/components/dashboard/alertes-prioritaires.tsx` | Component | Alertes urgentes équipe/agence |

## Modified files (6)

| File | Changes |
|------|---------|
| `src/lib/notifications.ts` | + alertes ratio, + alertes directeur, + signature ratioConfigs |
| `src/lib/scoring.ts` | + globalScoreToHumanScore helper |
| `src/components/layout/header.tsx` | + ratioConfigs dans computeNotifications |
| `src/app/(dashboard)/dashboard/page.tsx` | + TrendIndicator sur KPIs "Ce mois" |
| `src/app/(dashboard)/manager/cockpit/page.tsx` | + ScoreBadge + AlertesPrioritaires |
| `src/app/(dashboard)/directeur/pilotage/page.tsx` | + ScoreBadge + TrendIndicator + AlertesPrioritaires |
