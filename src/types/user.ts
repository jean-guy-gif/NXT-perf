export type UserRole = "conseiller" | "manager" | "directeur" | "coach";
export type UserCategory = "debutant" | "confirme" | "expert";
export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";
export type ProfileType = "INSTITUTION" | "MANAGER" | "AGENT" | "COACH";

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

/** Check if a user has coach-level access */
export function hasCoachAccess(user: User | null): boolean {
  return hasRole(user, "coach");
}
