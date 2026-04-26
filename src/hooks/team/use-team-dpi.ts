"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { computeDPIAxes, computeGlobalDPIScore, type DPIAxis } from "@/lib/dpi-axes";
import type { User } from "@/types/user";

export interface MemberDPI {
  member: User;
  axes: DPIAxis[];
  globalScore: number;
  status: "ok" | "warning" | "danger";
}

interface UseTeamDPIReturn {
  loading: boolean;
  perConseillerDPI: Map<string, MemberDPI>;
  averageRadar: DPIAxis[];
  averageGlobalScore: number;
}

/**
 * Aggregate team DPI — extracted from src/components/dpi/dpi-team-view.tsx (computeMemberDPIs).
 * Returns per-conseiller DPI + averaged radar (per axis) + averaged global score.
 */
export function useTeamDPI(teamId?: string): UseTeamDPIReturn {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const effectiveTeamId = teamId ?? currentUser?.teamId ?? null;

  const teamMembers = useMemo<User[]>(() => {
    if (!currentUser) return [];
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === effectiveTeamId;
      return u.managerId === currentUser.id;
    });
  }, [users, currentUser, isDemo, effectiveTeamId]);

  const perConseillerDPI = useMemo(() => {
    const map = new Map<string, MemberDPI>();
    for (const member of teamMembers) {
      const results = allResults.find((r) => r.userId === member.id);
      const ratios = results
        ? computeAllRatios(results, member.category, ratioConfigs)
        : [];
      const axes = results
        ? computeDPIAxes(results, member.category, ratios)
        : [];
      const globalScore = computeGlobalDPIScore(axes);
      const status: "ok" | "warning" | "danger" =
        globalScore >= 80 ? "ok" : globalScore >= 60 ? "warning" : "danger";
      map.set(member.id, { member, axes, globalScore, status });
    }
    return map;
  }, [teamMembers, allResults, ratioConfigs]);

  const averageRadar = useMemo<DPIAxis[]>(() => {
    const allDPIs = Array.from(perConseillerDPI.values());
    if (allDPIs.length === 0) return [];

    const axisMap = new Map<string, { label: string; sum: number; count: number }>();
    for (const dpi of allDPIs) {
      for (const axis of dpi.axes) {
        if (!axisMap.has(axis.id)) {
          axisMap.set(axis.id, { label: axis.label, sum: 0, count: 0 });
        }
        const entry = axisMap.get(axis.id)!;
        entry.sum += axis.score;
        entry.count++;
      }
    }

    return Array.from(axisMap.entries()).map(([id, e]) => ({
      id,
      label: e.label,
      score: e.count > 0 ? Math.round(e.sum / e.count) : 0,
    }));
  }, [perConseillerDPI]);

  const averageGlobalScore = useMemo(() => {
    const allDPIs = Array.from(perConseillerDPI.values());
    if (allDPIs.length === 0) return 0;
    return Math.round(
      allDPIs.reduce((a, m) => a + m.globalScore, 0) / allDPIs.length,
    );
  }, [perConseillerDPI]);

  return {
    loading: false,
    perConseillerDPI,
    averageRadar,
    averageGlobalScore,
  };
}
