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
 * Espace manager VERROUILLÉ en formation (flou + cadenas), sans rien supprimer.
 *
 * `true` quand on est en formation ET que l'interrupteur de ré-ouverture n'est
 * pas activé. C'est l'INTERRUPTEUR pour rouvrir l'espace manager plus tard,
 * sans toucher au code : il suffit de poser `NEXT_PUBLIC_MANAGER_UNLOCKED=on`.
 *
 * Hors formation, ou avec l'interrupteur activé, cette fonction renvoie `false`
 * et aucune des gardes qu'elle conditionne ne change le comportement.
 */
export function isManagerLocked(): boolean {
  return isFormationMode() && process.env.NEXT_PUBLIC_MANAGER_UNLOCKED !== "on";
}

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
