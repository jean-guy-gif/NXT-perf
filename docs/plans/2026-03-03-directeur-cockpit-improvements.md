# Plan: Directeur Cockpit Improvements

## Status: READY TO IMPLEMENT (session suivante)

## A) KPI "Mandats moyens par conseiller par mois" dans Résumé agence

**Fichier:** `src/app/(dashboard)/directeur/cockpit/page.tsx`
**Ligne ~858:** Grid `grid-cols-2 sm:grid-cols-4` → passer à `sm:grid-cols-5`
**Ajouter après le bloc "Mandats totaux" (ligne ~880):**
```tsx
<div className="rounded-lg bg-muted/50 p-3">
  <p className="text-xs text-muted-foreground">Mandats moy./conseiller/mois</p>
  <p className="mt-1 text-xl font-bold text-foreground">
    {periodMode === "semaine"
      ? "N/A"
      : agencyData.advisorCount > 0
        ? (agencyData.totalMandats / agencyData.advisorCount).toFixed(1)
        : "0"}
  </p>
</div>
```
**Logique:**
- `mois`: totalMandats / advisorCount (données = 1 mois)
- `annee`: idem (mock = 1 mois, TODO: diviser par nb mois quand historique dispo)
- `semaine`: "N/A" (pas d'extrapolation)
- `personnalise`: même formule que mois

## B) Déplacer Formation Collective en page dédiée

### B1. Supprimer du cockpit
**Fichier:** `src/app/(dashboard)/directeur/cockpit/page.tsx`
- **Supprimer lignes 1051-1264** (tout le bloc `{/* ═══════ FORMATION COLLECTIVE ═══════ */}` jusqu'à sa `</div>` fermante)
- Supprimer imports inutilisés après retrait: `BookOpen`, `Dumbbell`, `ExternalLink` (vérifier s'ils sont utilisés ailleurs dans le fichier d'abord)
- Supprimer `nxtTrainingData` useMemo (ligne ~520) et `teamAnalysis` useMemo (ligne ~490) SI ils ne sont plus référencés

### B2. Créer page dédiée
**Nouveau fichier:** `src/app/(dashboard)/directeur/formation-collective/page.tsx`
- Copier le bloc Formation du cockpit (lignes 1051-1264)
- Wrapper dans un composant page avec les mêmes imports/hooks
- Ajouter filtre période (semaine/mois/annee) comme dans le cockpit
- Réutiliser `useDirectorData()` pour les données

### B3. Ajouter nav sidebar
**Fichier:** `src/components/layout/sidebar.tsx`
- Ajouter après l'item "Classement Agence" (ligne 58):
```tsx
{ href: "/directeur/formation-collective", icon: BookOpen, label: "Formation Collective", directorOnly: true },
```
- Ajouter `BookOpen` aux imports lucide

### B4. Header page title
**Fichier:** `src/components/layout/header.tsx`
- Ajouter dans `pageTitles`:
```tsx
"/directeur/formation-collective": "Formation Collective Agence",
```

## C) Drill-down Conseiller (page détail)

### C1. Nouvelle route
**Nouveau fichier:** `src/app/(dashboard)/directeur/conseiller/[id]/page.tsx`
- Params: `id` (userId du conseiller)
- Query params: `?period=semaine|mois|annee` (lu via useSearchParams)
- Contenu:
  1. Breadcrumb: Cockpit Agence > Conseiller > {Prénom Nom}
  2. KPI volume: Estimations, Mandats, Actes, Contacts
  3. KPI performance: CA, Compromis, Conversions
  4. Ratios (réutiliser `computeAllRatios()` + boucle sur les 7 ratios avec ProgressBar)
- Données: `useAppStore` pour trouver le user + results par userId
- Bouton retour vers cockpit (avec tab + période préservés)

### C2. Rendre cliquables les conseillers dans "Par équipe"
**Fichier:** `src/app/(dashboard)/directeur/cockpit/page.tsx`
- Lignes 1352-1403: Le `<div>` de chaque agent dans la liste équipe
- Wrapper dans `<Link href={/directeur/conseiller/${agent.id}?period=${periodMode}}>` ou ajouter `onClick` + `router.push`
- Ajouter `cursor-pointer` au className

### C3. Rendre cliquables les conseillers dans "Par conseiller"
**Fichier:** `src/app/(dashboard)/directeur/cockpit/page.tsx`
- Lignes 1471-1519: Le `<tr>` de chaque agent dans le tableau
- Ajouter `onClick={() => router.push(/directeur/conseiller/${agent.id}?period=${periodMode})}` + `cursor-pointer`

### C4. Layout guard
- Le layout directeur existant (`src/app/(dashboard)/directeur/layout.tsx`) couvre déjà `/directeur/*` → pas de nouveau layout nécessaire

## Fichiers à modifier (résumé)

| Fichier | Action |
|---------|--------|
| `src/app/(dashboard)/directeur/cockpit/page.tsx` | A) KPI mandats moy. B1) Retirer formation. C2+C3) Liens cliquables |
| `src/app/(dashboard)/directeur/formation-collective/page.tsx` | **NOUVEAU** B2) Page formation dédiée |
| `src/app/(dashboard)/directeur/conseiller/[id]/page.tsx` | **NOUVEAU** C1) Page détail conseiller |
| `src/components/layout/sidebar.tsx` | B3) Nav item formation |
| `src/components/layout/header.tsx` | B4) Page title |

## Checklist validation (6 tests)

1. Cockpit > Vue globale > Résumé agence: KPI "Mandats moy./conseiller/mois" affiché (valeur numérique en mode mois, "N/A" en semaine)
2. Cockpit > Vue globale: Section "Formation Collective" absente
3. Sidebar Directeur: item "Formation Collective" visible, cliquable, mène à `/directeur/formation-collective`
4. `/directeur/formation-collective`: contenu formation affiché (priorité, domaines, NXT Training)
5. Cockpit > Par équipe > clic sur un conseiller: navigue vers `/directeur/conseiller/{id}?period=mois`, affiche KPIs + ratios
6. Cockpit > Par conseiller > clic sur une ligne: même navigation, même page détail
