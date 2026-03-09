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
  Compass,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, getVisibleViews } from "@/stores/app-store";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
  directorOnly?: boolean;
  coachOnly?: boolean;
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
  { href: "/manager/gps", icon: Target, label: "GPS Équipe", managerOnly: true },
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
  { href: "/directeur/pilotage", icon: Compass, label: "Pilotage Agence", directorOnly: true },
  { href: "/directeur/equipes", icon: Users, label: "Équipes", directorOnly: true },
  { href: "/directeur/performance", icon: Gauge, label: "Performance", directorOnly: true },
  { href: "/directeur/formation-collective", icon: BookOpen, label: "Formation Collective", directorOnly: true },
  { href: "/coach/dashboard", icon: HeartHandshake, label: "Tableau de bord", coachOnly: true },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const availableRoles = useAppStore((s) => s.user?.availableRoles ?? []);
  const hiddenViews = useAppStore((s) => s.hiddenViews);
  const visibleViews = getVisibleViews(availableRoles, hiddenViews);

  const advisorItems = visibleViews.includes("agent")
    ? navItems.filter((item) => !item.managerOnly && !item.directorOnly && !item.coachOnly && item.href !== "/parametres")
    : [];
  const managerItems = visibleViews.includes("manager")
    ? navItems.filter((item) => item.managerOnly)
    : [];
  const directorItems = visibleViews.includes("directeur")
    ? navItems.filter((item) => item.directorOnly)
    : [];
  const coachItems = visibleViews.includes("coach")
    ? navItems.filter((item) => item.coachOnly)
    : [];
  const settingsItem = navItems.find((item) => item.href === "/parametres")!;

  return (
    <nav className={cn(
      "flex h-full flex-col overflow-y-auto bg-sidebar py-4",
      collapsed ? "items-center px-2" : "px-3"
    )}>
      {/* Logo */}
      <Link
        href="/dashboard"
        className={cn(
          "mb-6 flex items-center flex-shrink-0",
          collapsed ? "justify-center" : "gap-3 px-2"
        )}
      >
        <Image
          src="/logo-icon.svg"
          alt="NXT Perf"
          width={36}
          height={36}
          className="rounded-[var(--radius-button)] shadow-sm flex-shrink-0"
        />
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden">
            NXT Profiling
          </span>
        )}
      </Link>

      {/* Conseiller section */}
      {advisorItems.length > 0 && (
        <SidebarSection label="Conseiller" collapsed={collapsed}>
          {advisorItems.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </SidebarSection>
      )}

      {/* Manager section */}
      {managerItems.length > 0 && (
        <SidebarSection label="Manager" collapsed={collapsed}>
          {managerItems.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </SidebarSection>
      )}

      {/* Director section */}
      {directorItems.length > 0 && (
        <SidebarSection label="Directeur" collapsed={collapsed}>
          {directorItems.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </SidebarSection>
      )}

      {/* Coach section */}
      {coachItems.length > 0 && (
        <SidebarSection label="Coach" collapsed={collapsed}>
          {coachItems.map((item) => (
            <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </SidebarSection>
      )}

      {/* Spacer */}
      <div className="mt-auto" />

      {/* Settings */}
      <SidebarItem item={settingsItem} pathname={pathname} collapsed={collapsed} />
    </nav>
  );
}

function SidebarSection({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      {collapsed ? (
        <div className="my-2 mx-auto h-px w-8 bg-sidebar-border" />
      ) : (
        <div className="mb-1.5 mt-3 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {label}
          </span>
        </div>
      )}
      <div className={cn(
        "flex flex-col gap-0.5",
        collapsed && "items-center"
      )}>
        {children}
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  if (collapsed) {
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

  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-[var(--radius-button)] px-3 text-sm font-medium transition-all duration-[var(--transition-fast)]",
        isActive
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
