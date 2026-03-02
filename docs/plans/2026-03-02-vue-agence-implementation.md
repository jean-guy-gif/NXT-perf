# Vue Agence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "directeur d'agence" role with a dedicated `/directeur/` dashboard showing org-wide KPIs, team overview, and rankings across all teams.

**Architecture:** New `directeur` role extends `UserRole`. Dedicated route group `/directeur/` with layout guard. Reuses existing chart/KPI components with org-wide data aggregation via a `useDirectorData` hook. Mock data expanded to 3 teams for demo mode.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand, Recharts, Tailwind CSS, Radix UI, Lucide icons.

---

### Task 1: Extend UserRole type and DbProfile role

**Files:**
- Modify: `src/types/user.ts:1`
- Modify: `src/types/database.ts:25`

**Step 1: Add `directeur` to UserRole**

In `src/types/user.ts`, change line 1:
```typescript
export type UserRole = "conseiller" | "manager" | "directeur";
```

**Step 2: Add `directeur` to DbProfile role**

In `src/types/database.ts`, change line 25:
```typescript
  role: "conseiller" | "manager" | "directeur";
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (existing code uses `"conseiller" | "manager"` comparisons which still work with a union extension).

**Step 4: Commit**

```bash
git add src/types/user.ts src/types/database.ts
git commit -m "feat: add directeur role to UserRole and DbProfile types"
```

---

### Task 2: Update switchRole to support directeur <-> manager

**Files:**
- Modify: `src/stores/app-store.ts:172-181`

**Step 1: Update switchRole logic**

Replace the `switchRole` function (lines 172-181) with:

```typescript
  switchRole: () => {
    const current = get().user;
    if (!current) return;
    const users = get().users;

    if (current.role === "directeur") {
      // Directeur → Manager (find the manager that is also the directeur)
      const managerSelf = users.find(
        (u) => u.role === "manager" && u.id === current.id
      );
      if (managerSelf) {
        set({ user: { ...current, role: "manager" } });
      } else {
        const anyManager = users.find((u) => u.role === "manager");
        if (anyManager) set({ user: anyManager });
      }
    } else if (current.role === "manager") {
      // Check if this user is actually a directeur who switched down
      const directeur = users.find((u) => u.role === "directeur");
      if (directeur && directeur.id === current.id) {
        // Manager → Directeur (switch back up)
        set({ user: { ...current, role: "directeur" } });
      } else {
        // Regular manager → conseiller (existing behavior)
        const conseiller = users.find((u) => u.role === "conseiller");
        if (conseiller) set({ user: conseiller });
      }
    } else {
      // Conseiller → Manager (existing behavior)
      const manager = users.find((u) => u.role === "manager");
      if (manager) set({ user: manager });
    }
  },
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/stores/app-store.ts
git commit -m "feat: update switchRole to support directeur <-> manager toggle"
```

---

### Task 3: Add mock data for 3 teams + directeur user

**Files:**
- Modify: `src/data/mock-users.ts`
- Modify: `src/data/mock-results.ts`
- Modify: `src/data/mock-team.ts`

**Step 1: Add directeur user, 2 new managers, and 5 new agents to mock-users.ts**

Add after the existing mockUsers array (before the closing `];`). The directeur replaces the existing manager m-demo (same person, promoted to directeur). We also add manager m-demo as a separate entry with role manager to support switchRole.

Actually, simpler approach: the directeur is a NEW user who is also manager of team-demo. We change m-demo's role to "directeur" and add 2 new managers + their agents.

Replace the mockUsers array entirely:

```typescript
export const mockUsers: User[] = [
  // Directeur d'agence (also manager of team-demo)
  {
    id: "m-demo",
    email: "jean-guy@start-academy.fr",
    password: "demo",
    firstName: "Jean-Guy",
    lastName: "Ourmières",
    role: "directeur",
    category: "expert",
    teamId: "team-demo",
    createdAt: "2024-01-01T00:00:00Z",
  },
  // ── Team 1 (team-demo) — managed by Jean-Guy ──
  {
    id: "u-demo-1",
    email: "agent1@demo.fr",
    password: "demo",
    firstName: "Alice",
    lastName: "Martin",
    role: "conseiller",
    category: "confirme",
    teamId: "team-demo",
    managerId: "m-demo",
    createdAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "u-demo-2",
    email: "agent2@demo.fr",
    password: "demo",
    firstName: "Bob",
    lastName: "Bernard",
    role: "conseiller",
    category: "confirme",
    teamId: "team-demo",
    managerId: "m-demo",
    createdAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "u-demo-3",
    email: "agent3@demo.fr",
    password: "demo",
    firstName: "Catherine",
    lastName: "Durand",
    role: "conseiller",
    category: "expert",
    teamId: "team-demo",
    managerId: "m-demo",
    createdAt: "2024-02-15T00:00:00Z",
  },
  // ── Team 2 (team-beta) — Manager: Sophie Lemaire ──
  {
    id: "m-demo-2",
    email: "sophie@start-academy.fr",
    password: "demo",
    firstName: "Sophie",
    lastName: "Lemaire",
    role: "manager",
    category: "confirme",
    teamId: "team-beta",
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "u-demo-b1",
    email: "agentb1@demo.fr",
    password: "demo",
    firstName: "Lucas",
    lastName: "Morel",
    role: "conseiller",
    category: "confirme",
    teamId: "team-beta",
    managerId: "m-demo-2",
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "u-demo-b2",
    email: "agentb2@demo.fr",
    password: "demo",
    firstName: "Marine",
    lastName: "Roche",
    role: "conseiller",
    category: "expert",
    teamId: "team-beta",
    managerId: "m-demo-2",
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "u-demo-b3",
    email: "agentb3@demo.fr",
    password: "demo",
    firstName: "Théo",
    lastName: "Vasseur",
    role: "conseiller",
    category: "debutant",
    teamId: "team-beta",
    managerId: "m-demo-2",
    createdAt: "2024-03-15T00:00:00Z",
  },
  // ── Team 3 (team-gamma) — Manager: Marc Fontaine ──
  {
    id: "m-demo-3",
    email: "marc@start-academy.fr",
    password: "demo",
    firstName: "Marc",
    lastName: "Fontaine",
    role: "manager",
    category: "expert",
    teamId: "team-gamma",
    createdAt: "2024-02-01T00:00:00Z",
  },
  {
    id: "u-demo-g1",
    email: "agentg1@demo.fr",
    password: "demo",
    firstName: "Julie",
    lastName: "Carpentier",
    role: "conseiller",
    category: "confirme",
    teamId: "team-gamma",
    managerId: "m-demo-3",
    createdAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "u-demo-g2",
    email: "agentg2@demo.fr",
    password: "demo",
    firstName: "Nicolas",
    lastName: "Mercier",
    role: "conseiller",
    category: "debutant",
    teamId: "team-gamma",
    managerId: "m-demo-3",
    createdAt: "2024-04-01T00:00:00Z",
  },
];
```

Note: We reduced team-demo from 8 to 3 agents, and added team-beta (3 agents) and team-gamma (2 agents). Total: 1 directeur + 2 managers + 8 agents = 11 users.

**Step 2: Add mock results for new agents in mock-results.ts**

Add to the `mockResults` array (keep existing r-manager, r1, r2, r3 entries, remove r4-r8 since those agents are removed). Add results for the new agents:

```typescript
  // ── Team 2 results ──
  // Sophie Lemaire (manager team-beta)
  {
    id: "r-m2",
    userId: "m-demo-2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 28,
      contactsTotaux: 45,
      rdvEstimation: 4,
      informationsVente: [
        { id: "iv-s1", nom: "M. Duplessis", commentaire: "Vente résidence principale", statut: "deale" },
        { id: "iv-s2", nom: "Mme Cartier", commentaire: "Investissement locatif", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "ms1", nomVendeur: "M. Duplessis", type: "exclusif" },
        { id: "ms2", nomVendeur: "Mme Cartier", type: "exclusif" },
        { id: "ms3", nomVendeur: "M. Roy", type: "simple" },
      ],
      rdvSuivi: 6,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acs1", nom: "Couple Dumas", commentaire: "Budget 400k", statut: "deale" },
        { id: "acs2", nom: "M. Rivière", commentaire: "Investisseur", statut: "en_cours" },
      ],
      acheteursSortisVisite: 5,
      nombreVisites: 10,
      offresRecues: 3,
      compromisSignes: 2,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 18000,
      delaiMoyenVente: 65,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
  // Lucas Morel (team-beta, confirmé)
  {
    id: "r-b1",
    userId: "u-demo-b1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 22,
      contactsTotaux: 40,
      rdvEstimation: 3,
      informationsVente: [
        { id: "iv-b1", nom: "M. Blanc", commentaire: "Succession", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 3,
      estimationsRealisees: 3,
      mandatsSignes: 2,
      mandats: [
        { id: "mb1", nomVendeur: "M. Blanc", type: "exclusif" },
        { id: "mb2", nomVendeur: "Mme Giraud", type: "simple" },
      ],
      rdvSuivi: 4,
      requalificationSimpleExclusif: 0,
      baissePrix: 1,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acb1", nom: "M. Petit", commentaire: "Premier achat", statut: "en_cours" },
      ],
      acheteursSortisVisite: 3,
      nombreVisites: 8,
      offresRecues: 2,
      compromisSignes: 1,
    },
    ventes: {
      actesSignes: 1,
      chiffreAffaires: 12000,
      delaiMoyenVente: 70,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-24T10:00:00Z",
  },
  // Marine Roche (team-beta, expert)
  {
    id: "r-b2",
    userId: "u-demo-b2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 40,
      contactsTotaux: 60,
      rdvEstimation: 7,
      informationsVente: [
        { id: "iv-b2a", nom: "SCI Méridien", commentaire: "Portefeuille 3 lots", statut: "deale" },
        { id: "iv-b2b", nom: "M. Pons", commentaire: "Villa prestige", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 7,
      estimationsRealisees: 6,
      mandatsSignes: 5,
      mandats: [
        { id: "mb3", nomVendeur: "SCI Méridien", type: "exclusif" },
        { id: "mb4", nomVendeur: "M. Pons", type: "exclusif" },
        { id: "mb5", nomVendeur: "Mme Lepage", type: "exclusif" },
        { id: "mb6", nomVendeur: "M. Collin", type: "exclusif" },
        { id: "mb7", nomVendeur: "Mme Brun", type: "simple" },
      ],
      rdvSuivi: 10,
      requalificationSimpleExclusif: 2,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acb2", nom: "Groupe Invest Sud", commentaire: "Budget 900k", statut: "deale" },
        { id: "acb3", nom: "M. et Mme Faure", commentaire: "Résidence secondaire", statut: "deale" },
      ],
      acheteursSortisVisite: 8,
      nombreVisites: 15,
      offresRecues: 5,
      compromisSignes: 4,
    },
    ventes: {
      actesSignes: 3,
      chiffreAffaires: 52000,
      delaiMoyenVente: 45,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-27T10:00:00Z",
  },
  // Théo Vasseur (team-beta, junior)
  {
    id: "r-b3",
    userId: "u-demo-b3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 15,
      contactsTotaux: 35,
      rdvEstimation: 1,
      informationsVente: [],
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 1,
      mandatsSignes: 0,
      mandats: [],
      rdvSuivi: 1,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [],
      acheteursSortisVisite: 1,
      nombreVisites: 5,
      offresRecues: 0,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  // ── Team 3 results ──
  // Marc Fontaine (manager team-gamma)
  {
    id: "r-m3",
    userId: "m-demo-3",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 35,
      contactsTotaux: 50,
      rdvEstimation: 6,
      informationsVente: [
        { id: "iv-marc1", nom: "M. Lefèvre", commentaire: "Divorce, vente rapide", statut: "deale" },
        { id: "iv-marc2", nom: "Mme Guérin", commentaire: "Déménagement province", statut: "deale" },
      ],
    },
    vendeurs: {
      rdvEstimation: 6,
      estimationsRealisees: 5,
      mandatsSignes: 4,
      mandats: [
        { id: "mf1", nomVendeur: "M. Lefèvre", type: "exclusif" },
        { id: "mf2", nomVendeur: "Mme Guérin", type: "exclusif" },
        { id: "mf3", nomVendeur: "M. Bailly", type: "exclusif" },
        { id: "mf4", nomVendeur: "Mme Caron", type: "simple" },
      ],
      rdvSuivi: 7,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acm3a", nom: "M. Royer", commentaire: "Investisseur multi-lots", statut: "deale" },
        { id: "acm3b", nom: "Couple André", commentaire: "Résidence principale 500k", statut: "en_cours" },
      ],
      acheteursSortisVisite: 6,
      nombreVisites: 11,
      offresRecues: 4,
      compromisSignes: 3,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 28000,
      delaiMoyenVente: 55,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-26T10:00:00Z",
  },
  // Julie Carpentier (team-gamma, confirmé)
  {
    id: "r-g1",
    userId: "u-demo-g1",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 30,
      contactsTotaux: 48,
      rdvEstimation: 4,
      informationsVente: [
        { id: "iv-g1", nom: "M. Picard", commentaire: "Retraite, maison de ville", statut: "deale" },
        { id: "iv-g2", nom: "Mme Aubry", commentaire: "Investissement locatif T2", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 4,
      estimationsRealisees: 4,
      mandatsSignes: 3,
      mandats: [
        { id: "mg1", nomVendeur: "M. Picard", type: "exclusif" },
        { id: "mg2", nomVendeur: "Mme Aubry", type: "exclusif" },
        { id: "mg3", nomVendeur: "M. Leconte", type: "simple" },
      ],
      rdvSuivi: 5,
      requalificationSimpleExclusif: 1,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [
        { id: "acg1", nom: "M. et Mme Dumont", commentaire: "Budget 350k, T4", statut: "deale" },
        { id: "acg2", nom: "Mlle Perrot", commentaire: "Premier achat 200k", statut: "en_cours" },
      ],
      acheteursSortisVisite: 5,
      nombreVisites: 12,
      offresRecues: 3,
      compromisSignes: 2,
    },
    ventes: {
      actesSignes: 2,
      chiffreAffaires: 22000,
      delaiMoyenVente: 62,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-25T10:00:00Z",
  },
  // Nicolas Mercier (team-gamma, junior)
  {
    id: "r-g2",
    userId: "u-demo-g2",
    periodType: "month",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    prospection: {
      contactsEntrants: 12,
      contactsTotaux: 30,
      rdvEstimation: 1,
      informationsVente: [
        { id: "iv-g3", nom: "M. Vernet", commentaire: "Appartement T3", statut: "en_cours" },
      ],
    },
    vendeurs: {
      rdvEstimation: 1,
      estimationsRealisees: 1,
      mandatsSignes: 1,
      mandats: [
        { id: "mg4", nomVendeur: "M. Vernet", type: "simple" },
      ],
      rdvSuivi: 2,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursChauds: [],
      acheteursSortisVisite: 1,
      nombreVisites: 4,
      offresRecues: 0,
      compromisSignes: 0,
    },
    ventes: {
      actesSignes: 0,
      chiffreAffaires: 0,
      delaiMoyenVente: 0,
    },
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-12T10:00:00Z",
  },
```

**Step 3: Update mock-team.ts alerts to reference existing agents**

Update the alerts array in `mockTeamStats` to reference agents that still exist (u-demo-1, u-demo-2, u-demo-3 from team-demo).

**Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/data/mock-users.ts src/data/mock-results.ts src/data/mock-team.ts
git commit -m "feat: add 3-team mock data with directeur, 2 extra managers, and 8 agents"
```

---

### Task 4: Update enterDemo to start as directeur

**Files:**
- Modify: `src/stores/app-store.ts:82-93`

**Step 1: Update enterDemo**

The demo user (mockUsers[0]) is now the directeur. Update the enterDemo function — no code change needed since it already picks `mockUsers[0]`. But verify it works by checking the role is `directeur`.

Actually, the manager layout guard checks `user?.role !== "manager"` and redirects. So when the directeur switches to manager mode, the sidebar and layout must allow it. This is handled by the switchRole update in Task 2.

No change needed here — enterDemo already picks `mockUsers[0]` which is now the directeur.

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

---

### Task 5: Update sidebar navigation for directeur

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add Building2 import and directorOnly flag**

Add `Building2` to the lucide imports and extend NavItem:

```typescript
interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
  directorOnly?: boolean;
}
```

**Step 2: Add directeur nav items**

After the manager items in the `navItems` array (before the Settings item), add:

```typescript
  { href: "/directeur/cockpit", icon: Building2, label: "Cockpit Agence", directorOnly: true },
  { href: "/directeur/equipes", icon: Users, label: "Équipes", directorOnly: true },
  { href: "/directeur/classement", icon: Trophy, label: "Classement Agence", directorOnly: true },
```

**Step 3: Update filtering logic**

Replace the filtering and rendering logic:

```typescript
  const isManager = user?.role === "manager" || user?.role === "directeur";
  const isDirector = user?.role === "directeur";

  const filteredItems = navItems.filter((item) => {
    if (item.managerOnly) return isManager;
    if (item.directorOnly) return isDirector;
    return true;
  });

  const advisorItems = filteredItems.filter((item) => !item.managerOnly && !item.directorOnly);
  const managerItems = filteredItems.filter((item) => item.managerOnly);
  const directorItems = filteredItems.filter((item) => item.directorOnly);
```

**Step 4: Render directeur section with divider**

Add after the manager items rendering block:

```tsx
      {directorItems.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-sidebar-border" />
          <div className="flex flex-col items-center gap-1">
            {directorItems.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </>
      )}
```

**Step 5: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add directeur section to sidebar navigation"
```

---

### Task 6: Update header for directeur role switch + page titles

**Files:**
- Modify: `src/components/layout/header.tsx`

**Step 1: Add directeur page titles**

Add to the `pageTitles` record:

```typescript
  "/directeur/cockpit": "Cockpit Agence",
  "/directeur/equipes": "Équipes",
  "/directeur/classement": "Classement Agence",
```

**Step 2: Update switchRole button**

Update the switch button (line 101-109) to show for directeur too, and update the title:

```tsx
        {isDemo && (user?.role === "manager" || user?.role === "directeur") && (
          <button
            onClick={switchRole}
            title={`Basculer en mode ${user?.role === "directeur" ? "manager" : "directeur"}`}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        )}
```

**Step 3: Show add-agent button for directeur too**

Update line 118 from `user?.role === "manager"` to `user?.role === "manager" || user?.role === "directeur"`.

**Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: update header with directeur page titles and role switch"
```

---

### Task 7: Update manager layout to accept directeur

**Files:**
- Modify: `src/app/(dashboard)/manager/layout.tsx`

**Step 1: Allow directeur to access manager pages**

Update the guard condition:

```typescript
  if (user?.role !== "manager" && user?.role !== "directeur") {
    redirect("/dashboard");
  }
```

This allows the directeur to also use manager pages when browsing them.

**Step 2: Commit**

```bash
git add src/app/(dashboard)/manager/layout.tsx
git commit -m "feat: allow directeur role to access manager pages"
```

---

### Task 8: Create directeur layout with guard

**Files:**
- Create: `src/app/(dashboard)/directeur/layout.tsx`

**Step 1: Create the layout**

```typescript
"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";

export default function DirecteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "directeur") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/directeur/layout.tsx
git commit -m "feat: add directeur layout with role guard"
```

---

### Task 9: Create useDirectorData hook

**Files:**
- Create: `src/hooks/use-director-data.ts`

**Step 1: Create the hook**

```typescript
"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { ComputedRatio } from "@/types/ratios";

export interface TeamAggregate {
  teamId: string;
  teamName: string;
  managerId: string;
  managerName: string;
  agents: User[];
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  totalExclusifs: number;
  avgExclusivite: number;
  avgPerformance: number;
  agentCount: number;
}

export interface OrgStats {
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  avgExclusivite: number;
  avgPerformance: number;
  totalAgents: number;
  totalManagers: number;
  teamCount: number;
}

export function useDirectorData() {
  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const allConseillers = useMemo(
    () => users.filter((u) => u.role === "conseiller"),
    [users]
  );

  const allManagers = useMemo(
    () => users.filter((u) => u.role === "manager" || u.role === "directeur"),
    [users]
  );

  const teams = useMemo(() => {
    // Group agents by teamId
    const teamMap = new Map<string, { managerId: string; managerName: string; agents: User[] }>();

    for (const manager of allManagers) {
      if (!teamMap.has(manager.teamId)) {
        teamMap.set(manager.teamId, {
          managerId: manager.id,
          managerName: `${manager.firstName} ${manager.lastName}`,
          agents: [],
        });
      }
    }

    for (const agent of allConseillers) {
      const entry = teamMap.get(agent.teamId);
      if (entry) {
        entry.agents.push(agent);
      }
    }

    const result: TeamAggregate[] = [];
    for (const [teamId, { managerId, managerName, agents }] of teamMap) {
      const stats = computeTeamStats(agents, allResults, ratioConfigs);
      result.push({
        teamId,
        teamName: getTeamLabel(teamId),
        managerId,
        managerName,
        agents,
        ...stats,
      });
    }

    return result.sort((a, b) => b.totalCA - a.totalCA);
  }, [allConseillers, allManagers, allResults, ratioConfigs]);

  const orgStats = useMemo((): OrgStats => {
    let totalCA = 0;
    let totalActes = 0;
    let totalMandats = 0;
    let totalExclusifs = 0;
    let totalPerformance = 0;
    let advisorCount = 0;

    for (const agent of allConseillers) {
      const results = allResults.find((r) => r.userId === agent.id);
      if (!results) continue;
      advisorCount++;
      totalCA += results.ventes.chiffreAffaires;
      totalActes += results.ventes.actesSignes;
      totalMandats += results.vendeurs.mandats.length;
      totalExclusifs += results.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
      const ratios = computeAllRatios(results, agent.category, ratioConfigs);
      if (ratios.length > 0) {
        totalPerformance += ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length;
      }
    }

    const avgExclusivite = totalMandats > 0 ? Math.round((totalExclusifs / totalMandats) * 100) : 0;
    const avgPerformance = advisorCount > 0 ? Math.round(totalPerformance / advisorCount) : 0;

    return {
      totalCA,
      totalActes,
      totalMandats,
      avgExclusivite,
      avgPerformance,
      totalAgents: allConseillers.length,
      totalManagers: allManagers.length,
      teamCount: teams.length,
    };
  }, [allConseillers, allManagers, allResults, ratioConfigs, teams.length]);

  return { teams, allConseillers, allManagers, orgStats, allResults, ratioConfigs };
}

function computeTeamStats(
  agents: User[],
  allResults: PeriodResults[],
  ratioConfigs: Record<string, import("@/types/ratios").RatioConfig>
) {
  let totalCA = 0;
  let totalActes = 0;
  let totalMandats = 0;
  let totalExclusifs = 0;
  let totalPerformance = 0;
  let advisorCount = 0;

  for (const agent of agents) {
    const results = allResults.find((r) => r.userId === agent.id);
    if (!results) continue;
    advisorCount++;
    totalCA += results.ventes.chiffreAffaires;
    totalActes += results.ventes.actesSignes;
    totalMandats += results.vendeurs.mandats.length;
    totalExclusifs += results.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
    const ratios = computeAllRatios(results, agent.category, ratioConfigs);
    if (ratios.length > 0) {
      totalPerformance += ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length;
    }
  }

  const avgExclusivite = totalMandats > 0 ? Math.round((totalExclusifs / totalMandats) * 100) : 0;
  const avgPerformance = advisorCount > 0 ? Math.round(totalPerformance / advisorCount) : 0;

  return {
    totalCA,
    totalActes,
    totalMandats,
    totalExclusifs,
    avgExclusivite,
    avgPerformance,
    agentCount: agents.length,
  };
}

function getTeamLabel(teamId: string): string {
  const labels: Record<string, string> = {
    "team-demo": "Équipe Jean-Guy",
    "team-beta": "Équipe Sophie",
    "team-gamma": "Équipe Marc",
  };
  return labels[teamId] ?? teamId;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/hooks/use-director-data.ts
git commit -m "feat: add useDirectorData hook for org-wide aggregation"
```

---

### Task 10: Create Cockpit Agence page

**Files:**
- Create: `src/app/(dashboard)/directeur/cockpit/page.tsx`

**Step 1: Create the cockpit page**

Build a page with 3 tabs (Vue globale / Par équipe / Par conseiller) using the `useDirectorData` hook. Reuse KpiCard, LineChart, BarChart, ProgressBar components.

Key sections:
- **Header:** "Cockpit Agence" + team count badge
- **Tab bar:** Vue globale | Par équipe | Par conseiller
- **Vue globale tab:**
  - 4 KPI cards (CA total, Actes total, Exclusivité moyenne, Performance moyenne)
  - Team summary cards (one per team showing name, manager, agent count, CA, performance)
- **Par équipe tab:**
  - Cards per team with detailed KPIs: CA, Actes, Mandats, Exclusivité, Performance
  - Each card shows manager name, agent count, progress bar
- **Par conseiller tab:**
  - Sortable table: Name, Équipe, CA, Actes, Performance
  - Category badges

The page should import from: `@/hooks/use-director-data`, `@/components/dashboard/kpi-card`, `@/components/charts/progress-bar`, `@/lib/formatters`, `@/lib/constants`, lucide icons.

See manager cockpit (`src/app/(dashboard)/manager/cockpit/page.tsx`) for styling patterns to reuse.

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/directeur/cockpit/page.tsx
git commit -m "feat: add cockpit agence page with global/team/agent tabs"
```

---

### Task 11: Create Equipes page

**Files:**
- Create: `src/app/(dashboard)/directeur/equipes/page.tsx`

**Step 1: Create the equipes page**

Read-only view showing all teams in the organization:
- Card per team: team name, manager name + avatar initials, agent count, aggregated KPIs (CA, Performance)
- Agent list within each card (collapsible): name, category badge, CA, performance progress bar
- Section for unassigned agents (agents with no managerId)

Uses `useDirectorData` hook. No CRUD operations (directeur observes, managers manage).

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/directeur/equipes/page.tsx
git commit -m "feat: add equipes page showing all teams in organization"
```

---

### Task 12: Create Classement Agence page

**Files:**
- Create: `src/app/(dashboard)/directeur/classement/page.tsx`

**Step 1: Create the classement page**

Two tabs: **Par conseiller** | **Par équipe**

Reuse the ranking pattern from manager classement (`src/app/(dashboard)/manager/classement/page.tsx`):
- Same metric selector (Estimations, Mandats, Visites, Offres, Compromis, Actes, CA)
- Same Top 3 / "A suivre" layout
- Same full ranking table

**Par conseiller tab:** Rank ALL agents in the org (not just one team).
**Par équipe tab:** Rank teams by aggregated metrics.

Build rankings from real data using `useDirectorData().allConseillers` and the same `buildRankings`-style logic from the manager classement page, but without the team filter.

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/directeur/classement/page.tsx
git commit -m "feat: add classement agence page with agent and team rankings"
```

---

### Task 13: Update manager cockpit conseillers filter

**Files:**
- Modify: `src/app/(dashboard)/manager/cockpit/page.tsx:212-217`

**Step 1: When the directeur switches to manager view, cockpit should filter to their team**

The existing filter already works:
```typescript
if (isDemo) return u.teamId === currentUser.teamId;
```

Since the directeur has `teamId: "team-demo"`, when they switch to manager role, the cockpit will show only team-demo agents. No change needed.

Verify by checking the switchRole flow end-to-end in the dev server.

---

### Task 14: SQL migration for directeur role

**Files:**
- Create: `supabase/migrations/010_directeur_role.sql`

**Step 1: Create the migration**

```sql
-- Migration 010: Add directeur role
-- Extends the role check constraint on profiles to include 'directeur'

-- 1. Drop the existing check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add the new constraint with directeur
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('conseiller', 'manager', 'directeur'));

-- 3. Helper function: check if current user is directeur
CREATE OR REPLACE FUNCTION public.is_directeur()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'directeur'
  )
$$;

-- 4. Grant directeur org-wide read access to results
-- (Directeur can see all results in their org, not just their team)
DROP POLICY IF EXISTS "results_select" ON public.period_results;
CREATE POLICY "results_select" ON public.period_results
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_in_my_team(user_id)
    OR (public.is_directeur() AND user_id IN (
      SELECT id FROM public.profiles WHERE org_id = public.get_my_org_id()
    ))
  );

-- 5. Grant directeur org-wide read access to objectives
DROP POLICY IF EXISTS "objectives_select" ON public.objectives;
CREATE POLICY "objectives_select" ON public.objectives
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_in_my_team(user_id)
    OR (public.is_directeur() AND user_id IN (
      SELECT id FROM public.profiles WHERE org_id = public.get_my_org_id()
    ))
  );

