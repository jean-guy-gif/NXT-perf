"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { Network } from "@/data/mock-network";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgencyAlert {
  type: "performance" | "exclusivite" | "activite" | "transformation";
  severity: "warning" | "critical";
  message: string;
}

export interface AgencyAggregate {
  institutionId: string;
  institutionName: string;
  directeurName: string;
  agents: User[];
  managers: User[];
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  totalExclusifs: number;
  totalCompromis: number;
  totalOffres: number;
  totalVisites: number;
  totalEstimations: number;
  avgExclusivite: number;
  avgPerformance: number;
  agentCount: number;
  managerCount: number;
  alerts: AgencyAlert[];
}

export interface NetworkStats {
  totalCA: number;
  totalActes: number;
  totalMandats: number;
  totalCompromis: number;
  totalOffres: number;
  totalEstimations: number;
  totalVisites: number;
  avgExclusivite: number;
  avgPerformance: number;
  totalAgents: number;
  totalManagers: number;
  agencyCount: number;
}

export interface TopPerformer {
  user: User;
  institutionId: string;
  institutionName: string;
  score: number;
  ca: number;
  role: "agent" | "manager" | "directeur";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function getUserCA(userId: string, allResults: PeriodResults[]): number {
  const r = allResults.find((r) => r.userId === userId);
  return r?.ventes.chiffreAffaires ?? 0;
}

function generateAlerts(
  avgPerformance: number,
  avgExclusivite: number,
  totalMandats: number,
  totalOffres: number,
  agentCount: number
): AgencyAlert[] {
  const alerts: AgencyAlert[] = [];

  if (avgPerformance < 60) {
    alerts.push({
      type: "performance",
      severity: "critical",
      message: "Performance globale critique",
    });
  } else if (avgPerformance < 80) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: "Performance en dessous des attentes",
    });
  }

  if (avgExclusivite < 30) {
    alerts.push({
      type: "exclusivite",
      severity: "critical",
      message: "Taux d'exclusivité trop faible",
    });
  } else if (avgExclusivite < 50) {
    alerts.push({
      type: "exclusivite",
      severity: "warning",
      message: "Taux d'exclusivité à améliorer",
    });
  }

  if (totalMandats < agentCount * 2) {
    alerts.push({
      type: "activite",
      severity: "warning",
      message: "Activité commerciale insuffisante",
    });
  }

  if (totalOffres < agentCount) {
    alerts.push({
      type: "transformation",
      severity: "warning",
      message: "Manque d'offres",
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNetworkData() {
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const institutions = useAppStore((s) => s.institutions);
  const networks = useAppStore((s) => s.networks);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  // Find the network the current user belongs to
  const network = useMemo(() => {
    if (networks.length === 0) return null;
    // Try to match by user's institutionId being in a network's institutionIds
    if (user?.institutionId) {
      const found = networks.find((n) =>
        n.institutionIds.includes(user.institutionId!)
      );
      if (found) return found;
    }
    // Fallback: use the first network (demo mode)
    return networks[0];
  }, [networks, user?.institutionId]);

  // Filter institutions to only those in the network
  const networkInstitutionIds = useMemo(
    () => new Set(network?.institutionIds ?? []),
    [network]
  );

  // Build agency aggregates
  const agencies = useMemo<AgencyAggregate[]>(() => {
    if (!network) return [];

    const result: AgencyAggregate[] = [];

    for (const instId of network.institutionIds) {
      const institutionName =
        institutions.find((i) => i.id === instId)?.name ?? instId;

      // All users in this institution
      const instUsers = users.filter((u) => u.institutionId === instId);
      const agents = instUsers.filter((u) => u.role === "conseiller");
      const managers = instUsers.filter(
        (u) => u.role === "manager" || u.role === "directeur"
      );
      const directeur = instUsers.find((u) => u.role === "directeur");
      const directeurName = directeur
        ? `${directeur.firstName} ${directeur.lastName}`
        : "Non assigné";

      let totalCA = 0;
      let totalActes = 0;
      let totalMandats = 0;
      let totalExclusifs = 0;
      let totalCompromis = 0;
      let totalOffres = 0;
      let totalVisites = 0;
      let totalEstimations = 0;
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
        totalCompromis += res.acheteurs.compromisSignes;
        totalOffres += res.acheteurs.offresRecues;
        totalVisites += res.acheteurs.nombreVisites;
        totalEstimations += res.vendeurs.estimationsRealisees;
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

      const alerts = generateAlerts(
        avgPerformance,
        avgExclusivite,
        totalMandats,
        totalOffres,
        agents.length
      );

      result.push({
        institutionId: instId,
        institutionName,
        directeurName,
        agents,
        managers,
        totalCA,
        totalActes,
        totalMandats,
        totalExclusifs,
        totalCompromis,
        totalOffres,
        totalVisites,
        totalEstimations,
        avgExclusivite,
        avgPerformance,
        agentCount: agents.length,
        managerCount: managers.length,
        alerts,
      });
    }

    return result;
  }, [network, institutions, users, allResults, ratioConfigs]);

  // Aggregate network-level stats
  const networkStats = useMemo<NetworkStats>(() => {
    let totalCA = 0;
    let totalActes = 0;
    let totalMandats = 0;
    let totalCompromis = 0;
    let totalOffres = 0;
    let totalEstimations = 0;
    let totalVisites = 0;
    let totalAgents = 0;
    let totalManagers = 0;
    let totalExclusifs = 0;
    let totalPerformanceSum = 0;

    for (const agency of agencies) {
      totalCA += agency.totalCA;
      totalActes += agency.totalActes;
      totalMandats += agency.totalMandats;
      totalCompromis += agency.totalCompromis;
      totalOffres += agency.totalOffres;
      totalEstimations += agency.totalEstimations;
      totalVisites += agency.totalVisites;
      totalAgents += agency.agentCount;
      totalManagers += agency.managerCount;
      totalExclusifs += agency.totalExclusifs;
      totalPerformanceSum += agency.avgPerformance * agency.agentCount;
    }

    const avgExclusivite =
      totalMandats > 0
        ? Math.round((totalExclusifs / totalMandats) * 100)
        : 0;
    const avgPerformance =
      totalAgents > 0 ? Math.round(totalPerformanceSum / totalAgents) : 0;

    return {
      totalCA,
      totalActes,
      totalMandats,
      totalCompromis,
      totalOffres,
      totalEstimations,
      totalVisites,
      avgExclusivite,
      avgPerformance,
      totalAgents,
      totalManagers,
      agencyCount: agencies.length,
    };
  }, [agencies]);

  // Top performing agents (top 5)
  const topAgents = useMemo<TopPerformer[]>(() => {
    const performers: TopPerformer[] = [];

    for (const agency of agencies) {
      for (const agent of agency.agents) {
        const score = computeAgentPerformance(agent, allResults, ratioConfigs);
        const ca = getUserCA(agent.id, allResults);
        performers.push({
          user: agent,
          institutionId: agency.institutionId,
          institutionName: agency.institutionName,
          score,
          ca,
          role: "agent",
        });
      }
    }

    return performers.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [agencies, allResults, ratioConfigs]);

  // Top performing managers (top 3)
  const topManagers = useMemo<TopPerformer[]>(() => {
    const performers: TopPerformer[] = [];

    for (const agency of agencies) {
      for (const mgr of agency.managers) {
        const score = computeAgentPerformance(mgr, allResults, ratioConfigs);
        const ca = getUserCA(mgr.id, allResults);
        performers.push({
          user: mgr,
          institutionId: agency.institutionId,
          institutionName: agency.institutionName,
          score,
          ca,
          role: mgr.role === "directeur" ? "directeur" : "manager",
        });
      }
    }

    return performers.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [agencies, allResults, ratioConfigs]);

  return {
    agencies,
    networkStats,
    topAgents,
    topManagers,
    allResults,
    ratioConfigs,
    network,
  };
}
