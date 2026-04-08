"use client";

import { useState } from "react";
import { Bell, CheckCheck, Check, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS, getAgingLevel } from "@/types/notifications";
import type { NotificationType, DbNotification } from "@/types/notifications";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "unresolved" | "resolved";

const MANAGER_TYPES: NotificationType[] = ["saisie_skipped", "saisie_done", "new_member"];

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

export default function ManagerAlertesPage() {
  const { notifications, markAsResolved, markAllAsRead, loading } = useNotifications();
  const [filter, setFilter] = useState<FilterMode>("unresolved");

  // Filter to manager-relevant alert types only
  const managerNotifs = notifications.filter((n) =>
    MANAGER_TYPES.includes(n.type as NotificationType)
  );

  const filtered = managerNotifs.filter((n) => {
    if (filter === "unresolved") return !n.resolved_at;
    if (filter === "resolved") return !!n.resolved_at;
    return true;
  });

  const unresolvedCount = managerNotifs.filter((n) => !n.resolved_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Alertes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unresolvedCount > 0 ? `${unresolvedCount} alerte${unresolvedCount > 1 ? "s" : ""} non traitée${unresolvedCount > 1 ? "s" : ""}` : "Aucune alerte en attente"}
          </p>
        </div>
        {unresolvedCount > 0 && (
          <button type="button" onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
          </button>
        )}
      </div>

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

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            {filter === "unresolved" ? "Aucune alerte en attente" : "Aucune alerte"}
          </p>
        </div>
      )}

      <div className="space-y-1">
        {filtered.map((notif) => {
          const aging = getAgingLevel(notif.created_at, notif.resolved_at);
          const isResolved = !!notif.resolved_at;

          return (
            <div key={notif.id} className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
              isResolved ? "border-border bg-card opacity-50" : "border-primary/20 bg-primary/5"
            )}>
              <div className={cn("mt-1 text-[10px] font-medium", aging.color)}>
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
                <p className={cn("text-sm text-foreground", !isResolved && "font-medium")}>{notif.message}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{formatRelativeDate(notif.created_at)}</span>
                  <span className={cn("text-[10px] font-medium", aging.color)}>{aging.label}</span>
                </div>
              </div>
              {!isResolved && (
                <button type="button" onClick={() => markAsResolved(notif.id)} title="Marquer comme traité"
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted transition-colors flex-shrink-0">
                  <Check className="h-3 w-3" /> Traité
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
