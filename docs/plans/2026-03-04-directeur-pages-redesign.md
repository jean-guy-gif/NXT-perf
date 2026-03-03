# Directeur Pages Redesign

**Date :** 2026-03-04
**Branche :** `feat/institution-hierarchy`

## Objectif

Remplacer/fusionner les pages directeur existantes en 5 pages claires :
Pilotage Agence, Équipes, Projection, Rentabilité, Formation Collective (conservée).

## Sidebar Directeur (5 boutons)

| Ancien | Nouveau | Route | Icône |
|--------|---------|-------|-------|
| Cockpit Agence | Pilotage Agence | `/directeur/pilotage` | `Compass` |
| Équipes | Équipes | `/directeur/equipes` | `Users` |
| Classement Agence | Projection | `/directeur/projection` | `TrendingUp` |
| *(nouveau)* | Rentabilité | `/directeur/rentabilite` | `Calculator` |
| Formation Collective | Formation Collective | `/directeur/formation-collective` | `BookOpen` |

Pages supprimées : `cockpit/page.tsx`, `classement/page.tsx`.
`DEFAULT_ROUTES.directeur` → `/directeur/pilotage`.

## Architecture : Hook centralisé `useAgencyGPS()`

**Fichier :** `src/hooks/use-agency-gps.ts`

### Entrées

- `useDirectorData()` → teams, allConseillers, allResults, ratioConfigs, orgStats
- Store Zustand → `agencyObjective` (CA annuel + valeur moy. acte), `directorCosts`

### Objectifs mock par catégorie (mensuels)

| Métrique | Junior | Confirmé | Expert |
|----------|--------|----------|--------|
| Estimations | 8 | 15 | 20 |
| Mandats | 4 | 8 | 12 |
| % Exclusivité | 30% | 50% | 70% |
| Visites | 20 | 30 | 40 |
| Offres | 3 | 5 | 8 |
| Compromis | 1 | 3 | 5 |
| Actes | 1 | 2 | 4 |
| CA | 8 000 | 20 000 | 40 000 |

### Interface exposée

```typescript
type GPSTheme =
  | "estimations" | "mandats" | "exclusivite" | "visites"
  | "offres" | "compromis" | "actes" | "ca_compromis" | "ca_acte"

interface AgencyGPSData {
  // GPS Agence (Pilotage)
  agencyGPS: {
    theme: GPSTheme
    objectif: number
    realise: number
    ecart: number
    avancement: number       // réalisé / objectif * 100
    projection: number       // réalisé / moisÉcoulés * 12
  }
  setGPSTheme: (theme: GPSTheme) => void

  // Comparaison par entité (Équipes)
  entityBars: EntityBar[]    // [{name, niveau, realise, objectif, pct, status}]

  // Projection (performance ratio)
  projectionData: ProjectionEntry[]  // [{name, niveau, performance, status}]

  // Rentabilité
  rentabilite: RentabiliteData | null  // null si pas de saisie
}

interface EntityBar {
  name: string
  niveau: "agence" | "manager" | "conseiller"
  realise: number
  objectif: number
  pct: number                // réalisé / objectif * 100
  status: "ok" | "warning" | "danger"
  teamId?: string
}

interface ProjectionEntry {
  name: string
  niveau: "agence" | "equipe" | "conseiller"
  performance: number        // moyenne réalisé/objectif tous thèmes
  status: "ok" | "warning" | "danger"
  teamId?: string
  teamName?: string
}

interface RentabiliteData {
  revenuDirecteurVentes: number
  revenuDirecteurEquipes: number
  resultatAgenceMois: number
  projectionRevenuAnnuel: number
}
```

### Calcul des objectifs par entité

- **Conseiller** → objectif mock selon catégorie (Junior/Confirmé/Expert)
- **Manager** → somme des objectifs de ses conseillers
- **Agence** → somme de tous les conseillers (ou saisie directeur si définie)

### Calcul réalisé par entité

- **Conseiller** → valeur depuis `PeriodResults`
- **Manager** → somme de son équipe
- **Agence** → somme globale

## Page : Pilotage Agence

**Route :** `/directeur/pilotage`

### Layout

1. **Bandeau de saisie** (repliable) — Objectif CA annuel agence + Valeur moyenne acte. Persisté store. Si vide : GPS fonctionne avec somme objectifs mock.

