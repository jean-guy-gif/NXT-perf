import { create } from "zustand";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import { mockCurrentUser, mockUsers } from "@/data/mock-users";
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
  user: User | null;
  isAuthenticated: boolean;
  results: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  removedItems: RemovedItem[];
  login: (email: string, password: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  switchRole: () => void;
  addResults: (result: PeriodResults) => void;
  removeInfoVente: (resultId: string, itemId: string, reason: RemovalReason) => void;
  removeAcheteurChaud: (resultId: string, itemId: string, reason: RemovalReason) => void;
  setRatioConfigs: (configs: Record<RatioId, RatioConfig>) => void;
  updateRatioThreshold: (
    ratioId: RatioId,
    level: "debutant" | "confirme" | "expert",
    value: number
  ) => void;
  resetRatioConfigs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: mockCurrentUser,
  isAuthenticated: true,
  results: mockResults,
  ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
  removedItems: [],

  login: (_email, _password) => {
    set({ user: mockCurrentUser, isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  switchRole: () => {
    const current = get().user;
    if (!current) return;
    const isManager = current.role === "manager";
    const newUser = isManager
      ? mockUsers.find((u) => u.role === "conseiller") ?? current
      : mockUsers.find((u) => u.role === "manager") ?? current;
    set({ user: newUser });
  },

  addResults: (result) => {
    set((state) => ({
      results: [...state.results.filter((r) => r.id !== result.id), result],
    }));
  },

  removeInfoVente: (resultId, itemId, reason) => {
    set((state) => {
      const result = state.results.find((r) => r.id === resultId);
      const item = result?.prospection.informationsVente.find((i) => i.id === itemId);
      return {
        results: state.results.map((r) =>
          r.id === resultId
            ? {
                ...r,
                prospection: {
                  ...r.prospection,
                  informationsVente: r.prospection.informationsVente.filter(
                    (i) => i.id !== itemId
                  ),
                },
              }
            : r
        ),
        removedItems: item
          ? [
              ...state.removedItems,
              {
                id: item.id,
                nom: item.nom,
                commentaire: item.commentaire,
                type: "info_vente" as const,
                reason,
                removedAt: new Date().toISOString(),
              },
            ]
          : state.removedItems,
      };
    });
  },

  removeAcheteurChaud: (resultId, itemId, reason) => {
    set((state) => {
      const result = state.results.find((r) => r.id === resultId);
      const item = result?.acheteurs.acheteursChauds.find((i) => i.id === itemId);
      return {
        results: state.results.map((r) =>
          r.id === resultId
            ? {
                ...r,
                acheteurs: {
                  ...r.acheteurs,
                  acheteursChauds: r.acheteurs.acheteursChauds.filter(
                    (i) => i.id !== itemId
                  ),
                },
              }
            : r
        ),
        removedItems: item
          ? [
              ...state.removedItems,
              {
                id: item.id,
                nom: item.nom,
                commentaire: item.commentaire,
                type: "acheteur_chaud" as const,
                reason,
                removedAt: new Date().toISOString(),
              },
            ]
          : state.removedItems,
      };
    });
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
