# Audit système de rôles & onboarding — Plan de correction

**Date:** 2026-03-03
**Branche:** `feat/institution-hierarchy`

---

## Diagnostic : 5 incohérences structurantes

### 1. Schisme `conseiller` ↔ `agent`
- `UserRole` = `"conseiller"` (type canonique dans `src/types/user.ts:1`)
- `ViewId` = `"agent"` (type sidebar/views dans `src/stores/app-store.ts:14`)
- `ProfileType` = `"AGENT"` (onboarding dans `src/types/user.ts:4`)
- `rolesToViews()` fait le pont manuellement : `"conseiller" → "agent"` (`app-store.ts:25`)
- La sidebar affiche la section **"Agent"** (`sidebar.tsx:115`) pour le rôle `"conseiller"`
- Résultat : chaque nouveau dev doit savoir que `conseiller === agent` selon le contexte

### 2. `switchRole()` ne respecte pas `availableRoles`
- `app-store.ts:293-318` : c'est un **switch user** (change l'objet `user` entier en allant chercher un autre dans `users[]`), pas un vrai switch de rôle sur le même user
- Pour directeur↔manager : OK, même personne, juste `role` qui change
- Pour manager→conseiller : **remplace le user par un autre** (`users.find(u => u.role === "conseiller")`)
- `availableRoles` n'est **jamais consulté** dans `switchRole()`

### 3. `activeViews` ≠ rôle courant
- `activeViews` est dérivé une fois au login via `rolesToViews(availableRoles)` puis l'utilisateur peut les toggler
- Mais les layout guards (`manager/layout.tsx`, `directeur/layout.tsx`) vérifient `availableRoles` — pas `activeViews`
- Résultat : un user peut désactiver la vue "manager" dans la sidebar mais accéder à `/manager/cockpit` par URL directe

### 4. `deriveAvailableRoles()` est une hiérarchie rigide
- `app-store.ts:33-43` : un directeur hérite automatiquement de `["directeur", "manager", "conseiller"]`
- Un coach est isolé `["coach"]` — pas de vue agent même s'il pourrait en avoir besoin
- Ce fallback est utilisé quand la DB n'a pas `available_roles` → divergence possible entre mock et Supabase

### 5. Pas de notion de `mainRole` vs `currentRole`
- `user.role` est muté par `switchRole()` (ex: directeur→manager)
- Mais `user.availableRoles` reste inchangé
- Il n'y a pas de `mainRole` persisté pour savoir quel est le rôle "inscrit" vs le rôle "affiché"

---

## Layout guards (vérifié)

- `manager/layout.tsx:14` : check `availableRoles.includes("manager") || availableRoles.includes("directeur")`
- `directeur/layout.tsx:14` : check `availableRoles.includes("directeur")`
- Les guards NE vérifient PAS `user.role` ni `activeViews`

---

## Convention de naming recommandée

| Concept | Valeur code | Label UI (FR) |
|---|---|---|
| Rôle agent immobilier | `"conseiller"` | "Conseiller" |
| Rôle manager d'équipe | `"manager"` | "Manager" |
| Rôle directeur d'agence | `"directeur"` | "Directeur" |
| Rôle coach externe | `"coach"` | "Coach" |

**Suppression de `"agent"` partout dans le code.** Le mot "agent" ne doit apparaître que dans les commentaires/docs pour expliquer le métier. En code : `"conseiller"` uniquement.

---

## Matrice rôle → vue cible

| Rôle actif (`user.role`) | Vue par défaut | Sections sidebar | Routes accessibles |
|---|---|---|---|
| `conseiller` | `/dashboard` | Conseiller | `/dashboard`, `/resultats`, `/performance`, `/comparaison`, `/saisie`, `/formation`, `/objectifs` |
| `manager` | `/manager/cockpit` | Conseiller + Manager | + `/manager/*` |
| `directeur` | `/directeur/cockpit` | Conseiller + Manager + Directeur | + `/directeur/*` |
| `coach` | `/coach/dashboard` | Coach uniquement | `/coach/*` |

---

## Plan de correction

### Quick wins (30-60 min, ne casse pas le build)

#### QW1 — Renommer `ViewId "agent"` → `"conseiller"`

**Fichier:** `src/stores/app-store.ts`

```
// Ligne 14
- export type ViewId = "agent" | "manager" | "directeur" | "coach";
+ export type ViewId = "conseiller" | "manager" | "directeur" | "coach";

// Ligne 16-18
  export const VIEW_LABELS: Record<ViewId, string> = {
-   agent: "Agent",
+   conseiller: "Conseiller",
    manager: "Manager",

// Ligne 25
- if (roles.includes("conseiller")) views.push("agent");
+ if (roles.includes("conseiller")) views.push("conseiller");
```

**Fichier:** `src/components/layout/sidebar.tsx`

```
// Ligne 72
- const advisorItems = activeViews.includes("agent")
+ const advisorItems = activeViews.includes("conseiller")

// Ligne 115
- <SidebarSection label="Agent" collapsed={collapsed}>
+ <SidebarSection label="Conseiller" collapsed={collapsed}>
```

