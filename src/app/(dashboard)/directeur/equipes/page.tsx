"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { useDirectorData } from "@/hooks/use-director-data";
import { computeAllRatios } from "@/lib/ratios";
import { cn } from "@/lib/utils";

export default function EquipesPage() {
  const { teams, allConseillers, allResults, ratioConfigs } =
    useDirectorData();
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>(
    {}
  );

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Agents with no manager
  const unassignedAgents = allConseillers.filter(
    (a) => !a.managerId && !teams.some((t) => t.agents.some((ag) => ag.id === a.id))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Équipes</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {teams.length} équipes
          </span>
        </div>
      </div>

      {/* Team cards */}
      <div className="space-y-4">
        {teams.map((team) => {
          const isExpanded = expandedTeams[team.teamId] ?? false;

          return (
            <div
              key={team.teamId}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Team header */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {team.managerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {team.managerName}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {team.agentCount} conseillers
                  </span>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">CA</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {formatCurrency(team.totalCA)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Actes</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {team.totalActes}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">
                      Exclusivité
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {team.avgExclusivite} %
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">
                      Performance
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-bold",
                        team.avgPerformance >= 80
                          ? "text-green-500"
                          : team.avgPerformance >= 60
                            ? "text-orange-500"
                            : "text-red-500"
                      )}
                    >
                      {team.avgPerformance} %
                    </p>
                  </div>
                </div>

                {/* Toggle button */}
                <button
                  onClick={() => toggleTeam(team.teamId)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {isExpanded ? "Masquer" : "Voir"} les conseillers
                </button>
              </div>

              {/* Collapsible agent list */}
              {isExpanded && (
                <div className="border-t border-border px-5 py-3 space-y-2">
                  {team.agents.map((agent) => {
                    const results = allResults.find(
                      (r) => r.userId === agent.id
                    );
                    const ratios = results
                      ? computeAllRatios(
                          results,
                          agent.category,
                          ratioConfigs
                        )
                      : [];
                    const avgPerf =
                      ratios.length > 0
                        ? Math.round(
                            ratios.reduce(
                              (s, r) => s + r.percentageOfTarget,
                              0
                            ) / ratios.length
                          )
                        : 0;
                    const ca = results?.ventes.chiffreAffaires ?? 0;

                    return (
                      <div
                        key={agent.id}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {agent.firstName[0]}
                          {agent.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {agent.firstName} {agent.lastName}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            CATEGORY_COLORS[agent.category]
                          )}
                        >
                          {CATEGORY_LABELS[agent.category]}
                        </span>
                        <span className="text-sm font-medium text-foreground w-20 text-right">
                          {formatCurrency(ca)}
                        </span>
                        <div className="w-20">
                          <ProgressBar
                            value={avgPerf}
                            status={
                              avgPerf >= 80
                                ? "ok"
                                : avgPerf >= 60
                                  ? "warning"
                                  : "danger"
                            }
                            showValue={false}
                            size="sm"
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-bold w-12 text-right",
                            avgPerf >= 80
                              ? "text-green-500"
                              : avgPerf >= 60
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {avgPerf}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned agents */}
      {unassignedAgents.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 space-y-3">
          <h3 className="font-semibold text-foreground">
            Agents non assignés
          </h3>
          <div className="space-y-2">
            {unassignedAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 text-xs font-bold text-orange-500">
                  {agent.firstName[0]}
                  {agent.lastName[0]}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {agent.firstName} {agent.lastName}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    CATEGORY_COLORS[agent.category]
                  )}
                >
                  {CATEGORY_LABELS[agent.category]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
