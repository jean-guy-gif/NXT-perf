export type UserRole = "conseiller" | "manager";
export type UserCategory = "debutant" | "confirme" | "expert";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  category: UserCategory;
  teamId: string;
  avatarUrl?: string;
  createdAt: string;
}
