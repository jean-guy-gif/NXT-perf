# Vue Réseau v2.0 — Phase 1 : Tableau de bord (Chaîne 12 étapes)

**Date :** 2026-04-29
**Branche :** `feat/refonte-v2`
**Phase :** 1/3 (suivront Phase 2 : pages dérivées · Phase 3 : Ma Comparaison)

---

## Contexte

La refonte v2.0 du directeur a unifié son tableau de bord autour d'une **chaîne de production en 12 étapes** avec un toggle **Volumes / Ratios / Les deux**. La sidebar directeur cible est : `Tableau de bord · Mon Volume d'Activité · Mes Ratios de Transformation · Ma Comparaison · Ma Formation · Pilotage Financier · Leads DPI`.

Cette Phase 1 livre le **Tableau de bord Réseau** : strict miroir du directeur mais agrégé à l'échelle réseau, avec calcul d'objectifs par ruissellement total (somme des `CATEGORY_OBJECTIVES` de chaque conseiller du réseau).

## Décisions structurantes

| Sujet | Décision |
|---|---|
| Sidebar réseau finale | 6 entrées (miroir directeur sans Leads DPI) |
| Chaîne 12 étapes | Identique au directeur (mêmes labels, même ordre) |
| Toggle Volumes / Ratios / Les deux | Identique au directeur |
| Toggle période Mois / Année | Identique au directeur |
| Catégorie d'objectif | "Objectifs pondérés" + popover de répartition |
| Calcul des objectifs | Ruissellement total (Σ `CATEGORY_OBJECTIVES[c.category]`) |
| Cartes cliquables | Oui, drill-down vers `/reseau/volume-activite?step=...` |
| Pages 2-6 | Stubs temporaires en Phase 1, contenu en Phase 2-3 |
| Pages obsolètes | `/reseau/agence/page.tsx` supprimée. `/reseau/dashboard/page.tsx` réécrite. |

## Sidebar Réseau — état Phase 1

| Route | Label | Icône | Statut Phase 1 |
|---|---|---|---|
| `/reseau/dashboard` | Tableau de bord | `LayoutDashboard` | **Implémenté** |
| `/reseau/volume-activite` | Mon Volume d'Activité | `BarChart3` | Stub |
| `/reseau/ratios-transformation` | Mes Ratios de Transformation | `Gauge` | Stub |
| `/reseau/comparaison` | Ma Comparaison | `GitCompare` | Stub |
| `/reseau/formation` | Ma Formation | `GraduationCap` | Stub |
| `/reseau/pilotage-financier` | Pilotage Financier | `Wallet` | Stub |

Les stubs affichent un placeholder simple : icône + "Page en cours de construction — à venir Phase 2" + lien retour vers `/reseau/dashboard`.

## Chaîne 12 étapes — spec d'agrégation réseau

| # | Label | Catégorie | Champ source | Agrégation réseau |
|---|---|---|---|---|
| 01 | Contacts totaux | PROSPECTION | `prospection.contactsTotaux` | Σ tous conseillers |
| 02 | RDV Estimation | PROSPECTION | `vendeurs.rdvEstimation` | Σ tous conseillers |
| 03 | Estimations réalisées | PROSPECTION | `vendeurs.estimationsRealisees` | Σ tous conseillers |
| 04 | Mandats signés | PROSPECTION | `vendeurs.mandats.length` | Σ tous conseillers |
| 05 | % Exclusivité | TRANSFORMATION | mandats[type=exclusif] / mandats | Moyenne pondérée (Σ exclusifs / Σ mandats × 100) |
| 06 | Acheteurs sortis | TRANSFORMATION | `acheteurs.acheteursSortisVisite` | Σ tous conseillers |
| 07 | Visites réalisées | TRANSFORMATION | `acheteurs.nombreVisites` | Σ tous conseillers |
| 08 | Offres reçues | TRANSFORMATION | `acheteurs.offresRecues` | Σ tous conseillers |
| 09 | Compromis signés | TRANSFORMATION | `acheteurs.compromisSignes` | Σ tous conseillers |
| 10 | Actes signés | RÉSULTAT | `ventes.actesSignes` | Σ tous conseillers |
| 11 | CA Compromis | RÉSULTAT | calculé via mandats × valeur moyenne | Σ tous conseillers |
| 12 | CA Acte | RÉSULTAT | `ventes.chiffreAffaires` | Σ tous conseillers |

## Calcul des objectifs réseau (par ruissellement)

Pour chaque étape `step` :

```
objectifReseau[step] = Σ CATEGORY_OBJECTIVES[c.category][step]
                       pour chaque conseiller c dans tous les conseillers
                       de toutes les agences du réseau
