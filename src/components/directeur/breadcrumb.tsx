"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useDirecteurScope, type ScopeType } from "@/hooks/use-directeur-scope";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  scope: ScopeType;
  scopeId: string | null;
  teamContext: string | null;
  active: boolean;
}

export function DirecteurBreadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  const crumbs = useMemo<Crumb[]>(() => {
    const list: Crumb[] = [
      {
        label: "Directeur",
        scope: "agence",
        scopeId: null,
        teamContext: null,
        active: scope === "agence",
      },
    ];

    if (scope === "equipe" || scope === "conseiller") {
      const teamId = teamContext;
      if (teamId) {
        const teamFromInfos = teamInfos.find((t) => t.id === teamId)?.name;
        const manager = users.find(
          (u) => u.teamId === teamId && u.role === "manager",
        );
        const teamLabel =
          teamFromInfos ??
          (manager ? `Équipe de ${manager.firstName}` : "Équipe");
        list.push({
          label: teamLabel,
          scope: "equipe",
          scopeId: teamId,
          teamContext: teamId,
          active: scope === "equipe",
        });
      }
    }

    if (scope === "conseiller" && scopeId) {
      const conseiller = users.find((u) => u.id === scopeId);
      const label = conseiller
        ? `${conseiller.firstName} ${conseiller.lastName}`
        : "Conseiller";
      list.push({
        label,
        scope: "conseiller",
        scopeId,
        teamContext,
        active: true,
      });
    }

    return list;
  }, [scope, scopeId, teamContext, users, teamInfos]);

  function navigateTo(crumb: Crumb) {
    if (crumb.active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", crumb.scope);
    if (crumb.scopeId) params.set("id", crumb.scopeId);
    else params.delete("id");
    if (crumb.scope === "conseiller" && crumb.teamContext) {
      params.set("team", crumb.teamContext);
    } else {
      params.delete("team");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <nav
      aria-label="Fil d'ariane Directeur"
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={`${crumb.scope}-${crumb.scopeId ?? "root"}`} className="inline-flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
            <button
              type="button"
              onClick={() => navigateTo(crumb)}
              disabled={crumb.active}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-sm transition-colors",
                isLast
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                crumb.active && "cursor-default",
              )}
            >
              {crumb.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