**Impact:** Grep pour `"agent"` dans tout le projet et remplacer les occurrences ViewId. Le header.tsx utilise probablement `VIEW_LABELS` — vérifier.

#### QW2 — `switchRole()` : consulter `availableRoles`

**Fichier:** `src/stores/app-store.ts` (remplacer lignes 293-318)

```typescript
switchRole: () => {
  const current = get().user;
  if (!current) return;
  const available = current.availableRoles;
  if (available.length <= 1) return; // Rien à switcher

  // Trouver le rôle suivant dans le cycle
  const order: UserRole[] = ["conseiller", "manager", "directeur"];
  const currentIdx = order.indexOf(current.role);

  // Chercher le prochain rôle disponible (cycle)
  for (let i = 1; i <= order.length; i++) {
    const nextIdx = (currentIdx + i) % order.length;
    const candidate = order[nextIdx];
    if (available.includes(candidate)) {
      set({ user: { ...current, role: candidate } });
      return;
    }
  }
},
```

**Note:** Coach est exclu du cycle (rôle isolé). Le user reste le même objet, seul `role` change.

#### QW3 — Ajouter `mainRole` au type `User`

**Fichier:** `src/types/user.ts`

```
  export interface User {
    id: string;
    email: string;
    // ...
    role: UserRole;           // rôle actif (peut changer via switchRole)
+   mainRole: UserRole;       // rôle d'inscription (ne change jamais)
    availableRoles: UserRole[];
    // ...
  }
```

**Impact:** setter `mainRole = role` à la création du user (register, demo, setProfile). Ne jamais le muter dans switchRole.

### Fix structurel (1-2h)

#### FS1 — `switchRole(targetRole: UserRole)` avec argument explicite

Remplacer le cycle aveugle par un switch ciblé. Le header/UI appelle `switchRole("manager")` directement.

```typescript
switchRole: (targetRole?: UserRole) => {
  const current = get().user;
  if (!current) return;
  const available = current.availableRoles;

  if (targetRole) {
    // Switch ciblé
    if (!available.includes(targetRole)) return;
    set({ user: { ...current, role: targetRole } });
  } else {
    // Cycle (fallback pour le bouton toggle)
    // ... logique cycle QW2
  }
},
```

**Fichier store interface:** ajouter `switchRole: (targetRole?: UserRole) => void;`

#### FS2 — `activeViews` dérivé du rôle actif (pas de toggle libre)

Remplacer le toggle manuel par une dérivation automatique :

```typescript
// Computed getter, pas un état mutable
function viewsForRole(role: UserRole): ViewId[] {
  switch (role) {
    case "directeur": return ["conseiller", "manager", "directeur"];
    case "manager":   return ["conseiller", "manager"];
    case "coach":     return ["coach"];
    default:          return ["conseiller"];
  }
}
```

`activeViews` devient un getter dérivé de `user.role`, pas un état indépendant. Supprimer `toggleView()`.

#### FS3 — Supprimer `deriveAvailableRoles()`

La source de vérité est la DB (`available_roles` column) ou le mock data. Si la DB ne renvoie pas `available_roles`, fallback = `[role]` (pas de hiérarchie implicite).

#### FS4 — Layout guards : vérifier `user.role` en plus de `availableRoles`

```typescript
// manager/layout.tsx
const user = useAppStore((s) => s.user);
if (!user || (user.role !== "manager" && user.role !== "directeur")) {
  redirect("/dashboard");
}
```

Ainsi, un directeur qui a switchRole vers "conseiller" ne peut plus accéder à `/manager/*` sans re-switcher.

---

## Checklist de validation (5 tests)

1. **Login demo → sidebar** : la section s'appelle "Conseiller" (pas "Agent")
2. **Switch role (directeur → manager → conseiller)** : le même user reste connecté, seul `role` change, la sidebar reflète les vues du rôle actif
3. **URL directe `/manager/cockpit` en tant que conseiller** : redirige vers `/dashboard`
4. **Coach login** : voit uniquement la section Coach, pas de section Conseiller
5. **`user.mainRole`** reste constant après un switchRole (vérifier dans le store devtools)

---

## Fichiers impactés (résumé)

| Fichier | Quick wins | Fix structurel |
|---|---|---|
| `src/types/user.ts` | QW3 (mainRole) | — |
| `src/stores/app-store.ts` | QW1 (ViewId), QW2 (switchRole) | FS1, FS2, FS3 |
| `src/components/layout/sidebar.tsx` | QW1 (label + includes) | — |
| `src/components/layout/header.tsx` | QW1 (VIEW_LABELS ref) | FS1 (switchRole arg) |
| `src/app/(dashboard)/manager/layout.tsx` | — | FS4 |
| `src/app/(dashboard)/directeur/layout.tsx` | — | FS4 |
| `src/app/(dashboard)/coach/layout.tsx` | — | FS4 |
| `src/data/mock-users.ts` | QW3 (mainRole) | FS3 |
