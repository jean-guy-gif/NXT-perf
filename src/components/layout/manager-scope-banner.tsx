"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Users, User as UserIcon } from "lucide-react";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

interface ManagerScopeBannerProps {
  hideOnRoutes?: string[];
}

export function ManagerScopeBanner({ hideOnRoutes = [] }: ManagerScopeBannerProps) {
  const pathname = usePathname();
  const { scope, conseiller, conseillerId, setScope, selectConseiller } = useManagerScope();

  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const conseillers = useMemo(() => {
    if (!currentUser) return [];
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === currentUser.teamId;
      return u.managerId === currentUser.id;
    });
  }, [users, currentUser, isDemo]);

  // Hide on configured routes (decision C1: silent — return null)
  const isHidden = hideOnRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
  if (isHidden) return null;

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        {/* Toggle Collectif/Individuel */}
        <div className="flex gap-1 rounded-lg bg-background p-1">
          <button
            type="button"
            onClick={() => {
              setScope("team");
              selectConseiller(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              scope === "team"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Collectif (équipe)
          </button>
          <button
            type="button"
            onClick={() => setScope("individual")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              scope === "individual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Individuel
          </button>
        </div>

        {/* Sélecteur conseiller (mode individual) */}
        {scope === "individual" && (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <select
              value={conseillerId ?? ""}
              onChange={(e) => selectConseiller(e.target.value || null)}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Choisir un conseiller —</option>
              {conseillers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            {conseiller ? (
              <p className="text-xs text-muted-foreground">
                Vous regardez :{" "}
                <span className="font-semibold text-foreground">
                  {conseiller.firstName} {conseiller.lastName}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sélectionnez un conseiller dans la liste
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
