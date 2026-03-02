"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Gauge,
  GitCompare,
  PenSquare,
  GraduationCap,
  Target,
  Users,
  Trophy,
  Settings,
  Zap,
  BookOpen,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
  directorOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/resultats", icon: BarChart3, label: "Mes Résultats" },
  { href: "/performance", icon: Gauge, label: "Ma Performance" },
  { href: "/comparaison", icon: GitCompare, label: "Comparaison" },
  { href: "/saisie", icon: PenSquare, label: "Ma Saisie" },
  { href: "/formation", icon: GraduationCap, label: "Ma Formation" },
  { href: "/objectifs", icon: Target, label: "Mes Objectifs" },
  { href: "/manager/cockpit", icon: Zap, label: "Cockpit", managerOnly: true },
  { href: "/manager/equipe", icon: Users, label: "Équipe", managerOnly: true },
  {
    href: "/manager/classement",
    icon: Trophy,
    label: "Classement",
    managerOnly: true,
  },
  {
    href: "/manager/formation-collective",
    icon: BookOpen,
    label: "Formation Collective",
    managerOnly: true,
  },
  { href: "/directeur/cockpit", icon: Building2, label: "Cockpit Agence", directorOnly: true },
  { href: "/directeur/equipes", icon: Users, label: "Équipes", directorOnly: true },
  { href: "/directeur/classement", icon: Trophy, label: "Classement Agence", directorOnly: true },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const isManager = user?.role === "manager" || user?.role === "directeur";
  const isDirector = user?.role === "directeur";

  const filteredItems = navItems.filter((item) => {
    if (item.managerOnly) return isManager;
    if (item.directorOnly) return isDirector;
    return true;
  });

  const advisorItems = filteredItems.filter((item) => !item.managerOnly && !item.directorOnly);
  const managerItems = filteredItems.filter((item) => item.managerOnly);
  const directorItems = filteredItems.filter((item) => item.directorOnly);

  return (
    <nav className="flex h-full flex-col items-center gap-1 overflow-y-auto bg-sidebar py-4 px-2">
      <Link href="/dashboard" className="mb-6 flex items-center justify-center">
        <Image
          src="/logo-icon.svg"
          alt="NXT Perf"
          width={40}
          height={40}
          className="rounded-[var(--radius-button)] shadow-sm"
        />
      </Link>

      <div className="flex flex-col items-center gap-1">
        {advisorItems.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {managerItems.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-sidebar-border" />
          <div className="flex flex-col items-center gap-1">
            {managerItems.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </>
      )}

      {directorItems.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-sidebar-border" />
          <div className="flex flex-col items-center gap-1">
            {directorItems.map((item) => (
              <SidebarItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </>
      )}

      <div className="mt-auto" />
    </nav>
  );
}

function SidebarItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] transition-all duration-[var(--transition-fast)]",
        isActive
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <item.icon className="h-5 w-5" />
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-button)] bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md opacity-0 transition-opacity duration-[var(--transition-normal)] group-hover:opacity-100 z-50 border border-border">
        {item.label}
      </span>
    </Link>
  );
}
