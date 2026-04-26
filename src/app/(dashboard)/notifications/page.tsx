"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS, getAgingLevel } from "@/types/notifications";
import type { NotificationType, DbNotification } from "@/types/notifications";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeNotifications } from "@/lib/notifications";
import type { AppNotification } from "@/lib/notifications";

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

// Local helper: pick icon + tint for AppNotification (computed alerts)
function getLocalNotifVisual(type: AppNotification["type"]) {
  if (type === "warning") {
    return { Icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" };
  }
  return { Icon: Info, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" };
}

export default function NotificationsPage() {
  const { notifications, unresolvedCount, markAllAsRead, markAsResolved, loading } = useNotifications();
  const [filter, setFilter] = useState<FilterMode>("unresolved");

  // Computed alerts (same source as header bell)
  const user = useAppStore((s) => s.user);
  const allResults = useAllResults();
  const allUsers = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const localNotifs = useMemo(
    () => computeNotifications(user, allResults, allUsers, ratioConfigs),
    [user, allResults, allUsers, ratioConfigs]
  );

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

  // Show zone 2 empty state only when DB has notifs (filter masks them) OR local section is also empty
  const showZone2EmptyState = filtered.length === 0 && (notifications.length > 0 || localNotifs.length === 0);

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

      {/* ═══ ZONE 1 — ALERTES SYSTÈME (computed, real-time) ═══ */}
      {localNotifs.length > 0 && (
        <section className="space-y-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alertes système
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Vos alertes en temps réel
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Détectées automatiquement à partir de vos résultats et ratios. Mises à jour en continu.
            </p>
          </div>
          <div className="space-y-3">
            {localNotifs.map((notif) => {
              const { Icon, iconBg, iconColor } = getLocalNotifVisual(notif.type);
              return (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {notif.message}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {notif.detail}
                    </p>
                    {notif.link && (
                      <Link
                        href={notif.link}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        Voir
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter tabs (Zone 2 — DB notifications) */}
      <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
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

      {/* Empty state (Zone 2) — hidden when DB empty + zone 1 has content */}
      {showZone2EmptyState && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filter === "unresolved" ? "Aucune alerte non traitée" : filter === "resolved" ? "Aucune alerte traitée" : "Aucune notification pour le moment"}
          </p>
        </div>
      )}

      {/* Grouped list (Zone 2 — DB notifications) */}
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <div className={cn("mt-1 whitespace-nowrap text-[10px] font-medium", aging.color)}>
                    {aging.level === "new" && !isResolved && "🟢"}
                    {aging.level === "pending" && "🟡"}
                    {aging.level === "waiting" && "🟠"}
                    {aging.level === "urgent" && "🔴"}
                    {isResolved && "✅"}
                  </div>

                  <div className="mt-0.5 flex-shrink-0 text-base">
                    {NOTIFICATION_ICONS[notif.type as NotificationType] ?? "🔔"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm text-foreground", !isResolved && "font-medium")}>
                      {notif.message}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
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
                      className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
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
