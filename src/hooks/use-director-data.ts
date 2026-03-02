"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";

export interface TeamAggregate {
  teamId: string;
  teamName: string;
  managerId: string;
  managerName: string;
  agents: User[];
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  totalExclusifs: number;
  avgExclusivite: number;
  avgPerformance: number;
  agentCount: number;
}

export interface OrgStats {
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  avgExclusivite: number;
  avgPerformance: number;
  totalAgents: number;
  totalManagers: number;
  teamCount: number;
}

const teamLabels: Record<string, string> = {
  "team-demo": "Équipe Jean-Guy",
  "team-beta": "Équipe Sophie",
  "team-gamma": "Équipe Marc",
};

function computeAgentPerformance(
  user: User,
  allResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>
): number {
  const results = allResults.find((r) => r.userId === user.id);
  if (!results) return 0;
  const ratios = computeAllRatios(results, user.category, ratioConfigs);
  if (ratios.length === 0) return 0;
  return Math.round(
    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length
  );
}

export function useDirectorData() {
  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const allConseillers = useMemo(
    () => users.filter((u) => u.role === "conseiller"),
    [users]
  );

  const allManagers = useMemo(
    () => users.filter((u) => u.role === "manager" || u.role === "directeur"),
    [users]
  );

  const teams = useMemo(() => {
    // Group agents by teamId
    const teamMap = new Map<string, User[]>();
    for (const agent of allConseillers) {
      const tid = agent.teamId;
      if (!tid) continue;
      if (!teamMap.has(tid)) teamMap.set(tid, []);
      teamMap.get(tid)!.push(agent);
    }

    // Build team aggregates
    const result: TeamAggregate[] = [];
    for (const manager of allManagers) {
      const tid = manager.teamId;
      if (!tid) continue;
      const agents = teamMap.get(tid) ?? [];

      let totalCA = 0;
      let totalActes = 0;
      let totalMandats = 0;
      let totalExclusifs = 0;
      let totalPerformance = 0;

      for (const agent of agents) {
        const res = allResults.find((r) => r.userId === agent.id);
        if (!res) continue;
        totalCA += res.ventes.chiffreAffaires;
        totalActes += res.ventes.actesSignes;
        totalMandats += res.vendeurs.mandats.length;
        totalExclusifs += res.vendeurs.mandats.filter(
          (m) => m.type === "exclusif"
        ).length;
        totalPerformance += computeAgentPerformance(
          agent,
          allResults,
          ratioConfigs
        );
      }

      const avgExclusivite =
        totalMandats > 0
          ? Math.round((totalExclusifs / totalMandats) * 100)
          : 0;
      const avgPerformance =
        agents.length > 0 ? Math.round(totalPerformance / agents.length) : 0;

      result.push({
        teamId: tid,
        teamName: teamLabels[tid] ?? tid,
        managerId: manager.id,
        managerName: `${manager.firstName} ${manager.lastName}`,
        agents,
        totalCA,
        totalActes,
        totalMandats,
        totalExclusifs,
        avgExclusivite,
        avgPerformance,
        agentCount: agents.length,
      });

      // Remove from map so we know which agents are unassigned
      teamMap.delete(tid);
    }

    // Add any remaining teams that have no manager
    for (const [tid, agents] of teamMap.entries()) {
      let totalCA = 0;
      let totalActes = 0;
      let totalMandats = 0;
      let totalExclusifs = 0;
      let totalPerformance = 0;

      for (const agent of agents) {
        const res = allResults.find((r) => r.userId === agent.id);
        if (!res) continue;
        totalCA += res.ventes.chiffreAffaires;
        totalActes += res.ventes.actesSignes;
        totalMandats += res.vendeurs.mandats.length;
        totalExclusifs += res.vendeurs.mandats.filter(
          (m) => m.type === "exclusif"
        ).length;
        totalPerformance += computeAgentPerformance(
          agent,
          allResults,
          ratioConfigs
        );
      }

      const avgExclusivite =
        totalMandats > 0
          ? Math.round((totalExclusifs / totalMandats) * 100)
          : 0;
      const avgPerformance =
        agents.length > 0 ? Math.round(totalPerformance / agents.length) : 0;

      result.push({
        teamId: tid,
        teamName: teamLabels[tid] ?? tid,
        managerId: "",
        managerName: "Non assigné",
        agents,
        totalCA,
        totalActes,
        totalMandats,
        totalExclusifs,
        avgExclusivite,
        avgPerformance,
        agentCount: agents.length,
      });
    }

    return result;
  }, [allConseillers, allManagers, allResults, ratioConfigs]);

  const orgStats = useMemo<OrgStats>(() => {
    let totalCA = 0;
    let totalActes = 0;
    let totalMandats = 0;
    let totalExclusifs = 0;
    let totalPerformance = 0;

    for (const agent of allConseillers) {
      const res = allResults.find((r) => r.userId === agent.id);
      if (!res) continue;
      totalCA += res.ventes.chiffreAffaires;
      totalActes += res.ventes.actesSignes;
      totalMandats += res.vendeurs.mandats.length;
      totalExclusifs += res.vendeurs.mandats.filter(
        (m) => m.type === "exclusif"
      ).length;
      totalPerformance += computeAgentPerformance(
        agent,
        allResults,
        ratioConfigs
      );
    }

    const avgExclusivite =
      totalMandats > 0
        ? Math.round((totalExclusifs / totalMandats) * 100)
        : 0;
    const avgPerformance =
      allConseillers.length > 0
        ? Math.round(totalPerformance / allConseillers.length)
        : 0;

    return {
      totalCA,
      totalActes,
      totalMandats,
      avgExclusivite,
      avgPerformance,
      totalAgents: allConseillers.length,
      totalManagers: allManagers.length,
      teamCount: teams.length,
    };
  }, [allConseillers, allManagers, allResults, ratioConfigs, teams.length]);

  return {
    teams,
    allConseillers,
    allManagers,
    orgStats,
    allResults,
    ratioConfigs,
  };
}
