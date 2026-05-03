import type { User } from "@/types/user";

/**
 * Returns the list of conseillers a manager can pilot.
 *
 * Demo mode: filter by `teamId` (the demo store doesn't always wire
 * `managerId` consistently across mock fixtures, but team scope is reliable).
 * Prod mode: filter strictly by `managerId === currentUser.id`.
 *
 * Sorted by `firstName lastName` for stable selector rendering.
 */
export function getManagerAdvisors(
  users: User[],
  currentUser: User | null,
  isDemo: boolean,
): User[] {
  if (!currentUser) return [];

  const advisors = users.filter((u) => {
    if (u.role !== "conseiller") return false;
    if (isDemo) return u.teamId === currentUser.teamId;
    return u.managerId === currentUser.id;
  });

  return [...advisors].sort((a, b) => {
    const an = `${a.firstName} ${a.lastName}`.toLowerCase();
    const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
    return an.localeCompare(bn);
  });
}