```

Mapping étape → champ `CATEGORY_OBJECTIVES` :
- 01 Contacts totaux → champ à ajouter dans `CATEGORY_OBJECTIVES` (n'existe pas encore)
- 02 RDV Estimation → champ à ajouter
- 03 Estimations → `estimations`
- 04 Mandats → `mandats`
- 05 % Exclusivité → `exclusivite`
- 06 Acheteurs sortis → champ à ajouter
- 07 Visites → `visites`
- 08 Offres → `offres`
- 09 Compromis → `compromis`
- 10 Actes → `actes`
- 11 CA Compromis → champ à ajouter
- 12 CA Acte → `ca`

**Important :** vérifier dans le code directeur si ces 4 champs manquants (`contactsTotaux`, `rdvEstimation`, `acheteursSortisVisite`, `caCompromis`) sont déjà gérés. Si oui, réutiliser. Si non, les ajouter à `CATEGORY_OBJECTIVES` avec valeurs cohérentes pour Junior/Confirmé/Expert.

## Catégorie pondérée dans le header

Header : `[NB] collaborateurs · Objectifs pondérés · [période]`

Au survol/clic du label "Objectifs pondérés", popover avec la répartition :
```
Junior     : 5 (50%)
Confirmé   : 3 (30%)
Expert     : 2 (20%)
```

Calcul :
```typescript
const conseillers = allUsers.filter(u => u.role === "conseiller");
const counts = {
  debutant: conseillers.filter(c => c.category === "debutant").length,
  confirme: conseillers.filter(c => c.category === "confirme").length,
  expert: conseillers.filter(c => c.category === "expert").length,
};
const total = conseillers.length;
const mix = {
  debutant: Math.round((counts.debutant / total) * 100),
  confirme: Math.round((counts.confirme / total) * 100),
  expert: Math.round((counts.expert / total) * 100),
};
```

## Status par carte

Identique au directeur : ratio `realise / objectif`.
- ≥ 100% → **Surperf** (vert)
- 80% – 99% → **Stable** (orange)
- < 80% → **Sous-perf** (rouge)

Exception % Exclusivité (carte 05) : seuils probablement différents (à vérifier dans le code directeur — réutiliser exactement la même logique).

## Toggle Volumes / Ratios / Les deux

Réutiliser le composant exact du directeur. Trois modes :

- **Volumes** : 12 cartes affichent valeur absolue + objectif + écart + barre de progression
- **Ratios** : afficher les 7 ratios de transformation entre étapes consécutives (ex : RDV→Estimations, Estimations→Mandats, etc.) — calculés sur les agrégats réseau
- **Les deux** : combiné

## Toggle période Mois / Année

Réutiliser le composant exact du directeur. État local de la page (ou store si déjà persistant côté directeur — à vérifier).

- **Mois** : valeurs du mois courant
- **Année** : YTD (Year-To-Date), cumul depuis janvier

## Drill-down depuis les cartes

Clic sur une carte → `router.push(`/reseau/volume-activite?step=${stepId}`)`.

En Phase 1, la cible est un stub. En Phase 2, ce stub deviendra la vraie page Volume d'Activité réseau qui lit le query param `step` pour focaliser l'affichage.

## Hook central : `useNetworkProductionChain()`

**Fichier :** `src/hooks/use-network-production-chain.ts`

### Interface

```typescript
type ChainStep =
  | "contactsTotaux" | "rdvEstimation" | "estimations" | "mandats"
  | "exclusivite" | "acheteursSortis" | "visites" | "offres" | "compromis"
  | "actes" | "caCompromis" | "caActe"

