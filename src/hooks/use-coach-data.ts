"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCoachScopeUserIds, generateDiagnostic, computeProgression, detectAlerts, extractVolumes } from "@/lib/coach";
import type { ClientDiagnostic, ClientProgression, CoachAlert, ClientVolumes } from "@/lib/coach";
import { computeAllRatios } from "@/lib/ratios";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import type { User } from "@/types/user";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

export interface CoachUserSummary {
  user: User;
  results: PeriodResults | undefined;
  previousResults: PeriodResults | undefined;
  ratios: ComputedRatio[];
  alertRatios: ComputedRatio[];
  avgScore: number;
  previousScore: number;
  lastAction: CoachAction | undefined;
  activePlan: CoachPlan | undefined;
  assignment: CoachAssignment;
  diagnostic: ClientDiagnostic;
  progression: ClientProgression;
  alerts: CoachAlert[];
  volumes: ClientVolumes | null;
}

/** Portfolio-level summary for a single assignment (AGENT / MANAGER / INSTITUTION) */
export interface CoachPortfolioClient {
  assignment: CoachAssignment;
  targetType: CoachAssignment["targetType"];
  targetId: string;
  /** Display name */
  name: string;
  /** Sub-label (e.g. agency name, team name) */
  subtitle: string;
  /** Aggregated score 0-150 */
  score: number;
  previousScore: number;
  diagnostic: ClientDiagnostic;
  progression: ClientProgression;
  alerts: CoachAlert[];
  volumes: ClientVolumes | null;
  /** Top 3 ratios in danger/warning */
  alertRatios: ComputedRatio[];
  /** Number of members (for institution / manager) */
  memberCount: number;
  activePlan: CoachPlan | undefined;
}

