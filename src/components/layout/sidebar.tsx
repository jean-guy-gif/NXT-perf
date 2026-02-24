"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  managerOnly?: boolean;
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
    href: "/manager/parametres",
    icon: Settings,
    label: "Paramètres",
    managerOnly: true,
  },
  {
    href: "/manager/formation-collective",
    icon: BookOpen,
    label: "Formation Collective",
    managerOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const isManager = user?.role === "manager";

  const filteredItems = navItems.filter(
    (item) => !item.managerOnly || isManager
  );

  const advisorItems = filteredItems.filter((item) => !item.managerOnly);
  const managerItems = filteredItems.filter((item) => item.managerOnly);

  return (
    <nav className="flex h-full flex-col items-center gap-1 py-4 px-2">
      <Link href="/dashboard" className="mb-6 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <span className="text-sm font-bold text-primary-foreground">AG</span>
        </div>
      </Link>

      <div className="flex flex-col items-center gap-1">
        {advisorItems.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {managerItems.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-border" />
          <div className="flex flex-col items-center gap-1">
            {managerItems.map((item) => (
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
        "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100 z-50">
        {item.label}
      </span>
    </Link>
  );
}
