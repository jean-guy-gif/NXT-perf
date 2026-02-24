"use client";

import { Search, Bell, Plus, Sun, Moon, ArrowLeftRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const user = useAppStore((s) => s.user);
  const switchRole = useAppStore((s) => s.switchRole);
  const [isDark, setIsDark] = useState(true);

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
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
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

        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </button>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
          {initials}
        </button>
      </div>
    </header>
  );
}