function computeAvgScore(ratios: ComputedRatio[]): number {
  if (ratios.length === 0) return 0;
  return Math.round(
    ratios.reduce((sum, r) => sum + (r.percentageOfTarget ?? 0), 0) / ratios.length
  );
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

    // Group results by period for progression
    const resultsByUser = new Map<string, PeriodResults[]>();
    for (const r of results) {
      const arr = resultsByUser.get(r.userId) ?? [];
      arr.push(r);
      resultsByUser.set(r.userId, arr);
    }

    const summaries: CoachUserSummary[] = scopedUsers.map((user) => {
      const userResults = resultsByUser.get(user.id) ?? [];
      // Sort by periodStart desc
      const sorted = [...userResults].sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      const currentResults = sorted[0];
      const previousResults = sorted[1];

      const ratios = currentResults
        ? computeAllRatios(currentResults, user.category, ratioConfigs)
        : [];
      const prevRatios = previousResults
        ? computeAllRatios(previousResults, user.category, ratioConfigs)
        : [];

      const alertRatios = ratios.filter(
        (r) => r.status === "danger" || r.status === "warning"
      );
      const avgScore = computeAvgScore(ratios);
      const previousScore = computeAvgScore(prevRatios);

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
        (p) => p.coachAssignmentId === assignment?.id &&
          (p.status === "DRAFT" || p.status === "VALIDATED" || p.status === "ACTIVE")
      );

      const diagnostic = generateDiagnostic(ratios, currentResults);
      const progression = computeProgression(currentResults, previousResults, avgScore, previousScore);
      const alerts = detectAlerts(ratios, currentResults, progression);
      const volumes = extractVolumes(currentResults);

      return {
        user,
        results: currentResults,
        previousResults,
        ratios,
        alertRatios,
        avgScore,
        previousScore,
        lastAction: userActions[0],
        activePlan,
        assignment,
        diagnostic,
        progression,
        alerts,
        volumes,
      };
    });

    // Build portfolio clients (one per assignment)
    const portfolioClients = myAssignments.map((assignment): CoachPortfolioClient | null => {
      if (assignment.targetType === "AGENT") {
        const summary = summaries.find((s) => s.user.id === assignment.targetId);
        if (!summary) return null;
        const mgr = users.find((u) => u.id === summary.user.managerId);
        return {
          assignment,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          name: `${summary.user.firstName} ${summary.user.lastName}`,
          subtitle: mgr ? `Équipe ${mgr.firstName} ${mgr.lastName}` : "Indépendant",
          score: summary.avgScore,
          previousScore: summary.previousScore,
          diagnostic: summary.diagnostic,
          progression: summary.progression,
          alerts: summary.alerts,
          volumes: summary.volumes,
          alertRatios: summary.alertRatios.slice(0, 3),
          memberCount: 0,
          activePlan: summary.activePlan,
        };
      }

      if (assignment.targetType === "MANAGER") {
        const mgr = users.find((u) => u.id === assignment.targetId);
        if (!mgr) return null;
        const teamMembers = summaries.filter(
          (s) => s.user.managerId === assignment.targetId || s.user.id === assignment.targetId
        );
        const teamAgents = teamMembers.filter((s) => s.user.role === "conseiller");
        const allRatios = teamMembers.flatMap((s) => s.ratios);
        const score = computeAvgScore(allRatios);

        // Aggregate volumes
        const aggVolumes: ClientVolumes = {
          contacts: 0, estimations: 0, mandats: 0, visites: 0,
          offres: 0, compromis: 0, actes: 0, ca: 0,
        };
        for (const s of teamMembers) {
          if (s.volumes) {
            aggVolumes.contacts += s.volumes.contacts;
            aggVolumes.estimations += s.volumes.estimations;
            aggVolumes.mandats += s.volumes.mandats;
            aggVolumes.visites += s.volumes.visites;
            aggVolumes.offres += s.volumes.offres;
            aggVolumes.compromis += s.volumes.compromis;
            aggVolumes.actes += s.volumes.actes;
            aggVolumes.ca += s.volumes.ca;
          }
        }

        // Manager-level diagnostic from their own summary
        const mgrSummary = summaries.find((s) => s.user.id === assignment.targetId);
        const allAlertRatios = teamMembers.flatMap((s) => s.alertRatios);
        // Deduplicate by ratioId
        const seenRatios = new Set<string>();
        const uniqueAlertRatios: ComputedRatio[] = [];
        for (const r of allAlertRatios.sort((a, b) => (a.percentageOfTarget ?? 0) - (b.percentageOfTarget ?? 0))) {
          if (!seenRatios.has(r.ratioId)) {
            seenRatios.add(r.ratioId);
            uniqueAlertRatios.push(r);
          }
        }

        const prevAllRatios = teamMembers.flatMap((s) =>
          s.previousResults ? computeAllRatios(s.previousResults, s.user.category, ratioConfigs) : []
        );
        const prevScore = computeAvgScore(prevAllRatios);

        return {
          assignment,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          name: `${mgr.firstName} ${mgr.lastName}`,
          subtitle: `${teamAgents.length} conseiller${teamAgents.length > 1 ? "s" : ""}`,
          score,
          previousScore: prevScore,
          diagnostic: mgrSummary?.diagnostic ?? { label: "Données insuffisantes", severity: "warning" as const },
          progression: computeProgression(
            mgrSummary?.results, mgrSummary?.previousResults, score, prevScore
          ),
          alerts: mgrSummary?.alerts ?? [],
          volumes: aggVolumes,
          alertRatios: uniqueAlertRatios.slice(0, 3),
          memberCount: teamAgents.length,
          activePlan: mgrSummary?.activePlan,
        };
      }

      if (assignment.targetType === "INSTITUTION") {
        const excluded = new Set(assignment.excludedManagerIds ?? []);
        const orgMembers = summaries.filter((s) => {
          if (s.user.institutionId !== assignment.targetId) return false;
          if ((s.user.role === "manager" || s.user.role === "directeur") && excluded.has(s.user.id)) return false;
          if (s.user.role === "conseiller" && s.user.managerId && excluded.has(s.user.managerId)) return false;
          return true;
        });
        const allRatios = orgMembers.flatMap((s) => s.ratios);
        const score = computeAvgScore(allRatios);

        const aggVolumes: ClientVolumes = {
          contacts: 0, estimations: 0, mandats: 0, visites: 0,
          offres: 0, compromis: 0, actes: 0, ca: 0,
        };
        for (const s of orgMembers) {
          if (s.volumes) {
            aggVolumes.contacts += s.volumes.contacts;
            aggVolumes.estimations += s.volumes.estimations;
            aggVolumes.mandats += s.volumes.mandats;
            aggVolumes.visites += s.volumes.visites;
            aggVolumes.offres += s.volumes.offres;
            aggVolumes.compromis += s.volumes.compromis;
            aggVolumes.actes += s.volumes.actes;
            aggVolumes.ca += s.volumes.ca;
          }
        }

        const allAlertRatios = orgMembers.flatMap((s) => s.alertRatios);
        const seenRatios = new Set<string>();
        const uniqueAlertRatios: ComputedRatio[] = [];
        for (const r of allAlertRatios.sort((a, b) => (a.percentageOfTarget ?? 0) - (b.percentageOfTarget ?? 0))) {
          if (!seenRatios.has(r.ratioId)) {
            seenRatios.add(r.ratioId);
            uniqueAlertRatios.push(r);
          }
        }

        const prevAllRatios = orgMembers.flatMap((s) =>
          s.previousResults ? computeAllRatios(s.previousResults, s.user.category, ratioConfigs) : []
        );
        const prevScore = computeAvgScore(prevAllRatios);

        // Aggregate alerts
        const allAlerts = orgMembers.flatMap((s) => s.alerts);
        const highAlerts = allAlerts.filter((a) => a.severity === "high");

        return {
          assignment,
          targetType: assignment.targetType,
          targetId: assignment.targetId,
          name: "Organisation",
          subtitle: `${orgMembers.length} membre${orgMembers.length > 1 ? "s" : ""}`,
          score,
          previousScore: prevScore,
          diagnostic: highAlerts.length > 0
            ? { label: `${highAlerts.length} alerte${highAlerts.length > 1 ? "s" : ""} critique${highAlerts.length > 1 ? "s" : ""}`, severity: "critical" as const }
            : score >= 70
              ? { label: "Performance satisfaisante", severity: "positive" as const }
              : { label: "Performance à améliorer", severity: "warning" as const },
          progression: computeProgression(undefined, undefined, score, prevScore),
          alerts: highAlerts.slice(0, 3),
          volumes: aggVolumes,
          alertRatios: uniqueAlertRatios.slice(0, 3),
          memberCount: orgMembers.length,
          activePlan: coachPlans.find(
            (p) => p.coachAssignmentId === assignment.id &&
              (p.status === "DRAFT" || p.status === "VALIDATED" || p.status === "ACTIVE")
          ),
        };
      }

      return null;
    }).filter((c): c is CoachPortfolioClient => c !== null);

    // Group by role for legacy compatibility
    const institutions = myAssignments.filter((a) => a.targetType === "INSTITUTION");
    const managers = summaries.filter(
      (s) => s.user.role === "manager" || s.user.role === "directeur"
    );
    const conseillers = summaries.filter((s) => s.user.role === "conseiller");

    // Priority clients: sorted by most alerts then lowest score
    const priorityClients = [...portfolioClients]
      .sort((a, b) => {
        const aAlerts = a.alerts.length;
        const bAlerts = b.alerts.length;
        if (aAlerts !== bAlerts) return bAlerts - aAlerts;
        return a.score - b.score;
      })
      .filter((c) => c.alerts.length > 0 || c.score < 60);

    // Top performers
    const topPerformers = [...portfolioClients]
      .sort((a, b) => b.score - a.score)
      .filter((c) => c.score >= 70)
      .slice(0, 3);

    return {
      assignments: myAssignments,
      scopedUsers,
      summaries,
      institutions,
      managers,
      conseillers,
      portfolioClients,
      priorityClients,
      topPerformers,
    };
  }, [coachId, users, results, ratioConfigs, coachAssignments, coachActions, coachPlans]);
}
