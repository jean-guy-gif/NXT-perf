"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  mockRankingsCA,
  mockRankingsMandats,
  mockRankingsActes,
  mockRankingsEstimations,
  mockRankingsVisites,
  mockRankingsOffres,
  mockRankingsCompromis,
} from "@/data/mock-team";
import { Trophy, Medal, Award, TrendingDown, Users, User } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import type { RankingEntry } from "@/types/team";

type MetricKey =
  | "estimations"
  | "mandats"
  | "visites"
  | "offres"
  | "compromis"
  | "actes"
  | "ca";

type ViewMode = "individuel" | "equipe";

const metrics: { key: MetricKey; label: string }[] = [
  { key: "estimations", label: "Estimations" },
  { key: "mandats", label: "Mandats" },
  { key: "visites", label: "Visites" },
  { key: "offres", label: "Offres" },
  { key: "compromis", label: "Compromis" },
  { key: "actes", label: "Actes" },
  { key: "ca", label: "CA" },
];

const mockRankingsMap: Record<MetricKey, RankingEntry[]> = {
  estimations: mockRankingsEstimations,
  mandats: mockRankingsMandats,
  visites: mockRankingsVisites,
  offres: mockRankingsOffres,
  compromis: mockRankingsCompromis,
  actes: mockRankingsActes,
  ca: mockRankingsCA,
};

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const rankBg = [
  "border-yellow-500/30 bg-yellow-500/5",
  "border-gray-400/30 bg-gray-400/5",
  "border-orange-600/30 bg-orange-600/5",
];

function formatValue(value: number, metric: MetricKey): string {
  if (metric === "ca") return formatCurrency(value);
  return String(value);
}

import type { PeriodResults } from "@/types/results";
import type { User as AppUser } from "@/types/user";

function buildRankings(
  metric: MetricKey,
  users: AppUser[],
  allResults: PeriodResults[],
  currentUser: AppUser | null,
  isDemo: boolean,
): RankingEntry[] {
  const conseillers = users.filter((u) => {
    if (u.role !== "conseiller") return false;
    if (!currentUser) return false;
    if (isDemo) return u.teamId === currentUser.teamId;
    return u.managerId === currentUser.id;
  });
  const entries: RankingEntry[] = conseillers.map((user) => {
    const results = allResults.find((r) => r.userId === user.id);
    let value = 0;
    if (results) {
      switch (metric) {
        case "estimations": value = results.vendeurs.estimationsRealisees; break;
        case "mandats": value = results.vendeurs.mandatsSignes; break;
        case "visites": value = results.acheteurs.nombreVisites; break;
        case "offres": value = results.acheteurs.offresRecues; break;
        case "compromis": value = results.acheteurs.compromisSignes; break;
        case "actes": value = results.ventes.actesSignes; break;
        case "ca": value = results.ventes.chiffreAffaires; break;
      }
    }
    return { userId: user.id, userName: `${user.firstName} ${user.lastName}`, value, rank: 0 };
  });
  entries.sort((a, b) => b.value - a.value);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries;
}

export default function ClassementPage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("ca");
  const [viewMode, setViewMode] = useState<ViewMode>("individuel");
  const isDemo = useAppStore((s) => s.isDemo);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const allResults = useAllResults();

  const rankings = useMemo(() => {
    if (isDemo) return mockRankingsMap[activeMetric];
    return buildRankings(activeMetric, users, allResults, currentUser, isDemo);
  }, [isDemo, activeMetric, users, allResults, currentUser]);

  const top3 = rankings.slice(0, 3);
  const bottom3 = [...rankings].reverse().slice(0, 3);

  // Team aggregate for "equipe" mode
  const teamTotal = rankings.reduce((sum, r) => sum + r.value, 0);
  const teamAvg = rankings.length > 0 ? teamTotal / rankings.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Classement</h1>
        {/* View Mode Toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setViewMode("individuel")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === "individuel"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Individuel
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
            Equipe
          </button>
        </div>
      </div>

      {/* Metric Selector - scrollable on mobile */}
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

      {viewMode === "equipe" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-sm text-muted-foreground">Total equipe</p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {formatValue(teamTotal, activeMetric)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Moyenne</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {activeMetric === "ca"
                ? formatCurrency(Math.round(teamAvg))
                : teamAvg.toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Conseillers</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {rankings.length}
            </p>
          </div>
        </div>
      )}

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
                key={entry.userId}
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
                    {entry.userName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    #{entry.rank}
                  </p>
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
            A suivre
          </h2>
          {bottom3.map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-sm font-bold text-red-500">
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.userName}
                </p>
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
                  Conseiller
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  {metrics.find((m) => m.key === activeMetric)?.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((entry, idx) => (
                <tr
                  key={entry.userId}
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
                    {entry.userName}
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
