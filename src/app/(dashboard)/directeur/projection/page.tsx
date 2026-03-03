"use client";

import { TrendingUp } from "lucide-react";
import { useAgencyGPS, type ProjectionEntry } from "@/hooks/use-agency-gps";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";

export default function ProjectionPage() {
  const { projectionData } = useAgencyGPS();

  const agence = projectionData.find(e => e.niveau === "agence");
  const teams = projectionData.filter(e => e.niveau === "equipe");
  const conseillers = projectionData.filter(e => e.niveau === "conseiller");

  function renderEntry(entry: ProjectionEntry, indent = false) {
    return (
      <div key={entry.id} className={cn("flex items-center gap-4 py-2", indent && "pl-6")}>
        <span className={cn(
          "w-40 shrink-0 truncate text-sm font-medium",
          entry.niveau === "agence" && "text-base font-bold",
          entry.niveau === "equipe" && "font-semibold",
        )}>
          {entry.name}
        </span>
        <div className="flex-1">
          <ProgressBar
            value={entry.performance}
            status={entry.status}
            size={entry.niveau === "agence" ? "lg" : entry.niveau === "equipe" ? "md" : "sm"}
            showValue={false}
          />
        </div>
        <span className={cn(
          "w-16 text-right text-sm font-semibold",
          entry.status === "ok" ? "text-green-500" :
          entry.status === "warning" ? "text-orange-500" :
          "text-red-500"
        )}>
          {entry.performance}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Projection</h1>
          <p className="text-sm text-muted-foreground">Ratio de performance — Réalisé / Objectif</p>
        </div>
      </div>

      {/* Agency bar */}
      {agence && (
        <div className="rounded-lg border border-border bg-card p-4">
          {renderEntry(agence)}
        </div>
      )}

      {/* Teams */}
      {teams.map(team => (
        <div key={team.id} className="rounded-lg border border-border bg-card p-4">
          {renderEntry(team)}
          <div className="mt-1 border-t border-border pt-1">
            {conseillers
              .filter(c => c.teamId === team.teamId)
              .map(c => renderEntry(c, true))}
          </div>
        </div>
      ))}
    </div>
  );
}
