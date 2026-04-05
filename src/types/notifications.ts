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
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  saisie_skipped: "🔔",
  saisie_done: "✅",
  new_member: "👥",
  coach_link_added: "🤝",
  coach_link_removed: "👋",
};
