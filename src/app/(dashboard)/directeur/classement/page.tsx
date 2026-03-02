"use client";

import { useState, useMemo } from "react";
import { Trophy, Medal, Award, TrendingDown, Users, User } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useDirectorData } from "@/hooks/use-director-data";
import type { PeriodResults } from "@/types/results";
import type { User as AppUser } from "@/types/user";
import type { TeamAggregate } from "@/hooks/use-director-data";
import { cn } from "@/lib/utils";

type MetricKey =
  | "estimations"
  | "mandats"
  | "visites"
  | "offres"
  | "compromis"
  | "actes"
  | "ca";

type ViewMode = "conseiller" | "equipe";

const metrics: { key: MetricKey; label: string }[] = [
  { key: "estimations", label: "Estimations" },
  { key: "mandats", label: "Mandats" },
  { key: "visites", label: "Visites" },
  { key: "offres", label: "Offres" },
  { key: "compromis", label: "Compromis" },
  { key: "actes", label: "Actes" },
  { key: "ca", label: "CA" },
];

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const rankBg = [
  "border-yellow-500/30 bg-yellow-500/5",
  "border-gray-400/30 bg-gray-400/5",
  "border-orange-600/30 bg-orange-600/5",
];

interface RankEntry {
  id: string;
  name: string;
  value: number;
  rank: number;
  subtitle?: string;
}

function formatValue(value: number, metric: MetricKey): string {
  if (metric === "ca") return formatCurrency(value);
  return String(value);
}

function getMetricValue(
  results: PeriodResults | undefined,
  metric: MetricKey
): number {
  if (!results) return 0;
  switch (metric) {
    case "estimations":
      return results.vendeurs.estimationsRealisees;
    case "mandats":
      return results.vendeurs.mandatsSignes;
    case "visites":
      return results.acheteurs.nombreVisites;
    case "offres":
      return results.acheteurs.offresRecues;
    case "compromis":
      return results.acheteurs.compromisSignes;
    case "actes":
      return results.ventes.actesSignes;
    case "ca":
      return results.ventes.chiffreAffaires;
  }
}

function buildAgentRankings(
  conseillers: AppUser[],
  allResults: PeriodResults[],
  metric: MetricKey,
  teams: TeamAggregate[]
): RankEntry[] {
  const entries: RankEntry[] = conseillers.map((user) => {
    const results = allResults.find((r) => r.userId === user.id);
    const team = teams.find((t) => t.teamId === user.teamId);
    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      value: getMetricValue(results, metric),
      rank: 0,
      subtitle: team?.teamName,
    };
  });
  entries.sort((a, b) => b.value - a.value);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}

function buildTeamRankings(
  teams: TeamAggregate[],
  allResults: PeriodResults[],
  metric: MetricKey
): RankEntry[] {
  const entries: RankEntry[] = teams.map((team) => {
    let total = 0;
    for (const agent of team.agents) {
      const results = allResults.find((r) => r.userId === agent.id);
      total += getMetricValue(results, metric);
    }
    return {
      id: team.teamId,
      name: team.teamName,
      value: total,
      rank: 0,
      subtitle: team.managerName,
    };
  });
  entries.sort((a, b) => b.value - a.value);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries;
}

export default function ClassementAgencePage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("ca");
  const [viewMode, setViewMode] = useState<ViewMode>("conseiller");
  const { teams, allConseillers, allResults } = useDirectorData();

  const rankings = useMemo(() => {
    if (viewMode === "conseiller") {
      return buildAgentRankings(allConseillers, allResults, activeMetric, teams);
    }
    return buildTeamRankings(teams, allResults, activeMetric);
  }, [viewMode, activeMetric, allConseillers, allResults, teams]);

  const top3 = rankings.slice(0, 3);
  const bottom3 = [...rankings].reverse().slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Classement Agence
        </h1>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setViewMode("conseiller")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "conseiller"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Par conseiller
          </button>
          <button
            onClick={() => setViewMode("equipe")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "equipe"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Par équipe
          </button>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 rounded-lg bg-muted p-1 min-w-max">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeMetric === m.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 and Bottom 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 3 */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top 3
          </h2>
          {top3.map((entry, idx) => {
            const Icon = rankIcons[idx] ?? Trophy;
            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-4 transition-colors",
                  rankBg[idx] ?? "border-border bg-card"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      rankColors[idx] ?? "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {entry.name}
                  </p>
                  {entry.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {entry.subtitle}
                    </p>
                  )}
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatValue(entry.value, activeMetric)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom 3 */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
            <TrendingDown className="h-5 w-5 text-red-400" />
            À suivre
          </h2>
          {bottom3.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-500">
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.name}
                </p>
                {entry.subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {entry.subtitle}
                  </p>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatValue(entry.value, activeMetric)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Full ranking table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  {viewMode === "conseiller" ? "Conseiller" : "Équipe"}
                </th>
                {viewMode === "conseiller" && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Équipe
                  </th>
                )}
                {viewMode === "equipe" && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Manager
                  </th>
                )}
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {metrics.find((m) => m.key === activeMetric)?.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={cn(
                    "border-b border-border last:border-b-0 transition-colors",
                    idx < 3
                      ? "bg-green-500/5"
                      : idx >= rankings.length - 1
                        ? "bg-red-500/5"
                        : ""
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        idx === 0
                          ? "bg-yellow-500/20 text-yellow-500"
                          : idx === 1
                            ? "bg-gray-400/20 text-gray-400"
                            : idx === 2
                              ? "bg-orange-600/20 text-orange-600"
                              : "text-muted-foreground"
                      )}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {entry.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {entry.subtitle}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                    {formatValue(entry.value, activeMetric)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
