export type UserRole = "conseiller" | "manager" | "directeur" | "reseau";
export type UserCategory = "debutant" | "confirme" | "expert";
export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";
export type ProfileType = "INSTITUTION" | "MANAGER" | "AGENT" | "COACH" | "RESEAU";

/**
 * Chantier A.3 — statut juridique métier propagé depuis `profiles.agent_status`.
 * Sert de modulation des seuils du diagnostic (cf. `resolveThreshold`).
 */
export type AgentStatus = "salarie" | "agent_commercial" | "mandataire";

export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  /** Rôle d'inscription — stable, ne change jamais */
  mainRole: UserRole;
  /** Rôle actif — mutable via switchRole() */
  role: UserRole;
  availableRoles: UserRole[];
  category: UserCategory;
  teamId: string;
  managerId?: string;
  avatarUrl?: string;
  createdAt: string;
  onboardingStatus?: OnboardingStatus;
  profileType?: ProfileType;
  institutionId?: string;
  /**
   * Chantier A.3 — statut juridique métier propagé depuis
   * `profiles.agent_status` via `useSupabaseTeam`. Permet à `useUserContext`
   * sous `AdvisorOverrideProvider` de retourner le statut du conseiller
   * observé (chantier C respect total). `null` pour les profils pré-A.2
   * sans saisie onboarding.
   */
  agentStatus?: AgentStatus | null;
}

/** Check if a user has a specific role in their available roles */
export function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false;
  return user.availableRoles.includes(role);
}

/** Check if a user has manager-level access */
export function hasManagerAccess(user: User | null): boolean {
  return hasRole(user, "manager") || hasRole(user, "directeur");
}

/** Check if a user has director-level access */
export function hasDirectorAccess(user: User | null): boolean {
  return hasRole(user, "directeur");
}

/** Check if a user has network-level access */
export function hasNetworkAccess(user: User | null): boolean {
  return hasRole(user, "reseau");
}
