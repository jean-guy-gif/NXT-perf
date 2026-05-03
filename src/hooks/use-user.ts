"use client";

import { useAppStore } from "@/stores/app-store";
import { useAdvisorOverride } from "@/contexts/advisor-override-context";

export function useUser() {
  const storeUser = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { advisorId } = useAdvisorOverride();

  // PR3.8.5 — En mode Manager → Individuel, un AdvisorOverrideProvider
  // injecte l'advisorId. Le hook renvoie alors le conseiller sélectionné
  // comme s'il était l'utilisateur courant (catégorie incluse) — sans toucher
  // au store global ni aux composants Conseiller.
  const overrideUser = advisorId
    ? (users.find((u) => u.id === advisorId) ?? null)
    : null;
  const user = overrideUser ?? storeUser;

  return {
    user,
    isAuthenticated,
    isManager: user?.role === "manager",
    category: user?.category ?? "confirme",
  };
}