type ChainCategory = "prospection" | "transformation" | "resultat"

interface ChainStepData {
  stepId: ChainStep
  stepNumber: number          // 1 à 12
  label: string
  category: ChainCategory
  realise: number
  objectif: number
  ecart: number               // realise - objectif
  pct: number                 // realise / objectif * 100
  status: "surperf" | "stable" | "sous-perf"
}

interface NetworkProductionChainData {
  steps: ChainStepData[]      // 12 entrées dans l'ordre
  conseillerCount: number
  categoryMix: {
    debutant: { count: number; pct: number }
    confirme: { count: number; pct: number }
    expert:   { count: number; pct: number }
  }
  period: "mois" | "annee"
  setPeriod: (p: "mois" | "annee") => void
  displayMode: "volumes" | "ratios" | "both"
  setDisplayMode: (m: "volumes" | "ratios" | "both") => void
}
```

### Implémentation

Réutilise `useNetworkData()` pour récupérer toutes les agences et leurs résultats.
Boucle sur tous les conseillers du réseau pour calculer chaque étape.
État local pour `period` et `displayMode` (pas besoin de Zustand sauf si le directeur le persiste — alignement nécessaire).

## Composants à créer / réutiliser

### À créer

| Composant | Fichier |
|---|---|
| `useNetworkProductionChain` | `src/hooks/use-network-production-chain.ts` |
| Page `/reseau/dashboard` | `src/app/(dashboard)/reseau/dashboard/page.tsx` (réécriture) |
| 5 stubs Phase 2 | `src/app/(dashboard)/reseau/{volume-activite,ratios-transformation,comparaison,formation,pilotage-financier}/page.tsx` |

### À réutiliser depuis le directeur

⚠️ **Identifier dans le code de `feat/refonte-v2`** les composants suivants et les importer (NE PAS dupliquer) :
- Composant carte de la chaîne (probablement `<ChainStepCard>` ou similaire)
- Composant chaîne complète avec catégories PROSPECTION / TRANSFORMATION / RÉSULTAT
- Toggle `Volumes / Ratios / Les deux`
- Toggle `Mois / Année`
- Logique de calcul des ratios de transformation (mode Ratios)

Si ces composants ne sont pas déjà extraits en composants réutilisables, **les extraire d'abord** dans `src/components/dashboard/` avant de les utiliser dans la page réseau. Cela évite la duplication.

## Plan d'implémentation Claude Code — 9 tâches

Chaque tâche : `npx tsc --noEmit` puis commit séparé. Build complet avant push : `npx next build`.

### Task 0 (préalable) — Identifier les composants directeur réutilisables

**Note de cadrage (Task 0 audit du 2026-04-29) :** la page tableau de bord directeur sur `feat/refonte-v2` est `src/app/(dashboard)/directeur/pilotage/page.tsx`, **pas** `dashboard/page.tsx` (la route `/directeur/pilotage` est l'équivalent du « tableau de bord » côté directeur). Pour le réseau, on garde `/reseau/dashboard` avec le label sidebar « Tableau de bord ».

**Action :**
- Lire `src/app/(dashboard)/directeur/pilotage/page.tsx` (page actuelle qui affiche la chaîne via `<ProductionChain scope="agency" />`)
- Identifier les composants : carte d'étape, chaîne complète, toggle Volumes/Ratios, toggle Mois/Année
- Si non extraits → les extraire en composants dans `src/components/dashboard/` avant la suite

**Décision (audit 2026-04-29) — Option C retenue :** zéro modification structurelle de `<ProductionChain>` (composant monolithique 95 KB). On exporte uniquement les types et helpers purs réutilisables, et on crée un `<NetworkProductionChain>` autonome qui consomme ces mêmes types/helpers. Légère duplication visuelle assumée comme dette technique Phase 1 (à mutualiser plus tard si validé).

Commits liés à Task 0 :
- `docs(prd): correct directeur dashboard route reference`
- `refactor(production-chain): export types and pure helpers for reuse`

### Task 1 — Mock data : enrichir à 4 agences

**Fichier :** `src/data/mock-network.ts`

Passer le réseau de 2 à 4 agences avec performances contrastées :
- NXT Immobilier Paris (org-demo) — surperf (~105%)
- NXT Immobilier Lyon (org-demo-2) — stable (~88%)
- NXT Immobilier Marseille (org-demo-3) — sous-perf (~72%)
- NXT Immobilier Toulouse (org-demo-4) — mixte

Chaque agence : 1 directeur + 2-3 managers + 4-8 conseillers avec catégories variées (Junior/Confirmé/Expert) et résultats mensuels cohérents avec le profil de perf.

`mockNetworks[0].institutionIds = ["org-demo", "org-demo-2", "org-demo-3", "org-demo-4"]`

Total cible : ~30-40 collaborateurs réseau, ~20-25 conseillers.

Commit : `feat(mock): enrich network to 4 agencies with contrasted performance`

### Task 2 — Compléter `CATEGORY_OBJECTIVES` (si nécessaire)

**Fichier :** `src/lib/constants.ts`

Vérifier si les champs suivants existent dans `CATEGORY_OBJECTIVES`. Sinon les ajouter :
- `contactsTotaux` (Junior 200, Confirmé 300, Expert 400)
- `rdvEstimation` (Junior 12, Confirmé 18, Expert 25)
- `acheteursSortis` (Junior 15, Confirmé 25, Expert 35)
- `caCompromis` (Junior 10000, Confirmé 25000, Expert 50000)

Valeurs à ajuster avec Laurent si déjà débattues — sinon utiliser les valeurs ci-dessus comme point de départ.

Commit : `feat(constants): add missing category objectives for production chain`

### Task 3 — Hook `useNetworkProductionChain()`

**Fichier :** `src/hooks/use-network-production-chain.ts`

Implémentation conforme à l'interface décrite plus haut. Réutilise `useNetworkData()`. Calculs purs avec `useMemo`.

Commit : `feat(hooks): create useNetworkProductionChain for network dashboard`

### Task 4 — Page `/reseau/dashboard` (réécriture complète)

**Fichier :** `src/app/(dashboard)/reseau/dashboard/page.tsx`

Réécriture totale. Structure :
- Header : titre "Tableau de bord Réseau", sous-titre "GPS de performance réseau — données mensuelles"
- Toggle Volumes / Ratios / Les deux (sous le titre)
- Sub-header droite : `[NB] collaborateurs · Objectifs pondérés · [période]` avec popover sur "Objectifs pondérés"
- Toggle Mois / Année (à droite)
- Chaîne 12 étapes (réutilise composants directeur) avec sections PROSPECTION / TRANSFORMATION / RÉSULTAT
- Chaque carte cliquable → `router.push("/reseau/volume-activite?step=...")`

Commit : `feat(reseau): rewrite dashboard with 12-step production chain`

### Task 5 — Créer les 5 stubs Phase 2

**Fichiers :**
- `src/app/(dashboard)/reseau/volume-activite/page.tsx`
- `src/app/(dashboard)/reseau/ratios-transformation/page.tsx`
- `src/app/(dashboard)/reseau/comparaison/page.tsx`
- `src/app/(dashboard)/reseau/formation/page.tsx`
- `src/app/(dashboard)/reseau/pilotage-financier/page.tsx`

Contenu de chaque stub (identique sauf titre) :
```tsx
"use client";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export default function StubPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Construction className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold">Page en cours de construction</h1>
      <p className="text-sm text-muted-foreground mt-2">À venir Phase 2 de la refonte réseau v2.0</p>
      <Link href="/reseau/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>
    </div>
  );
}
```

Commit : `feat(reseau): add Phase 2 stubs for sidebar navigation`

### Task 6 — Sidebar : refonte items réseau

**Fichier :** `src/components/layout/sidebar.tsx`

Remplacer l'item unique réseau actuel par les 6 nouveaux :
```typescript
{ href: "/reseau/dashboard", icon: LayoutDashboard, label: "Tableau de bord", networkOnly: true },
{ href: "/reseau/volume-activite", icon: BarChart3, label: "Mon Volume d'Activité", networkOnly: true },
{ href: "/reseau/ratios-transformation", icon: Gauge, label: "Mes Ratios de Transformation", networkOnly: true },
{ href: "/reseau/comparaison", icon: GitCompare, label: "Ma Comparaison", networkOnly: true },
{ href: "/reseau/formation", icon: GraduationCap, label: "Ma Formation", networkOnly: true },
{ href: "/reseau/pilotage-financier", icon: Wallet, label: "Pilotage Financier", networkOnly: true },
```

Commit : `feat(sidebar): refactor network section to 6 pages`

### Task 7 — Header page titles

**Fichier :** `src/components/layout/header.tsx`

Mettre à jour `pageTitles` :
```typescript
"/reseau/dashboard": "Tableau de bord Réseau",
"/reseau/volume-activite": "Mon Volume d'Activité",
"/reseau/ratios-transformation": "Mes Ratios de Transformation",
"/reseau/comparaison": "Ma Comparaison",
"/reseau/formation": "Ma Formation",
"/reseau/pilotage-financier": "Pilotage Financier",
```

Supprimer `"/reseau/agence"`.

Commit : `feat(header): update page titles for network refactor`

### Task 8 — Suppression `/reseau/agence/page.tsx`

**Action :** supprimer le fichier `src/app/(dashboard)/reseau/agence/page.tsx`.

Vérifier qu'aucun composant ne référence cette route. Si oui, mettre à jour vers `/reseau/dashboard`.

Commit : `feat(reseau): remove obsolete agence detail page`

### Task 9 — Build complet et validation

```bash
npx tsc --noEmit && npx next build
```

Si OK, push :
```bash
git push origin feat/refonte-v2
```

Commit final si ajustements : `chore(reseau): final adjustments after build validation`

## Checklist de validation Phase 1 (10 points)

À valider avant de passer à la Phase 2 :

1. Sidebar réseau affiche 6 items dans l'ordre attendu
2. Clic sur "Tableau de bord" charge la chaîne 12 étapes sans erreur
3. Header affiche `[NB] collaborateurs · Objectifs pondérés · [période]`
4. Hover/clic sur "Objectifs pondérés" → popover avec répartition Junior/Confirmé/Expert
5. Toggle Volumes / Ratios / Les deux fonctionne et change l'affichage
6. Toggle Mois / Année fonctionne et change les valeurs (mois courant vs YTD)
7. Les 12 cartes affichent valeur réalisée + objectif + écart + status (Surperf/Stable/Sous-perf)
8. Les 4 agences mockées remontent bien dans les agrégats (≈ 20-25 conseillers totalisés)
9. Clic sur une carte → redirige vers `/reseau/volume-activite?step=...` (stub Phase 2)
10. Clic sur n'importe quel autre item de sidebar → affiche le stub "Page en cours de construction"

## À préparer pour la Phase 2

À la fin de cette Phase 1, m'envoyer :
1. Capture du résultat du Tableau de bord Réseau (validation visuelle)
2. Capture de **Ma Comparaison** du directeur (la page que je connais le moins)
3. Capture de **Mon Volume d'Activité** du directeur (pour calibrer le drill-down et la Phase 2)
4. Confirmation que tous les tests Playwright existants passent encore (223+/223+)
