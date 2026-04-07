export type NotificationType =
  | "saisie_skipped"
  | "saisie_done"
  | "new_member"
  | "coach_link_added"
  | "coach_link_removed";

export interface DbNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
  resolved_at: string | null;
}

export type AgingLevel = "new" | "pending" | "waiting" | "urgent";

export function getAgingLevel(createdAt: string, resolvedAt: string | null): { level: AgingLevel; days: number; label: string; color: string } {
  if (resolvedAt) return { level: "new", days: 0, label: "Traité", color: "text-muted-foreground" };
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60_000));
  if (days <= 3) return { level: "new", days, label: "Nouveau", color: "text-green-500" };
  if (days <= 7) return { level: "pending", days, label: `Non traité depuis ${days}j`, color: "text-yellow-500" };
  if (days <= 14) return { level: "waiting", days, label: `En attente depuis ${days}j`, color: "text-orange-500" };
  return { level: "urgent", days, label: `Urgent — ${days}j sans action`, color: "text-red-500" };
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  saisie_skipped: "🔔",
  saisie_done: "✅",
  new_member: "👥",
  coach_link_added: "🤝",
  coach_link_removed: "👋",
};
