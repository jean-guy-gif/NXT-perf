"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import { extractVolumes } from "@/lib/coach";
import type { ClientVolumes } from "@/lib/coach";
import type { CoachTargetType, CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

// ── Helpers ──────────────────────────────────────────────────────────────

function avgScore(ratios: ComputedRatio[]): number {
  if (ratios.length === 0) return 0;
  return Math.round(
    ratios.reduce((sum, r) => sum + (r.percentageOfTarget ?? 0), 0) / ratios.length
  );
}

function alertCount(ratios: ComputedRatio[]): number {
  return ratios.filter((r) => r.status === "danger" || r.status === "warning").length;
}

// ── Return type ──────────────────────────────────────────────────────────

export interface CoachTargetData {
  // Common
  assignment: CoachAssignment | null;
  activePlan: CoachPlan | null;
  plans: CoachPlan[];
  actions: CoachAction[];
  weakKpis: ComputedRatio[];

  // INSTITUTION scope
  institutionName: string | null;
  agencyKpis: { totalCA: number; totalActes: number; avgScore: number; alertCount: number } | null;
  managersAggregate: Array<{
    user: User;
    teamSize: number;
    avgScore: number;
    alertCount: number;
    ratios: ComputedRatio[];
    volumes: ClientVolumes | null;
  }> | null;
  advisorsAggregate: Array<{
    user: User;
    avgScore: number;
    alertCount: number;
    ratios: ComputedRatio[];
    volumes: ClientVolumes | null;
  }> | null;

  // MANAGER scope
  managerUser: User | null;
  managerRatios: ComputedRatio[] | null;
  teamAdvisors: Array<{
    user: User;
    avgScore: number;
    alertCount: number;
    ratios: ComputedRatio[];
    volumes: ClientVolumes | null;
  }> | null;

  // AGENT scope
  advisorUser: User | null;
  advisorRatios: ComputedRatio[] | null;
}

// ── Null defaults ────────────────────────────────────────────────────────

const NULL_RESULT: CoachTargetData = {
  assignment: null,
  activePlan: null,
  plans: [],
  actions: [],
  weakKpis: [],
  institutionName: null,
  agencyKpis: null,
  managersAggregate: null,
  advisorsAggregate: null,
  managerUser: null,
  managerRatios: null,
  teamAdvisors: null,
  advisorUser: null,
  advisorRatios: null,
};

// ── Hook ─────────────────────────────────────────────────────────────────

export function useCoachTargetData(
  targetType: CoachTargetType,
  targetId: string
): CoachTargetData {
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const institutions = useAppStore((s) => s.institutions);
  const coachAssignments = useAppStore((s) => s.coachAssignments);
  const coachActions = useAppStore((s) => s.coachActions);
  const coachPlans = useAppStore((s) => s.coachPlans);

  return useMemo(() => {
    const coachId = user?.id ?? "coach-1";

    // 1. Find the matching ACTIVE assignment
    const assignment = coachAssignments.find(
      (a) =>
        a.coachId === coachId &&
        a.targetType === targetType &&
        a.targetId === targetId &&
        a.status === "ACTIVE"
    ) ?? null;

    if (!assignment) return NULL_RESULT;

    // 2. Actions & plans for this assignment
    const actions = coachActions.filter(
      (a) => a.coachAssignmentId === assignment.id
    );
    const plans = coachPlans.filter(
      (p) => p.coachAssignmentId === assignment.id
    );
    const activePlan =
      plans.find(
        (p) =>
          p.status === "DRAFT" || p.status === "VALIDATED" || p.status === "ACTIVE"
      ) ?? null;

    // 3. Helpers
    const latestResultFor = (userId: string): PeriodResults | undefined => {
      return [...results]
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
    };

    const ratiosFor = (u: User): ComputedRatio[] => {
      const userResults = latestResultFor(u.id);
      return userResults ? computeAllRatios(userResults, u.category, ratioConfigs) : [];
    };

    const volumesFor = (userId: string): ClientVolumes | null => {
      return extractVolumes(latestResultFor(userId));
    };

    // 4. Branch by target type
    if (targetType === "INSTITUTION") {
      const excludedIds = new Set(assignment.excludedManagerIds ?? []);

      // All users in the institution, excluding managers who are excluded
      const orgUsers = users.filter((u) => {
        if (u.institutionId !== targetId) return false;
        // Exclude managers/directeurs in the exclusion list
        if (
          (u.role === "manager" || u.role === "directeur") &&
          excludedIds.has(u.id)
        )
          return false;
        // Exclude agents whose manager is excluded
        if (u.role === "conseiller" && u.managerId && excludedIds.has(u.managerId))
          return false;
        return true;
      });

      // Compute ratios for every user
      const userRatiosMap = new Map<string, ComputedRatio[]>();
      for (const u of orgUsers) {
        userRatiosMap.set(u.id, ratiosFor(u));
      }

      // Aggregate KPIs
      let totalCA = 0;
      let totalActes = 0;
      const allScores: number[] = [];
      let totalAlerts = 0;

      for (const u of orgUsers) {
        const userResults = results.find((r) => r.userId === u.id);
        if (userResults) {
          totalCA += userResults.ventes.chiffreAffaires;
          totalActes += userResults.ventes.actesSignes;
        }
        const ratios = userRatiosMap.get(u.id) ?? [];
        if (ratios.length > 0) {
          allScores.push(avgScore(ratios));
        }
        totalAlerts += alertCount(ratios);
      }

      const agencyKpis = {
        totalCA,
        totalActes,
        avgScore:
          allScores.length > 0
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 0,
        alertCount: totalAlerts,
      };

      // Managers aggregate
      const managerUsers = orgUsers.filter(
        (u) => u.role === "manager" || u.role === "directeur"
      );
      const managersAggregate = managerUsers.map((mgr) => {
        const teamAgents = orgUsers.filter(
          (u) => u.role === "conseiller" && u.managerId === mgr.id
        );
        const mgrRatios = userRatiosMap.get(mgr.id) ?? [];
        // avgScore across manager + their agents
        const teamRatios = teamAgents.map((a) => userRatiosMap.get(a.id) ?? []);
        const allTeamScores = [mgrRatios, ...teamRatios]
          .filter((r) => r.length > 0)
          .map((r) => avgScore(r));
        const mgrAvgScore =
          allTeamScores.length > 0
            ? Math.round(allTeamScores.reduce((a, b) => a + b, 0) / allTeamScores.length)
            : 0;
        const mgrAlertCount = [mgrRatios, ...teamRatios].reduce(
          (sum, r) => sum + alertCount(r),
          0
        );

        return {
          user: mgr,
          teamSize: teamAgents.length,
          avgScore: mgrAvgScore,
          alertCount: mgrAlertCount,
          ratios: mgrRatios,
          volumes: volumesFor(mgr.id),
        };
      });

      // Advisors aggregate
      const advisorUsers = orgUsers.filter((u) => u.role === "conseiller");
      const advisorsAggregate = advisorUsers.map((adv) => {
        const ratios = userRatiosMap.get(adv.id) ?? [];
        return {
          user: adv,
          avgScore: avgScore(ratios),
          alertCount: alertCount(ratios),
          ratios,
          volumes: volumesFor(adv.id),
        };
      });

      // weakKpis: collect all danger/warning ratios, deduplicate by ratioId, top 3
      const alertRatiosAll: ComputedRatio[] = [];
      for (const ratios of Array.from(userRatiosMap.values())) {
        for (const r of ratios) {
          if (r.status === "danger" || r.status === "warning") {
            alertRatiosAll.push(r);
          }
        }
      }
      const seen = new Set<string>();
      const weakKpis: ComputedRatio[] = [];
      // Sort so danger comes first, then lowest percentageOfTarget
      alertRatiosAll.sort((a, b) => {
        if (a.status === "danger" && b.status !== "danger") return -1;
        if (b.status === "danger" && a.status !== "danger") return 1;
        return (a.percentageOfTarget ?? 0) - (b.percentageOfTarget ?? 0);
      });
      for (const r of alertRatiosAll) {
        if (!seen.has(r.ratioId)) {
          seen.add(r.ratioId);
          weakKpis.push(r);
        }
        if (weakKpis.length >= 3) break;
      }

      const institutionName = institutions.find((i) => i.id === targetId)?.name ?? "NXT Immobilier";

      return {
        ...NULL_RESULT,
        assignment,
        activePlan,
        plans,
        actions,
        weakKpis,
        institutionName,
        agencyKpis,
        managersAggregate,
        advisorsAggregate,
      };
    }

    if (targetType === "MANAGER") {
      const managerUser = users.find((u) => u.id === targetId) ?? null;
      const managerRatios = managerUser ? ratiosFor(managerUser) : null;

      // Team agents under this manager
      const teamAgents = users.filter(
        (u) => u.managerId === targetId && u.role === "conseiller"
      );
      const teamAdvisors = teamAgents.map((adv) => {
        const ratios = ratiosFor(adv);
        return {
          user: adv,
          avgScore: avgScore(ratios),
          alertCount: alertCount(ratios),
          ratios,
          volumes: volumesFor(adv.id),
        };
      });

      // weakKpis from manager's own ratios
      const weakKpis = (managerRatios ?? [])
        .filter((r) => r.status === "danger" || r.status === "warning")
        .sort((a, b) => (a.percentageOfTarget ?? 0) - (b.percentageOfTarget ?? 0))
        .slice(0, 3);

      return {
        ...NULL_RESULT,
        assignment,
        activePlan,
        plans,
        actions,
        weakKpis,
        managerUser,
        managerRatios,
        teamAdvisors,
      };
    }

    if (targetType === "AGENT") {
      const advisorUser = users.find((u) => u.id === targetId) ?? null;
      const advisorRatios = advisorUser ? ratiosFor(advisorUser) : null;

      // weakKpis from advisor's own ratios
      const weakKpis = (advisorRatios ?? [])
        .filter((r) => r.status === "danger" || r.status === "warning")
        .sort((a, b) => (a.percentageOfTarget ?? 0) - (b.percentageOfTarget ?? 0))
        .slice(0, 3);

      return {
        ...NULL_RESULT,
        assignment,
        activePlan,
        plans,
        actions,
        weakKpis,
        advisorUser,
        advisorRatios,
      };
    }

    // Fallback (should never reach here given CoachTargetType is exhaustive)
    return NULL_RESULT;
  }, [user, users, results, ratioConfigs, institutions, coachAssignments, coachActions, coachPlans, targetType, targetId]);
}