2. **Sélecteur de thème** — 9 chips : Estimations, Mandats, % Exclusivité, Visites, Offres, Compromis, Actes, CA Compromis, CA Acte.

3. **GPS Agence** — Pour le thème sélectionné :
   - Objectif agence
   - Réalisé agence
   - Écart (réalisé - objectif)
   - % Avancement (barre colorée vert/orange/rouge)
   - Projection annuelle

4. **Détail par équipe** — Tableau compact : par équipe, réalisé/objectif/écart/% pour le thème.

## Page : Équipes

**Route :** `/directeur/equipes`

### Layout

1. **Sélecteur de thème** — Même 9 chips.

2. **Graphique unique `<ComparisonBarChart>`** — Axe X : Agence | Manager 1 | Manager 2 | Conseiller A | ...
   - Barre pleine = réalisé
   - Trait fin horizontal = objectif individuel
   - Couleur : vert ≥100%, orange 80-99%, rouge <80%
   - Séparateurs visuels entre groupes
   - Tooltip : nom, réalisé, objectif, écart, %

3. **Légende** — Barre = Réalisé, Trait = Objectif, code couleur.

### Composant custom

`<ComparisonBarChart>` dans `src/components/charts/` — basé sur Recharts BarChart avec customisation :
- Deuxième série invisible pour le trait objectif (via custom shape)
- Couleur dynamique par barre via `Cell` Recharts

## Page : Projection

**Route :** `/directeur/projection`

### Layout

Barres horizontales groupées par équipe :
- Agence en haut (barre large)
- Puis chaque équipe (barre moyenne) avec ses conseillers indentés
- Métrique : performance globale = moyenne (réalisé/objectif) tous thèmes
- Couleur : vert ≥100%, orange 80-99%, rouge <80%
- Tri par performance décroissante au sein de chaque équipe

Réutilise `<ProgressBar>` existant.

## Page : Rentabilité

**Route :** `/directeur/rentabilite`

### État initial

Page inactive, formulaire affiché.

### Formulaire de saisie (panneau intégré, repliable après remplissage)

| Champ | Type |
|-------|------|
| % commission directeur | number |
| % commission managers | number |
| % commission conseillers | number |
| Coûts fixes agence / mois | number |
| Masse salariale / mois | number |
| Autres charges / mois | number |

Persisté dans store Zustand (localStorage).

### Calculs affichés (4 KPI cards)

- **Revenu directeur (ses ventes)** = CA directeur × % commission dir
- **Revenu directeur (équipes)** = CA total équipes × % commission dir sur équipes
- **Résultat agence estimé / mois** = CA total - charges totales
- **Projection revenu directeur / an** = (rev ventes + rev équipes) × 12 - charges annuelles

## Store Zustand — Ajouts

```typescript
// Nouvelles propriétés dans AppState
agencyObjective: { annualCA: number; avgActValue: number } | null
directorCosts: DirectorCosts | null
setAgencyObjective: (obj: { annualCA: number; avgActValue: number }) => void
setDirectorCosts: (costs: DirectorCosts) => void

interface DirectorCosts {
  commissionDirecteur: number    // %
  commissionManagers: number     // %
  commissionConseillers: number  // %
  coutsFixes: number             // €/mois
  masseSalariale: number         // €/mois
  autresCharges: number          // €/mois
}
```

## Fichiers impactés

### Nouveaux fichiers
- `src/hooks/use-agency-gps.ts`
- `src/app/(dashboard)/directeur/pilotage/page.tsx`
- `src/app/(dashboard)/directeur/projection/page.tsx`
- `src/app/(dashboard)/directeur/rentabilite/page.tsx`
- `src/components/charts/comparison-bar-chart.tsx`

### Fichiers modifiés
- `src/components/layout/sidebar.tsx` — routes + icônes
- `src/stores/app-store.ts` — `agencyObjective`, `directorCosts`, setters
- `src/lib/constants.ts` — `CATEGORY_OBJECTIVES` mock
- `src/app/(dashboard)/directeur/equipes/page.tsx` — refonte complète

### Fichiers supprimés
- `src/app/(dashboard)/directeur/cockpit/page.tsx`
- `src/app/(dashboard)/directeur/classement/page.tsx`