-- 6. Grant directeur read access to all teams in org
DROP POLICY IF EXISTS "teams_select" ON public.teams;
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    org_id = public.get_my_org_id()
  );

-- 7. Grant directeur read access to all profiles in org
-- (Already exists via org_id RLS, but ensure it covers directeur)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR org_id = public.get_my_org_id()
  );
```

**Step 2: Commit**

```bash
git add supabase/migrations/010_directeur_role.sql
git commit -m "feat: add SQL migration for directeur role with org-wide RLS"
```

---

### Task 15: Final verification and build

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 2: Run linter**

Run: `npx next lint`
Expected: No errors.

**Step 3: Run production build**

Run: `npx next build`
Expected: Build succeeds.

**Step 4: Manual smoke test**

Run: `npx next dev --port 3000 --hostname 0.0.0.0`

Test in browser:
1. Click "Mode Démo" → should land as directeur
2. Sidebar shows Directeur section (Cockpit Agence, Équipes, Classement Agence) + Manager section
3. Navigate to `/directeur/cockpit` → see org-wide KPIs, 3 tabs work
4. Navigate to `/directeur/equipes` → see 3 team cards
5. Navigate to `/directeur/classement` → see org-wide rankings
6. Switch role (ArrowLeftRight) → becomes manager → sidebar shows Manager section without Directeur section
7. Manager cockpit shows only team-demo agents
8. Switch back → becomes directeur again

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: final adjustments for vue agence"
```
