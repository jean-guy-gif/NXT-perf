import { create } from "zustand";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { DbProfile } from "@/types/database";
import { mockUsers } from "@/data/mock-users";
import { mockResults } from "@/data/mock-results";
import { defaultRatioConfigs } from "@/data/mock-ratios";

export type RemovalReason = "deale" | "abandonne";

export interface RemovedItem {
  id: string;
  nom: string;
  commentaire: string;
  type: "info_vente" | "acheteur_chaud";
  reason: RemovalReason;
  removedAt: string;
}

interface AppState {
  // ── Auth ──
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  profile: DbProfile | null;
  orgInviteCode: string | null;

  // ── Data (cache for Supabase, or mock for demo) ──
  users: User[];
  results: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  removedItems: RemovedItem[];

  // ── Demo mode ──
  enterDemo: () => void;
  exitDemo: () => void;

  // ── Auth actions (used in demo mode only) ──
  login: (email: string, password: string) => "success" | "not_found" | "wrong_password";
  logout: () => void;
  register: (user: User) => void;
  updateUserPassword: (email: string, newPassword: string) => boolean;

  // ── Supabase auth ──
  setProfile: (profile: DbProfile | null) => void;
  setAuthenticated: (authed: boolean) => void;
  setOrgInviteCode: (code: string | null) => void;

  // ── Data actions (used in both modes) ──
  setUser: (user: User) => void;
  switchRole: () => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  assignAgent: (agentId: string, managerId: string) => void;
  unassignAgent: (agentId: string) => void;
  addResults: (result: PeriodResults) => void;
  setResults: (results: PeriodResults[]) => void;
  updateInfoVenteStatut: (resultId: string, itemId: string, statut: "deale" | "abandonne") => void;
  updateAcheteurChaudStatut: (resultId: string, itemId: string, statut: "deale" | "abandonne") => void;
  setRatioConfigs: (configs: Record<RatioId, RatioConfig>) => void;
  updateRatioThreshold: (
    ratioId: RatioId,
    level: "debutant" | "confirme" | "expert",
    value: number
  ) => void;
  resetRatioConfigs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isDemo: false,
  profile: null,
  orgInviteCode: null,
  users: [],
  results: [],
  ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
  removedItems: [],

  // ── Demo mode ──
  enterDemo: () => {
    const demoUser = mockUsers[0];
    document.cookie = "nxt-demo-mode=true;path=/;max-age=86400";
    set({
      isDemo: true,
      isAuthenticated: true,
      user: demoUser,
      users: mockUsers,
      results: mockResults,
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
    });
  },

  exitDemo: () => {
    document.cookie = "nxt-demo-mode=;path=/;max-age=0";
    set({
      isDemo: false,
      isAuthenticated: false,
      user: null,
      users: [],
      results: [],
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      removedItems: [],
    });
  },

  // ── Auth (demo mode only — Supabase mode uses supabase.auth directly) ──
  login: (email, password) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return "not_found";
    if (found.password && found.password !== password) return "wrong_password";
    set({ user: found, isAuthenticated: true });
    return "success";
  },

  logout: () => {
    const isDemo = get().isDemo;
    if (isDemo) {
      get().exitDemo();
    } else {
      set({ user: null, isAuthenticated: false, profile: null, orgInviteCode: null });
    }
  },

  register: (user) => {
    set((state) => ({
      users: [...state.users, user],
      user,
      isAuthenticated: true,
    }));
  },

  updateUserPassword: (email, newPassword) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return false;
    set((state) => ({
      users: state.users.map((u) =>
        u.email === email ? { ...u, password: newPassword } : u
      ),
    }));
    return true;
  },

  // ── Supabase auth ──
  setProfile: (profile) => {
    if (profile) {
      const user: User = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        category: profile.category,
        teamId: profile.team_id ?? "",
        avatarUrl: profile.avatar_url ?? undefined,
        createdAt: profile.created_at,
      };
      set({ profile, user, isAuthenticated: true });
    } else {
      set({ profile: null, user: null, isAuthenticated: false });
    }
  },

  setAuthenticated: (authed) => set({ isAuthenticated: authed }),

  setOrgInviteCode: (code) => set({ orgInviteCode: code }),

  // ── Data actions ──
  setUser: (user) => set({ user }),

  switchRole: () => {
    const current = get().user;
    if (!current) return;
    const users = get().users;

    if (current.role === "directeur") {
      // Directeur → Manager: same person, just change role
      set({ user: { ...current, role: "manager" } });
    } else if (current.role === "manager") {
      // Check if this user is the directeur who switched down
      const directeur = users.find((u) => u.role === "directeur");
      if (directeur && directeur.id === current.id) {
        // Manager → Directeur: switch back up
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

  addUser: (user) => {
    set((state) => {
      // Idempotent: skip if user with same id already exists
      if (state.users.some((u) => u.id === user.id)) return state;
      return { users: [...state.users, user] };
    });
  },

  removeUser: (userId) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      results: state.results.filter((r) => r.userId !== userId),
    }));
  },

  assignAgent: (agentId, managerId) => {
    const manager = get().users.find((u) => u.id === managerId);
    if (!manager) return;
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId, teamId: manager.teamId } : u
      ),
    }));
  },

  unassignAgent: (agentId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId: undefined } : u
      ),
    }));
  },

  addResults: (result) => {
    set((state) => ({
      results: [...state.results.filter((r) => r.id !== result.id), result],
    }));
  },

  setResults: (results) => set({ results }),

  updateInfoVenteStatut: (resultId, itemId, statut) => {
    set((state) => ({
      results: state.results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              prospection: {
                ...r.prospection,
                informationsVente: r.prospection.informationsVente.map((i) =>
                  i.id === itemId ? { ...i, statut } : i
                ),
              },
            }
          : r
      ),
    }));
  },

  updateAcheteurChaudStatut: (resultId, itemId, statut) => {
    set((state) => ({
      results: state.results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              acheteurs: {
                ...r.acheteurs,
                acheteursChauds: r.acheteurs.acheteursChauds.map((i) =>
                  i.id === itemId ? { ...i, statut } : i
                ),
              },
            }
          : r
      ),
    }));
  },

  setRatioConfigs: (configs) => set({ ratioConfigs: configs }),

  updateRatioThreshold: (ratioId, level, value) => {
    set((state) => ({
      ratioConfigs: {
        ...state.ratioConfigs,
        [ratioId]: {
          ...state.ratioConfigs[ratioId],
          thresholds: {
            ...state.ratioConfigs[ratioId].thresholds,
            [level]: value,
          },
        },
      },
    }));
  },

  resetRatioConfigs: () => {
    set({ ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)) });
  },
}));
