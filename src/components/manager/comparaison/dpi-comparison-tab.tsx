"use client";

import { useState } from "react";
import { Target, User as UserIcon, Users as UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import { TeamDPIComparisonView } from "@/components/manager/comparaison/team-dpi-comparison-view";

type DpiSubMode = "conseillers" | "equipes";

export function DpiComparisonTab() {
  const [subMode, setSubMode] = useState<DpiSubMode>("conseillers");

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Target className="h-3.5 w-3.5" />
        DPI
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">Comparaison DPI</h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Comparez le Diagnostic de Performance Immobilière de deux conseillers ou de deux
        équipes au sein de votre agence.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setSubMode("conseillers")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              subMode === "conseillers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Conseillers
          </button>
          <button
            type="button"
            onClick={() => setSubMode("equipes")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              subMode === "equipes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UsersIcon className="h-3.5 w-3.5" />
            Équipes
          </button>
        </div>
      </div>

      {subMode === "conseillers" ? <DPIComparisonView /> : <TeamDPIComparisonView />}
    </section>
  );
}
