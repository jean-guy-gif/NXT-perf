import type { UserRole } from "@/types/user";

/**
 * Mode "formation" — l'outil ressort pour des stagiaires conseillers et
 * managers uniquement. Les rôles directeur, réseau, coach et admin sont
 * MASQUÉS (pas supprimés) lorsque `NEXT_PUBLIC_APP_MODE === "formation"`.
 *
 * Hors mode formation, tout doit se comporter exactement comme avant : chaque
 * garde conditionnée par `isFormationMode()` est un no-op en mode normal.
 */
export function isFormationMode(): boolean {
  return process.env.NEXT_PUBLIC_APP_MODE === "formation";
}

/** Rôles visibles en mode formation. */
export const FORMATION_ROLES: UserRole[] = ["conseiller", "manager"];

/**
 * Destination d'onboarding en mode formation après l'étape identité.
 *
 * Les étapes statut / dpi / gps (et les moments import / coach qu'elles
 * portent) sont sautées : on route directement vers l'étape agence
 * (directeur) ou équipe (manager), sinon vers le tableau de bord.
 */
export function formationOnboardingNext(
  role: UserRole | string | null | undefined,
): string {
  if (role === "manager") return "/onboarding/equipe";
  if (role === "directeur") return "/onboarding/agence";
  return "/dashboard";
}
