"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Gauge,
  GitCompare,
  GraduationCap,
  Target,
  Trophy,
  Settings,
  BookOpen,
  Compass,
  TrendingUp,
  Wallet,
  Network,
  Navigation,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, getVisibleViews } from "@/stores/app-store";
import { AvatarDisplay } from "@/components/profile/avatar-upload";
import { LockedNavItem } from "@/components/subscription/locked-nav-item";
import { useBadges } from "@/hooks/use-badges";
import { BADGES } from "@/lib/badges";
import type { BadgeKey } from "@/lib/badges";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
  directorOnly?: boolean;
  networkOnly?: boolean;
  /** Feature key for subscription lock check */
  lockedFeature?: string;
  /** Affiche un séparateur visuel discret AVANT cet item dans la sidebar */
  separatorBefore?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/resultats", icon: BarChart3, label: "Mon Volume d'Activité", lockedFeature: "resultats" },
  { href: "/performance", icon: Gauge, label: "Mes Ratios de Transformation", lockedFeature: "performance" },
  { href: "/comparaison", icon: GitCompare, label: "Ma Comparaison", lockedFeature: "comparaison" },
  { href: "/formation", icon: GraduationCap, label: "Ma Formation", lockedFeature: "formation" },
  { href: "/manager/dashboard", icon: LayoutDashboard, label: "Tableau de bord", managerOnly: true },
  { href: "/manager/resultats", icon: BarChart3, label: "Mon Volume d'Activité", managerOnly: true },
  { href: "/manager/performance", icon: Gauge, label: "Mes Ratios de Transformation", managerOnly: true },
  { href: "/manager/comparaison", icon: GitCompare, label: "Ma Comparaison", managerOnly: true },
  { href: "/manager/formation", icon: BookOpen, label: "Ma Formation", managerOnly: true },
  { href: "/directeur/dashboard", icon: LayoutDashboard, label: "Tableau de bord", directorOnly: true },
  { href: "/directeur/resultats", icon: BarChart3, label: "Mon Volume d'Activité", directorOnly: true },
  { href: "/directeur/performance", icon: Gauge, label: "Mes Ratios de Transformation", directorOnly: true },
  { href: "/directeur/comparaison", icon: GitCompare, label: "Ma Comparaison", directorOnly: true },
  { href: "/directeur/formation", icon: BookOpen, label: "Ma Formation", directorOnly: true },
  { href: "/directeur/pilotage-financier", icon: Wallet, label: "Pilotage Financier", directorOnly: true, separatorBefore: true },
  { href: "/directeur/leads-dpi", icon: ClipboardCheck, label: "Leads DPI", directorOnly: true },
  { href: "/reseau/dashboard", icon: Network, label: "Vue Réseau", networkOnly: true },
  { href: "/reseau/agence", icon: Building2, label: "Mes Agences", networkOnly: true },
  { href: "/pourquoi-nxt", icon: Compass, label: "Notre approche" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const availableRoles = user?.availableRoles ?? [];
  const hiddenViews = useAppStore((s) => s.hiddenViews);
  const visibleViews = getVisibleViews(availableRoles, hiddenViews);

  const { earnedBadges } = useBadges();
  const recentBadgeEmojis = earnedBadges.slice(0, 3).map((b) => BADGES[b.badge_key as BadgeKey]?.emoji).filter(Boolean);

  const avatarUrl = profile?.avatar_url;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : null;

  const advisorItems = visibleViews.includes("agent")
    ? navItems.filter((item) => !item.managerOnly && !item.directorOnly && !item.networkOnly && item.href !== "/parametres")
    : [];
  const managerItems = visibleViews.includes("manager")
    ? navItems.filter((item) => item.managerOnly)
    : [];
  const directorItems = visibleViews.includes("directeur")
    ? navItems.filter((item) => item.directorOnly)
    : [];
  const networkItems = visibleViews.includes("reseau")
    ? navItems.filter((item) => item.networkOnly)
    : [];
  const settingsItem = navItems.find((item) => item.href === "/parametres")!;

  return (
    <nav data-tour="sidebar" className={cn(
      "flex h-full flex-col overflow-y-auto py-4 bg-[var(--agency-dark,#1A1A2E)]",
      collapsed ? "items-center px-2" : "px-3"
    )}>
      {/* Profile avatar */}
      <Link
        href="/dashboard"
        className={cn(
          "mb-6 flex items-center flex-shrink-0",
          collapsed ? "justify-center" : "gap-3 px-2"
        )}
      >
        {initials ? (
          <AvatarDisplay
            avatarUrl={avatarUrl}
            initials={initials}
            size={40}
            className="flex-shrink-0 border-2 border-border"
          />
        ) : (
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-muted" />
        )}
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-agency-primary whitespace-nowrap overflow-hidden">
            {user ? `${user.firstName} ${user.lastName}` : "Chargement…"}
          </span>
        )}
      </Link>

      {/* Recent badges */}
      {recentBadgeEmojis.length > 0 && (
        <div className={cn("flex gap-0.5 mb-3 flex-shrink-0", collapsed ? "justify-center" : "px-3")}>
          {recentBadgeEmojis.map((emoji, i) => (
            <span key={i} className="text-sm">{emoji}</span>
          ))}
        </div>
      )}

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
            <Fragment key={item.href}>
              {item.separatorBefore && (
                <div
                  className={cn(
                    collapsed
                      ? "my-2 mx-auto h-px w-8 bg-sidebar-border"
                      : "my-2 border-t border-sidebar-border",
                  )}
                />
              )}
              <SidebarItem item={item} pathname={pathname} collapsed={collapsed} />
            </Fragment>
          ))}
        </SidebarSection>
      )}

      {/* Réseau section */}
      {networkItems.length > 0 && (
        <SidebarSection label="Réseau" collapsed={collapsed}>
          {networkItems.map((item) => (
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

  // Locked feature → delegate to LockedNavItem
  if (item.lockedFeature) {
    return (
      <LockedNavItem
        feature={item.lockedFeature}
        href={item.href}
        icon={item.icon}
        label={item.label}
        isActive={isActive}
        collapsed={collapsed}
      />
    );
  }

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        data-tour={item.href === "/parametres" ? "parametres-link" : item.href === "/saisie" ? "saisie-link" : undefined}
        className={cn(
          "group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] transition-all duration-[var(--transition-fast)]",
          isActive
            ? "bg-agency-primary/15 text-agency-primary shadow-sm"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-agency-primary" />
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
      data-tour={item.href === "/parametres" ? "parametres-link" : item.href === "/saisie" ? "saisie-link" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-[var(--radius-button)] px-3 text-sm font-medium transition-all duration-[var(--transition-fast)]",
        isActive
          ? "bg-agency-primary/15 text-agency-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-agency-primary" />
      )}
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
