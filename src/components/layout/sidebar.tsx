"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  BookOpen,
  Compass,
  Wallet,
  Network,
  ClipboardCheck,
  Building2,
  Search,
  Wrench,
  LineChart,
  Users,
  Fingerprint,
  LayoutDashboard,
  Crosshair,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFormationMode, isManagerLocked } from "@/lib/app-mode";
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
  { href: "/conseiller/diagnostic", icon: Search, label: "Mon diagnostic" },
  { href: "/conseiller/ameliorer", icon: Wrench, label: "M'améliorer", lockedFeature: "formation" },
  { href: "/conseiller/progression", icon: LineChart, label: "Ma progression" },
  { href: "/conseiller/comparaison", icon: Users, label: "Ma comparaison", lockedFeature: "comparaison" },
  // Sous-PR Coach-25 — portrait typologique du conseiller, lecture pure
  // de sa data sans saisie additionnelle. Place a la fin de la section
  // conseiller pour ne pas perturber les habitudes du parcours principal.
  { href: "/conseiller/identite", icon: Fingerprint, label: "Mon identité" },
  // PR3.8.1 — refonte Manager alignée sur la nav Conseiller V3.
  // Anciennes entrées (Tableau de bord / Mon Volume / Mes Ratios) absorbées
  // par "Mon diagnostic". Routes legacy redirigées via next.config.ts.
  { href: "/manager/diagnostic", icon: Search, label: "Mon diagnostic", managerOnly: true },
  { href: "/manager/ameliorer", icon: Wrench, label: "Faire progresser mon équipe", managerOnly: true },
  { href: "/manager/progression", icon: LineChart, label: "Notre progression", managerOnly: true },
  { href: "/manager/comparaison", icon: Users, label: "Notre comparaison", managerOnly: true },
  { href: "/manager/formation", icon: BookOpen, label: "Ma formation", managerOnly: true },
  // PR-Refonte-Directeur sous-PR 0 — sidebar alignée sur la nav Conseiller/Manager V3.
  // Anciennes entrées (Tableau de bord / Mon Volume / Mes Ratios) absorbées par
  // "Mon diagnostic". Routes legacy redirigées via next.config.ts.
  { href: "/directeur/diagnostic", icon: Search, label: "Mon diagnostic", directorOnly: true },
  { href: "/directeur/ameliorer", icon: Wrench, label: "Faire progresser ma direction", directorOnly: true },
  { href: "/directeur/progression", icon: LineChart, label: "Notre progression", directorOnly: true },
  { href: "/directeur/comparaison", icon: Users, label: "Ma comparaison", directorOnly: true },
  { href: "/directeur/formation", icon: BookOpen, label: "Ma formation", directorOnly: true },
  { href: "/directeur/pilotage-financier", icon: Wallet, label: "Pilotage Financier", directorOnly: true, separatorBefore: true },
  { href: "/directeur/leads-dpi", icon: ClipboardCheck, label: "Leads DPI", directorOnly: true },
  { href: "/reseau/dashboard", icon: Network, label: "Vue Réseau", networkOnly: true },
  { href: "/reseau/agence", icon: Building2, label: "Mes Agences", networkOnly: true },
  { href: "/pourquoi-nxt", icon: Compass, label: "Notre approche" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

/**
 * Mode formation : le menu conseiller se réduit à 3 entrées (masquage, pas
 * suppression — les autres pages existent toujours). « Mes points de douleur »
 * pointe sur la même page que le tableau de bord, ancrée sur la section des
 * points de douleur (#points-douleur).
 */
const FORMATION_ADVISOR_ITEMS: NavItem[] = [
  { href: "/conseiller/diagnostic", icon: LayoutDashboard, label: "Mon tableau de bord" },
  { href: "/conseiller/diagnostic#points-douleur", icon: Crosshair, label: "Mes points de douleur" },
  { href: "/conseiller/ameliorer", icon: Wrench, label: "Mon plan d'action" },
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

  // Mode formation : l'espace manager est verrouillé (flou + cadenas), visible
  // mais non cliquable. Un clic sur une entrée manager affiche un petit toast.
  const managerLocked = isManagerLocked();
  const [lockedToast, setLockedToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLockedToast = () => {
    setLockedToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setLockedToast(false), 2600);
  };

  const { earnedBadges } = useBadges();
  const recentBadgeEmojis = earnedBadges.slice(0, 3).map((b) => BADGES[b.badge_key as BadgeKey]?.emoji).filter(Boolean);

  const avatarUrl = profile?.avatar_url;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : null;

  // Mode formation : pas de CTA d'abonnement — on neutralise le verrou
  // (lockedFeature route vers /souscrire) sur les entrées visibles.
  const formation = isFormationMode();
  const stripLock = (item: NavItem): NavItem =>
    formation ? { ...item, lockedFeature: undefined } : item;

  const utilityHrefs = new Set(["/pourquoi-nxt", "/parametres"]);
  const advisorItems = !visibleViews.includes("agent")
    ? []
    : formation
      ? // Formation : 3 entrées seulement (tableau de bord, points de douleur,
        // plan d'action). Comparaison / progression / identité masquées.
        FORMATION_ADVISOR_ITEMS
      : navItems
          .filter(
            (item) =>
              !item.managerOnly &&
              !item.directorOnly &&
              !item.networkOnly &&
              !utilityHrefs.has(item.href)
          )
          .map(stripLock);
  const managerItems = visibleViews.includes("manager")
    ? navItems.filter((item) => item.managerOnly).map(stripLock)
    : [];
  const directorItems = visibleViews.includes("directeur")
    ? navItems.filter((item) => item.directorOnly)
    : [];
  const networkItems = visibleViews.includes("reseau")
    ? navItems.filter((item) => item.networkOnly)
    : [];
  const approachItem = navItems.find((item) => item.href === "/pourquoi-nxt")!;
  const settingsItem = navItems.find((item) => item.href === "/parametres")!;

  return (
    <>
    <nav data-tour="sidebar" className={cn(
      "flex h-full flex-col overflow-y-auto py-4 bg-[var(--agency-dark,#1A1A2E)]",
      collapsed ? "items-center px-2" : "px-3"
    )}>
      {/* Profile avatar */}
      <Link
        href="/conseiller/diagnostic"
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
          {managerItems.map((item) =>
            managerLocked ? (
              <LockedManagerItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                onClick={showLockedToast}
              />
            ) : (
              <SidebarItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            )
          )}
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

      {/* Zone utilitaire bas */}
      <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
        <SidebarItem item={approachItem} pathname={pathname} collapsed={collapsed} />
        <SidebarItem item={settingsItem} pathname={pathname} collapsed={collapsed} />
      </div>
    </nav>
    {lockedToast && (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-6 z-[60] flex items-center gap-2 rounded-[var(--radius-button)] border border-border bg-popover px-4 py-2.5 text-sm font-medium text-popover-foreground shadow-lg"
      >
        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        Espace manager disponible prochainement
      </div>
    )}
    </>
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
        data-tour={item.href === "/parametres" ? "parametres-link" : undefined}
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

/**
 * Entrée manager VERROUILLÉE en formation : affichée, grisée, avec un cadenas
 * et le libellé « Bientôt ». Non cliquable vers la page — un clic déclenche le
 * toast « Espace manager disponible prochainement ». (On n'utilise PAS
 * LockedNavItem, qui route vers /souscrire, masqué en formation.)
 */
function LockedManagerItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${item.label} — Bientôt`}
        aria-label={`${item.label} — espace manager disponible prochainement`}
        className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground/50 transition-all duration-[var(--transition-fast)] hover:bg-muted/40"
      >
        <item.icon className="h-5 w-5" />
        <Lock className="absolute bottom-1 right-1 h-3 w-3" />
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-button)] bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md opacity-0 transition-opacity duration-[var(--transition-normal)] group-hover:opacity-100 z-50 border border-border">
          {item.label} — Bientôt
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${item.label} — espace manager disponible prochainement`}
      className="relative flex h-10 w-full items-center gap-3 rounded-[var(--radius-button)] px-3 text-sm font-medium text-muted-foreground/50 transition-all duration-[var(--transition-fast)] hover:bg-muted/40"
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
      <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
        Bientôt
        <Lock className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
