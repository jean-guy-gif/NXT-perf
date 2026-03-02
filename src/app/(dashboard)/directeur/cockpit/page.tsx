"use client";

import { useState } from "react";
import {
  DollarSign,
  FileCheck,
  FileSignature,
  Gauge,
  Building2,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { useDirectorData } from "@/hooks/use-director-data";
import { computeAllRatios } from "@/lib/ratios";
import { cn } from "@/lib/utils";

type Tab = "globale" | "equipe" | "conseiller";

const tabs: { key: Tab; label: string }[] = [
  { key: "globale", label: "Vue globale" },
  { key: "equipe", label: "Par équipe" },
  { key: "conseiller", label: "Par conseiller" },
];

export default function CockpitAgencePage() {
  const [activeTab, setActiveTab] = useState<Tab>("globale");
  const { teams, allConseillers, orgStats, allResults, ratioConfigs } =
    useDirectorData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Cockpit Agence
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {orgStats.teamCount} équipes
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">
              {orgStats.totalAgents} conseillers
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 rounded-lg bg-muted p-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vue globale */}
      {activeTab === "globale" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="CA Total Agence"
              value={formatCurrency(orgStats.totalCA)}
              icon={DollarSign}
              status="ok"
            />
            <KpiCard
              title="Total Actes"
              value={orgStats.totalActes}
              icon={FileCheck}
              status="ok"
            />
            <KpiCard
              title="Exclusivité moyenne"
              value={`${orgStats.avgExclusivite} %`}
              icon={FileSignature}
              status={orgStats.avgExclusivite >= 50 ? "ok" : "warning"}
            />
            <KpiCard
              title="Performance moyenne"
              value={`${orgStats.avgPerformance} %`}
              icon={Gauge}
              status={
                orgStats.avgPerformance >= 80
                  ? "ok"
                  : orgStats.avgPerformance >= 60
                    ? "warning"
                    : "danger"
              }
            />
          </div>

          {/* Team summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team.teamId}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {team.teamName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {team.agentCount} conseillers
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manager : {team.managerName}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CA</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(team.totalCA)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Performance
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        team.avgPerformance >= 80
                          ? "text-green-500"
                          : team.avgPerformance >= 60
                            ? "text-orange-500"
                            : "text-red-500"
                      )}
                    >
                      {team.avgPerformance} %
                    </span>
                  </div>
                  <ProgressBar
                    value={team.avgPerformance}
                    showValue={false}
                    size="sm"
                    status={
                      team.avgPerformance >= 80
                        ? "ok"
                        : team.avgPerformance >= 60
                          ? "warning"
                          : "danger"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Par équipe */}
      {activeTab === "equipe" && (
        <div className="space-y-6">
          {teams.map((team) => (
            <div
              key={team.teamId}
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {team.teamName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manager : {team.managerName}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {team.agentCount} conseillers
                </span>
              </div>

              <div className="space-y-2">
                {team.agents.map((agent) => {
                  const results = allResults.find(
                    (r) => r.userId === agent.id
                  );
                  const ratios = results
                    ? computeAllRatios(results, agent.category, ratioConfigs)
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
            </div>
          ))}
        </div>
      )}

      {/* Par conseiller */}
      {activeTab === "conseiller" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Conseiller
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Équipe
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    CA
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actes
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...allConseillers]
                  .map((agent) => {
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
                    const actes = results?.ventes.actesSignes ?? 0;
                    const team = teams.find(
                      (t) => t.teamId === agent.teamId
                    );
                    return { agent, ca, actes, avgPerf, teamName: team?.teamName ?? "" };
                  })
                  .sort((a, b) => b.ca - a.ca)
                  .map(({ agent, ca, actes, avgPerf, teamName }) => (
                    <tr
                      key={agent.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {agent.firstName[0]}
                            {agent.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {agent.firstName} {agent.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {teamName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            CATEGORY_COLORS[agent.category]
                          )}
                        >
                          {CATEGORY_LABELS[agent.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                        {formatCurrency(ca)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {actes}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            avgPerf >= 80
                              ? "text-green-500"
                              : avgPerf >= 60
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {avgPerf} %
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
