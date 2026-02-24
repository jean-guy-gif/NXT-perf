"use client";

import { useAppStore } from "@/stores/app-store";

export function useUser() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  return {
    user,
    isAuthenticated,
    isManager: user?.role === "manager",
    category: user?.category ?? "confirme",
  };
}
