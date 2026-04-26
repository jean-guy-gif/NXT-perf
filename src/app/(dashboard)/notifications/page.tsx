"use client";

import { useState } from "react";
import { Bell, CheckCheck, Check } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS, getAgingLevel } from "@/types/notifications";
import type { NotificationType, DbNotification } from "@/types/notifications";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "unresolved" | "resolved";

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
  const { notifications, unresolvedCount, markAllAsRead, markAsResolved, loading } = useNotifications();
  const [filter, setFilter] = useState<FilterMode>("unresolved");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unresolved") return !n.resolved_at;
    if (filter === "resolved") return !!n.resolved_at;
    return true;
  });

  const groups = groupByDate(filtered);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Vos alertes en cours
          </h1>
          <p className="mt-2 text-muted-foreground">
            {unresolvedCount > 0 ? `${unresolvedCount} non traitée${unresolvedCount > 1 ? "s" : ""}` : "Tout est traité"}
          </p>
        </div>
        {unresolvedCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {([
          { key: "all" as FilterMode, label: "Toutes" },
          { key: "unresolved" as FilterMode, label: "Non traitées" },
          { key: "resolved" as FilterMode, label: "Traitées" },
        ]).map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {filter === "unresolved" ? "Aucune alerte non traitée" : filter === "resolved" ? "Aucune alerte traitée" : "Aucune notification pour le moment"}
          </p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.items.map((notif) => {
              const aging = getAgingLevel(notif.created_at, notif.resolved_at);
              const isResolved = !!notif.resolved_at;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                    isResolved
                      ? "border-border bg-card opacity-50"
                      : "border-primary/20 bg-primary/5"
                  )}
                >
                  {/* Aging badge */}
                  <div className={cn("mt-1 text-[10px] font-medium whitespace-nowrap", aging.color)}>
                    {aging.level === "new" && !isResolved && "🟢"}
                    {aging.level === "pending" && "🟡"}
                    {aging.level === "waiting" && "🟠"}
                    {aging.level === "urgent" && "🔴"}
                    {isResolved && "✅"}
                  </div>

                  <div className="flex-shrink-0 text-base mt-0.5">
                    {NOTIFICATION_ICONS[notif.type as NotificationType] ?? "🔔"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm text-foreground", !isResolved && "font-medium")}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeDate(notif.created_at)}
                      </span>
                      <span className={cn("text-[10px] font-medium", aging.color)}>
                        {aging.label}
                      </span>
                    </div>
                  </div>

                  {/* Resolve button */}
                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => markAsResolved(notif.id)}
                      title="Marquer comme traité"
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted transition-colors flex-shrink-0"
                    >
                      <Check className="h-3 w-3" />
                      Traité
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
