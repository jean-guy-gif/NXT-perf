"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Gauge,
  GitCompare,
  GraduationCap,
  Target,
  Users,
  Trophy,
  Settings,
  Zap,
  BookOpen,
  Compass,
  TrendingUp,
  Wallet,
  HeartHandshake,
  Network,
  Navigation,
  ClipboardCheck,
  Building2,
  Mic,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, getVisibleViews } from "@/stores/app-store";
import { AvatarDisplay } from "@/components/profile/avatar-upload";
import { LockedNavItem } from "@/components/subscription/locked-nav-item";
import { useBadges } from "@/hooks/use-badges";
import { BADGES } from "@/lib/badges";
import type { BadgeKey } from "@/lib/badges";
import { useCoachSession } from "@/stores/coach-session-store";
import { PersonaSelector } from "@/components/coach/persona-selector";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
  directorOnly?: boolean;
  coachOnly?: boolean;
  networkOnly?: boolean;
  /** Feature key for subscription lock check */
  lockedFeature?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/resultats", icon: BarChart3, label: "Mon Volume d'Activité", lockedFeature: "resultats" },
  { href: "/performance", icon: Gauge, label: "Mes Ratios de Transformation", lockedFeature: "performance" },
  { href: "/comparaison", icon: GitCompare, label: "Ma Comparaison", lockedFeature: "comparaison" },
  { href: "/formation", icon: GraduationCap, label: "Ma Formation", lockedFeature: "formation" },
  { href: "/manager/cockpit", icon: LayoutDashboard, label: "Mon Tableau de Bord", managerOnly: true },
  { href: "/manager/equipe", icon: BarChart3, label: "Mon Volume d'Activité", managerOnly: true },
  { href: "/manager/classement", icon: Gauge, label: "Mes Ratios de Transformation", managerOnly: true },
  { href: "/manager/comparaison", icon: GitCompare, label: "Me Comparer", managerOnly: true },
  { href: "/manager/alertes", icon: Bell, label: "Alertes", managerOnly: true },
  { href: "/manager/formation-collective", icon: BookOpen, label: "Ma Formation Collective", managerOnly: true },
  { href: "/directeur/pilotage", icon: LayoutDashboard, label: "Mon Tableau de Bord", directorOnly: true },
  { href: "/directeur/equipes", icon: BarChart3, label: "Mon Volume d'Activité", directorOnly: true },
  { href: "/directeur/performance", icon: Gauge, label: "Mes Ratios de Transformation", directorOnly: true },
  { href: "/directeur/comparaison", icon: GitCompare, label: "Me Comparer", directorOnly: true },
  { href: "/directeur/formation-collective", icon: BookOpen, label: "Ma Formation Collective", directorOnly: true },
  { href: "/directeur/pilotage-financier", icon: Wallet, label: "Pilotage Financier", directorOnly: true },
  { href: "/coach/dashboard", icon: HeartHandshake, label: "Portefeuille", coachOnly: true },
  { href: "/coach/cockpit", icon: Zap, label: "Cockpit Coach", coachOnly: true },
  { href: "/reseau/dashboard", icon: Network, label: "Vue Réseau", networkOnly: true },
  { href: "/reseau/agence", icon: Building2, label: "Mes Agences", networkOnly: true },
  { href: "/admin/dpi", icon: ClipboardCheck, label: "Leads DPI", directorOnly: true },
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

  // NXT Coach — bouton permanent
  const startSession = useCoachSession((s) => s.startSession);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);

  const handleCoachClick = () => {
    if (!(profile as any)?.coach_onboarded) {
      setShowPersonaSelector(true);
    } else {
      startSession({ trigger_type: 'bouton_manuel' });
    }
  };

  const avatarUrl = profile?.avatar_url;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : null;

  const advisorItems = visibleViews.includes("agent")
    ? navItems.filter((item) => !item.managerOnly && !item.directorOnly && !item.coachOnly && !item.networkOnly && item.href !== "/parametres")
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

      {/* NXT Coach — bouton permanent */}
      {showPersonaSelector && (
        <PersonaSelector
          onSelected={() => {
            setShowPersonaSelector(false);
            startSession({ trigger_type: 'bouton_manuel' });
          }}
        />
      )}

      {collapsed ? (
        <button
          onClick={handleCoachClick}
          title="Parler à mon coach"
          className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-[var(--transition-fast)] mb-1"
        >
          <Mic className="h-5 w-5" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-button)] bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md opacity-0 transition-opacity duration-[var(--transition-normal)] group-hover:opacity-100 z-50 border border-border">
            Parler à mon coach
          </span>
        </button>
      ) : (
        <button
          onClick={handleCoachClick}
          className="flex items-center gap-3 w-full h-10 px-3 mb-1 text-sm font-medium rounded-[var(--radius-button)] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-[var(--transition-fast)]"
        >
          <Mic className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">Parler à mon coach</span>
        </button>
      )}

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
