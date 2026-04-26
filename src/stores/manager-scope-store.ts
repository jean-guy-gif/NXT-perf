import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ManagerScope = "team" | "individual";

interface ManagerScopeState {
  scope: ManagerScope;
  selectedConseillerId: string | null;
  setScope: (s: ManagerScope) => void;
  selectConseiller: (id: string | null) => void;
  toggleScope: () => void;
}

export const useManagerScopeStore = create<ManagerScopeState>()(
  persist(
    (set) => ({
      scope: "team",
      selectedConseillerId: null,
      setScope: (scope) => set({ scope }),
      selectConseiller: (selectedConseillerId) => set({ selectedConseillerId }),
      toggleScope: () =>
        set((state) => ({ scope: state.scope === "team" ? "individual" : "team" })),
    }),
    {
      name: "nxt-manager-scope",
    },
  ),
);
