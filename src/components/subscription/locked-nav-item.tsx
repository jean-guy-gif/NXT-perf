"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useState } from "react";
import { PlanProgressBadge } from "@/components/conseiller/layout/plan-progress-badge";

interface LockedNavItemProps {
  feature: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}

const AMELIORER_HREF = "/conseiller/ameliorer";

export function LockedNavItem({ feature, href, icon: Icon, label, isActive, collapsed }: LockedNavItemProps) {
  const { canAccess } = useSubscription();
  const [showToast, setShowToast] = useState(false);

  if (canAccess(feature)) {
    const showAmeliorerBadge = href === AMELIORER_HREF;
    // Render normal nav item
    if (collapsed) {
      return (
        <Link
          href={href}
          title={label}
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
          <Icon className="h-5 w-5" />
          {showAmeliorerBadge && <PlanProgressBadge variant="dot" />}
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-button)] bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md opacity-0 transition-opacity duration-[var(--transition-normal)] group-hover:opacity-100 z-50 border border-border">
            {label}
          </span>
        </Link>
      );
    }
    return (
      <Link
        href={href}
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
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {showAmeliorerBadge && <PlanProgressBadge variant="full" />}
      </Link>
    );
  }

  // Locked — show padlock
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (collapsed) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          title={`${label} (Premium)`}
          className="group relative flex h-11 w-11 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground/40 transition-all duration-[var(--transition-fast)] hover:bg-muted/30 cursor-not-allowed"
        >
          <Icon className="h-5 w-5" />
          <Lock className="absolute -right-0.5 -bottom-0.5 h-3 w-3 text-primary" />
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[var(--radius-button)] bg-popover px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-md opacity-0 transition-opacity duration-[var(--transition-normal)] group-hover:opacity-100 z-50 border border-border">
            {label} 🔒
          </span>
        </button>
        {showToast && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md">
            Premium — Souscrivez pour y accéder
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="relative flex h-10 w-full items-center gap-3 rounded-[var(--radius-button)] px-3 text-sm font-medium text-muted-foreground/40 transition-all duration-[var(--transition-fast)] hover:bg-muted/30 cursor-not-allowed"
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate">{label}</span>
        <Lock className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-primary" />
      </button>
      {showToast && (
        <div className="absolute right-0 top-full mt-1 z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md">
          Premium — Souscrivez pour y accéder
        </div>
      )}
    </div>
  );
}
