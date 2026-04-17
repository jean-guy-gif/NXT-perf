# Dette technique — à suivre

Ce document liste les approximations / hypothèses métier introduites
pendant la refonte KPI conseiller et qu'il faut recalibrer quand les
données réelles (backend Supabase, CRM) seront branchées.

---

## 1. Placeholder `chiffreAffairesCompromis`

**Fichiers concernés :**

- `src/data/mock-results.ts`
- `src/data/mock-network.ts`

**Règle actuelle :** les valeurs de `chiffreAffairesCompromis` dans les
mocks sont dérivées d'une heuristique placeholder :

```
chiffreAffairesCompromis ≈ compromisSignes × 15 000 €
```

Cette valeur n'a **aucune justification métier** : elle sert uniquement
à alimenter les cartes CA compromis du dashboard en phase mock.

**Action à faire** : remplacer par des valeurs réelles issues du CRM ou
par une règle calibrée (honoraires moyens par catégorie × compromis)
dès que le backend est branché.

---

## 2. Hypothèse `MANDAT_TO_ACTE_RATE` dans `calculateObjectiveBreakdown`

**Fichier :** `src/lib/objectifs.ts`

**Problème :** les anciens ratios `mandats_simples_vente` et
`mandats_exclusifs_vente` ont été retirés du référentiel. Il n'existe
donc plus de ratio direct `mandat → acte` permettant de dimensionner
le volume de mandats nécessaires pour atteindre un objectif de CA.

**Hypothèse actuelle :** constante fixe documentée en tête du fichier :

```ts
const MANDAT_TO_ACTE_RATE = 0.6;  // 60 % des mandats aboutissent à un acte
```

Ce taux couvre les abandons, retraits vendeurs, mandats simples vendus
par la concurrence, etc. Il est **arbitraire** en phase mock.

**Action à faire** : introduire un ratio officiel `mandats_actes` dans
le référentiel et remplacer la constante par la lecture de ce ratio.
À discuter avec le métier pour calibrer la valeur cible par catégorie.

---

## 3. Garde anti-régression sur les KPI legacy

**Source du problème :** durant la refonte, les types `VenteInfo`,
`AcheteurChaud` et les champs `contactsEntrants`, `informationsVente`,
`acheteursChauds`, `delaiMoyenVente` ont été réintroduits **après leur
suppression** par un agent externe (probablement un assistant IA tiers
installé dans l'IDE — `.codebuddy/`, `.continue/`, `.kiro/`, `.qoder/`,
`.roo/`, `.trae/`, ou la mémoire `claude-mem`). Aucun hook côté projet
ne les régénère (pas de husky, pas de codegen, pas de hook de build).

**Garde mise en place :**

1. **`src/types/results.ts`** — commentaire-garde en tête du fichier
   listant explicitement les noms interdits.
2. **`eslint.config.mjs`** — règle `no-restricted-syntax` qui fait
   échouer le lint dès qu'un identifiant ou un littéral string parmi
   la liste `LEGACY_KPI_IDENTIFIERS` apparaît dans `src/`. Vérifié :
   `npx eslint src` ne remonte aucune violation aujourd'hui.

**Action côté utilisateur (hors codebase) :**

- Vérifier que les assistants IA tiers (`.codebuddy/`, `.continue/`,
  `.kiro/`, `.qoder/`, `.roo/`, `.trae/`) ne sont pas configurés pour
  réécrire automatiquement ce repo.
- Si la mémoire `claude-mem` est active globalement, envisager de la
  désactiver pour ce projet ou de purger les patterns liés aux anciens
  KPI.
- Si un nouvel agent réinjecte malgré tout les types, le lint le
  bloquera et le CI échouera — c'est le filet de sécurité côté projet.
