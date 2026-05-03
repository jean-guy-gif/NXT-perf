"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useAppStore } from "@/stores/app-store";
import { getManagerAdvisors } from "@/lib/manager/advisors";
import type { User } from "@/types/user";

export type ManagerViewMode = "collective" | "individual";

interface UseManagerViewReturn {
  mode: ManagerViewMode;
  isCollective: boolean;
  isIndividual: boolean;
  advisors: User[];
  selectedAdvisor: User | null;
  selectedAdvisorId: string | null;
  setMode: (mode: ManagerViewMode) => void;
  selectAdvisor: (id: string | null) => void;
  /** Switch back to collective view WITHOUT clearing the selected advisor. */
  backToCollective: () => void;
}

/**
 * V3 Manager view layer (PR3.8.2).
 *
 * Wraps the legacy `useManagerScope` (Zustand-persisted under
 * `nxt-manager-scope`) to expose V3 semantics:
 *  - `mode: "collective" | "individual"` (mapped from `scope: "team" | "individual"`)
 *  - `advisors` (computed from store users, filtered for this manager)
 *  - auto-selection of the first advisor when entering individual mode
 *    without any prior selection
 *  - `backToCollective()` preserving `selectedAdvisorId` so a manager
 *    returning to collective then back to individual lands on the same
 *    conseiller
 */
export function useManagerView(): UseManagerViewReturn {
  const { scope, conseillerId, setScope, selectConseiller } = useManagerScope();

  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const advisors = useMemo(
    () => getManagerAdvisors(users, currentUser, isDemo),
    [users, currentUser, isDemo],
  );

  const selectedAdvisor = useMemo<User | null>(() => {
    if (!conseillerId) return null;
    return advisors.find((a) => a.id === conseillerId) ?? null;
  }, [advisors, conseillerId]);

  const mode: ManagerViewMode = scope === "individual" ? "individual" : "collective";

  const setMode = useCallback(
    (next: ManagerViewMode) => {
      setScope(next === "individual" ? "individual" : "team");
    },
    [setScope],
  );

  const selectAdvisor = useCallback(
    (id: string | null) => {
      selectConseiller(id);
    },
    [selectConseiller],
  );

  const backToCollective = useCallback(() => {
    setScope("team");
  }, [setScope]);

  // Auto-select first advisor when entering individual mode without selection.
  // Also reconcile a stale selection (advisor no longer in the list).
  useEffect(() => {
    if (mode !== "individual") return;
    if (advisors.length === 0) return;

    if (!conseillerId || !advisors.some((a) => a.id === conseillerId)) {
      selectConseiller(advisors[0].id);
    }
  }, [mode, advisors, conseillerId, selectConseiller]);

  return {
    mode,
    isCollective: mode === "collective",
    isIndividual: mode === "individual",
    advisors,
    selectedAdvisor,
    selectedAdvisorId: conseillerId,
    setMode,
    selectAdvisor,
    backToCollective,
  };
}
