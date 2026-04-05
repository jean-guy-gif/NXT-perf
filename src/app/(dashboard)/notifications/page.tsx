"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS } from "@/types/notifications";
import type { NotificationType, DbNotification } from "@/types/notifications";
import { cn } from "@/lib/utils";

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function groupByDate(notifs: DbNotification[]): { label: string; items: DbNotification[] }[] {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);

  const today: DbNotification[] = [];
  const thisWeek: DbNotification[] = [];
  const older: DbNotification[] = [];

  for (const n of notifs) {
    const dateStr = n.created_at.split("T")[0];
    const d = new Date(n.created_at);
    if (dateStr === todayStr) today.push(n);
    else if (d >= weekAgo) thisWeek.push(n);
    else older.push(n);
  }

  const groups: { label: string; items: DbNotification[] }[] = [];
  if (today.length > 0) groups.push({ label: "Aujourd'hui", items: today });
  if (thisWeek.length > 0) groups.push({ label: "Cette semaine", items: thisWeek });
  if (older.length > 0) groups.push({ label: "Plus ancien", items: older });
  return groups;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Aucune notification pour le moment</p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.items.map((notif) => (
              <div
                key={notif.id}
                onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                  notif.read
                    ? "border-border bg-card"
                    : "border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10"
                )}
              >
                {!notif.read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
                <div className="flex-shrink-0 text-base mt-0.5">
                  {NOTIFICATION_ICONS[notif.type as NotificationType] ?? "🔔"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-foreground", !notif.read && "font-medium")}>
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatRelativeDate(notif.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
