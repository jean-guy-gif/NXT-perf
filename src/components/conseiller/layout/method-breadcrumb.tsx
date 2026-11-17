"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Wrench, LineChart, Users, ChevronRight } from "lucide-react";
import { isFormationMode } from "@/lib/app-mode";

const STEPS = [
  { href: "/conseiller/diagnostic", label: "Mon diagnostic", icon: Search },
  { href: "/conseiller/ameliorer", label: "M'améliorer", icon: Wrench },
  { href: "/conseiller/progression", label: "Ma progression", icon: LineChart },
  { href: "/conseiller/comparaison", label: "Ma comparaison", icon: Users },
] as const;

// Mode formation : progression et comparaison masquées (pas supprimées).
const FORMATION_HIDDEN_HREFS = new Set<string>([
  "/conseiller/progression",
  "/conseiller/comparaison",
]);

// Mode formation : libellés alignés sur le menu (sidebar).
const FORMATION_LABELS: Record<string, string> = {
  "/conseiller/diagnostic": "Mon tableau de bord",
  "/conseiller/ameliorer": "Mon plan d'action",
};

export function MethodBreadcrumb() {
  const pathname = usePathname();
  const steps = isFormationMode()
    ? STEPS.filter((s) => !FORMATION_HIDDEN_HREFS.has(s.href)).map((s) => ({
        ...s,
        label: FORMATION_LABELS[s.href] ?? s.label,
      }))
    : STEPS;

  return (
    <nav
      aria-label="Méthode NXT Performance"
      className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-4 pt-4 pb-2"
    >
      {steps.map((step, idx) => {
        const isActive =
          pathname === step.href || pathname.startsWith(step.href + "/");
        const Icon = step.icon;

        return (
          <div key={step.href} className="flex items-center gap-1.5">
            <Link
              href={step.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {step.label}
            </Link>
            {idx < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
