"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { aggregateResults } from "@/lib/aggregate-results";
import { computeAllRatios } from "@/lib/ratios";
import { computeDPIAxes, computeGlobalDPIScore, type DPIAxis } from "@/lib/dpi-axes";
import { MiniRadar } from "@/components/dpi/mini-radar";
import { cn } from "@/lib/utils";
import type { PeriodResults } from "@/types/results";

interface TeamDPI {
  teamId: string;
  teamName: string;
  scores: DPIAxis[];
  globalScore: number;
}

function computeTeamDPI(
  teamId: string,
  teamName: string,
  conseillerIds: string[],
  allResults: PeriodResults[],
  ratioConfigs: ReturnType<typeof useAppStore.getState>["ratioConfigs"],
): TeamDPI | null {
  const teamResults = allResults.filter((r) => conseillerIds.includes(r.userId));
  const agg = aggregateResults(teamResults);
  if (!agg) return null;
  // Reference category at team level: confirme (manager equity)
  const ratios = computeAllRatios(agg, "confirme", ratioConfigs);
  const axes = computeDPIAxes(agg, "confirme", ratios);
  const globalScore = computeGlobalDPIScore(axes);
  return { teamId, teamName, scores: axes, globalScore };
}

export function TeamDPIComparisonView() {
  const { user } = useUser();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const myInstitutionId = user?.institutionId;
  const myTeamId = user?.teamId;

  const teams = useMemo(() => {
    const fromInfos = teamInfos.filter((t) => t.institutionId === myInstitutionId);
    if (fromInfos.length > 0) return fromInfos;
    const teamIds = new Set<string>();
    users.forEach((u) => {
      if (u.institutionId === myInstitutionId && u.teamId) teamIds.add(u.teamId);
    });
    return Array.from(teamIds).map((tid) => {
      const mgr = users.find(
        (u) => u.teamId === tid && (u.role === "manager" || u.role === "directeur"),
      );
      return {
        id: tid,
        name: mgr ? `Équipe de ${mgr.firstName}` : tid,
        institutionId: myInstitutionId ?? "",
        managerId: mgr?.id ?? "",
        inviteCode: "",
      };
    });
  }, [teamInfos, users, myInstitutionId]);

  const [teamAId, setTeamAId] = useState(myTeamId ?? teams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState(
    teams.find((t) => t.id !== myTeamId)?.id ?? teams[1]?.id ?? "",
  );

  const dpiA = useMemo(() => {
    const team = teams.find((t) => t.id === teamAId);
    if (!team) return null;
    const ids = users.filter((u) => u.teamId === team.id && u.role === "conseiller").map((u) => u.id);
    return computeTeamDPI(team.id, team.name, ids, allResults, ratioConfigs);
  }, [teamAId, teams, users, allResults, ratioConfigs]);

  const dpiB = useMemo(() => {
    const team = teams.find((t) => t.id === teamBId);
    if (!team) return null;
    const ids = users.filter((u) => u.teamId === team.id && u.role === "conseiller").map((u) => u.id);
    return computeTeamDPI(team.id, team.name, ids, allResults, ratioConfigs);
  }, [teamBId, teams, users, allResults, ratioConfigs]);

  const statusColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-orange-500" : "text-red-500";
  const radarColor = (score: number) =>
    score >= 80 ? "#39C97E" : score >= 60 ? "#FFA448" : "#EF7550";

  if (teams.length <= 1) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune autre équipe à comparer dans votre agence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélecteurs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Équipe A
          </label>
          <select
            value={teamAId}
            onChange={(e) => setTeamAId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === myTeamId ? " (mon équipe)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Équipe B
          </label>
          <select
            value={teamBId}
            onChange={(e) => setTeamBId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.id === myTeamId ? " (mon équipe)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Double radar */}
      {dpiA && dpiB && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="mb-1 font-semibold text-foreground">{dpiA.teamName}</p>
              <p className={cn("mb-4 text-3xl font-bold", statusColor(dpiA.globalScore))}>
                {dpiA.globalScore}/100
              </p>
              <div className="flex justify-center">
                <MiniRadar
                  scores={dpiA.scores}
                  color={radarColor(dpiA.globalScore)}
                  size={220}
                  showLabels
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="mb-1 font-semibold text-foreground">{dpiB.teamName}</p>
              <p className={cn("mb-4 text-3xl font-bold", statusColor(dpiB.globalScore))}>
                {dpiB.globalScore}/100
              </p>
              <div className="flex justify-center">
                <MiniRadar
                  scores={dpiB.scores}
                  color={radarColor(dpiB.globalScore)}
                  size={220}
                  showLabels
                />
              </div>
            </div>
          </div>

          {/* Tableau comparatif axe par axe */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 font-semibold text-foreground">Comparaison axe par axe</p>
            <div className="space-y-3">
              {dpiA.scores.map((axisA, idx) => {
                const axisB = dpiB.scores[idx];
                if (!axisB) return null;
                const delta = axisA.score - axisB.score;
                const winner = delta > 0 ? "A" : delta < 0 ? "B" : "equal";
                return (
                  <div key={axisA.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                      {axisA.label}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            winner === "A" ? "text-green-500" : "text-muted-foreground",
                          )}
                        >
                          {axisA.score}%
                        </span>
                        <div className="h-2 w-full max-w-[80px] overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-agency-primary"
                            style={{ width: `${axisA.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "w-12 shrink-0 text-center text-xs font-bold",
                        delta > 0
                          ? "text-green-500"
                          : delta < 0
                            ? "text-red-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? `+${delta}` : delta === 0 ? "=" : String(delta)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full max-w-[80px] overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-orange-400"
                            style={{ width: `${axisB.score}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-bold",
                            winner === "B" ? "text-green-500" : "text-muted-foreground",
                          )}
                        >
                          {axisB.score}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full bg-agency-primary" />
                <span>{dpiA.teamName}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-6 rounded-full bg-orange-400" />
                <span>{dpiB.teamName}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {(!dpiA || !dpiB) && (
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Données insuffisantes pour comparer ces équipes.
          </p>
        </div>
      )}
    </div>
  );
}
