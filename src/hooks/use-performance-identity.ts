"use client";

import { useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import {
  computePerformanceIdentity,
  type IdentityProfile,
} from "@/lib/performance-identity";

/**
 * Sous-PR Coach-25.
 *
 * Retourne le profil d'identite typologique du conseiller courant a
 * partir de son historique complet. Calcul deterministe pur, sans appel
 * API. Recalcule a chaque changement de l'historique (memo).
 *
 * `null` si pas d'utilisateur connecte.
 */
export function usePerformanceIdentity(): IdentityProfile | null {
  const { user } = useUser();
  const allResults = useAppStore((s) => s.results);

  return useMemo(() => {
    if (!user) return null;
    const history = allResults.filter((r) => r.userId === user.id);
    return computePerformanceIdentity(history);
  }, [user, allResults]);
}
