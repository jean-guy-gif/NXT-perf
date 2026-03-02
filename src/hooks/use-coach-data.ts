"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCoachScopeUserIds } from "@/lib/coach";
import { computeAllRatios } from "@/lib/ratios";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

export interface CoachUserSummary {
  user: User;
  results: PeriodResults | undefined;
  ratios: ComputedRatio[];
  alertRatios: ComputedRatio[];
  avgScore: number;
  lastAction: CoachAction | undefined;
  activePlan: CoachPlan | undefined;
  assignment: CoachAssignment;
}

export function useCoachData(coachId: string) {
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const coachAssignments = useAppStore((s) => s.coachAssignments);
  const coachActions = useAppStore((s) => s.coachActions);
  const coachPlans = useAppStore((s) => s.coachPlans);

  return useMemo(() => {
    const myAssignments = coachAssignments.filter(
      (a) => a.coachId === coachId && a.status === "ACTIVE"
    );

    const scopeIds = getCoachScopeUserIds(myAssignments, users);
    const scopedUsers = users.filter((u) => scopeIds.has(u.id));

    const summaries: CoachUserSummary[] = scopedUsers.map((user) => {
      const userResults = results.find((r) => r.userId === user.id);
      const ratios = userResults
        ? computeAllRatios(userResults, user.category, ratioConfigs)
        : [];
      const alertRatios = ratios.filter(
        (r) => r.status === "danger" || r.status === "warning"
      );
      const avgScore =
        ratios.length > 0
          ? Math.round(
              ratios.reduce((sum, r) => sum + (r.percentageOfTarget ?? 0), 0) /
                ratios.length
            )
          : 0;

      // Find assignment for this user
      const assignment = myAssignments.find((a) => {
        if (a.targetType === "AGENT") return a.targetId === user.id;
        if (a.targetType === "MANAGER") return a.targetId === user.id || user.managerId === a.targetId;
        if (a.targetType === "INSTITUTION") return user.institutionId === a.targetId;
        return false;
      })!;

      const userActions = coachActions
        .filter((act) => act.coachAssignmentId === assignment?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const activePlan = coachPlans.find(
        (p) => p.coachAssignmentId === assignment?.id && p.status === "ACTIVE"
      );

      return {
        user,
        results: userResults,
        ratios,
        alertRatios,
        avgScore,
        lastAction: userActions[0],
        activePlan,
        assignment,
      };
    });

    // Group by role
    const institutions = myAssignments.filter((a) => a.targetType === "INSTITUTION");
    const managers = summaries.filter(
      (s) => s.user.role === "manager" || s.user.role === "directeur"
    );
    const conseillers = summaries.filter((s) => s.user.role === "conseiller");

    return {
      assignments: myAssignments,
      scopedUsers,
      summaries,
      institutions,
      managers,
      conseillers,
    };
  }, [coachId, users, results, ratioConfigs, coachAssignments, coachActions, coachPlans]);
}
