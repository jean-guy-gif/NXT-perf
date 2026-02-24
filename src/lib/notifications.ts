import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RemovedItem } from "@/stores/app-store";

export interface AppNotification {
  id: string;
  type: "warning" | "info";
  message: string;
  detail: string;
  link?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000);
}

function formatDays(days: number): string {
  const rounded = Math.floor(days);
  return rounded <= 1 ? "1 jour" : `${rounded} jours`;
}

export function computeNotifications(
  user: User | null,
  results: PeriodResults[],
  removedItems: RemovedItem[],
  allUsers: User[]
): AppNotification[] {
  if (!user) return [];

  if (user.role === "manager") {
    return computeManagerNotifications(user, results, removedItems, allUsers);
  }

  return computeConseillerNotifications(user, results, removedItems);
}

function computeConseillerNotifications(
  user: User,
  results: PeriodResults[],
  removedItems: RemovedItem[]
): AppNotification[] {
  const notifs: AppNotification[] = [];

  // Check last data entry
  const userResults = results.filter((r) => r.userId === user.id);
  const latestUpdatedAt = userResults.reduce<string | null>((latest, r) => {
    if (!latest || r.updatedAt > latest) return r.updatedAt;
    return latest;
  }, null);

  if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
    const days = latestUpdatedAt ? daysSince(latestUpdatedAt) : null;
    notifs.push({
      id: "saisie-retard",
      type: "warning",
      message: "Pas de saisie depuis plus d'une semaine",
      detail: days
        ? `Dernière saisie il y a ${formatDays(days)}`
        : "Aucune saisie enregistrée",
      link: "/saisie",
    });
  }

  // Check last contact action (deal/abandon)
  const latestRemovedAt = removedItems.reduce<string | null>((latest, item) => {
    if (!latest || item.removedAt > latest) return item.removedAt;
    return latest;
  }, null);

  if (!latestRemovedAt || Date.now() - new Date(latestRemovedAt).getTime() > SEVEN_DAYS_MS) {
    const days = latestRemovedAt ? daysSince(latestRemovedAt) : null;
    notifs.push({
      id: "contacts-retard",
      type: "warning",
      message: "Pas d'action sur vos contacts depuis plus d'une semaine",
      detail: days
        ? `Dernière action il y a ${formatDays(days)}`
        : "Aucune action dealé/abandonné enregistrée",
      link: "/dashboard?tab=suivi",
    });
  }

  return notifs;
}

function computeManagerNotifications(
  user: User,
  results: PeriodResults[],
  removedItems: RemovedItem[],
  allUsers: User[]
): AppNotification[] {
  const notifs: AppNotification[] = [];

  // Check each team member's last data entry
  const teamConseillers = allUsers.filter(
    (u) => u.role === "conseiller" && u.teamId === user.teamId
  );

  const lateName: string[] = [];

  for (const conseiller of teamConseillers) {
    const userResults = results.filter((r) => r.userId === conseiller.id);
    const latestUpdatedAt = userResults.reduce<string | null>((latest, r) => {
      if (!latest || r.updatedAt > latest) return r.updatedAt;
      return latest;
    }, null);

    if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
      lateName.push(`${conseiller.firstName} ${conseiller.lastName}`);
    }
  }

  if (lateName.length > 0) {
    notifs.push({
      id: "manager-saisie-retard",
      type: "warning",
      message: `${lateName.length} conseiller${lateName.length > 1 ? "s" : ""} sans saisie récente`,
      detail: lateName.join(", "),
    });
  }

  // Check global contact actions
  const latestRemovedAt = removedItems.reduce<string | null>((latest, item) => {
    if (!latest || item.removedAt > latest) return item.removedAt;
    return latest;
  }, null);

  if (!latestRemovedAt || Date.now() - new Date(latestRemovedAt).getTime() > SEVEN_DAYS_MS) {
    notifs.push({
      id: "manager-contacts-retard",
      type: "warning",
      message: "Aucune action récente sur les contacts",
      detail: "Aucun deal ou abandon enregistré cette semaine",
      link: "/dashboard?tab=suivi",
    });
  }

  return notifs;
}
