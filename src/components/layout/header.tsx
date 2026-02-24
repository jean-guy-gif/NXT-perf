"use client";

import { Search, Bell, Plus, Sun, Moon, ArrowLeftRight, AlertTriangle, Info } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { computeNotifications } from "@/lib/notifications";
import { AddAgentModal } from "@/components/manager/add-agent-modal";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/resultats": "Mes Résultats",
  "/performance": "Ma Performance",
  "/comparaison": "Comparaison",
  "/saisie": "Ma Saisie",
  "/formation": "Ma Formation",
  "/objectifs": "Mes Objectifs",
  "/manager/cockpit": "Cockpit Manager",
  "/manager/equipe": "Équipe",
  "/manager/classement": "Classement",
  "/manager/parametres": "Paramètres",
  "/manager/formation-collective": "Formation Collective",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const removedItems = useAppStore((s) => s.removedItems);
  const switchRole = useAppStore((s) => s.switchRole);
  const [isDark, setIsDark] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => computeNotifications(user, results, removedItems, users),
    [user, results, removedItems, users]
  );

  // Close dropdown on click outside
  useEffect(() => {
    if (!showNotifs) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifs]);

  const pageTitle = pageTitles[pathname] || "Dashboard";
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : "??";

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
    }
    setIsDark(!isDark);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-extrabold text-foreground">{pageTitle}</h1>
        {user && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              CATEGORY_COLORS[user.category]
            )}
          >
            {CATEGORY_LABELS[user.category]}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="h-9 w-64 rounded-lg bg-muted pl-9 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>

        <button
          onClick={switchRole}
          title={`Basculer en mode ${user?.role === "manager" ? "conseiller" : "manager"}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {user?.role === "manager" && (
          <button
            onClick={() => setShowAddModal(true)}
            title="Ajouter un conseiller"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-nxt text-primary-foreground transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Notifications bell + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs((prev) => !prev)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              showNotifs && "bg-muted text-foreground"
            )}
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Rappels</span>
                </div>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {notifications.length}
                  </span>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune alerte
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (notif.link) {
                          router.push(notif.link);
                          setShowNotifs(false);
                        }
                      }}
                      className={cn(
                        "flex gap-3 border-b border-border/50 px-4 py-3 last:border-b-0",
                        notif.link && "cursor-pointer transition-colors hover:bg-muted/50"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {notif.type === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notif.message}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {notif.detail}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
          {initials}
        </button>
      </div>
      {showAddModal && user && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          managerTeamId={user.teamId}
        />
      )}
    </header>
  );
}
