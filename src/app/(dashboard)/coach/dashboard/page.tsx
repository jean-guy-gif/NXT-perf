"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useCoachData } from "@/hooks/use-coach-data";
import type { CoachUserSummary } from "@/hooks/use-coach-data";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CoachPlanStatus } from "@/types/coach";
import {
  Building2,
  Users,
  UserCheck,
  AlertTriangle,
  FileText,
} from "lucide-react";

/* ────── Plan status badge config ────── */
const PLAN_STATUS_CONFIG: Record<
  CoachPlanStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Brouillon",
    className: "bg-yellow-500/10 text-yellow-500",
  },
  VALIDATED: {
    label: "Validé",
    className: "bg-green-500/10 text-green-500",
  },
  ACTIVE: {
    label: "Actif",
    className: "bg-blue-500/10 text-blue-500",
  },
  COMPLETED: {
    label: "Terminé",
    className: "bg-muted text-muted-foreground",
  },
  CANCELLED: {
    label: "Annulé",
    className: "bg-muted text-muted-foreground",
  },
};

/* ────── Score color helper ────── */
function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

/* ────── Plan Status Badge ────── */
function PlanBadge({ assignmentId }: { assignmentId: string }) {
  const coachPlans = useAppStore((s) => s.coachPlans);

  const plan = coachPlans.find(
    (p) => p.coachAssignmentId === assignmentId
  );

  if (!plan) {
    return (
      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
        Aucun plan
      </span>
    );
  }

  const config = PLAN_STATUS_CONFIG[plan.status];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

/* ────── Institution Card ────── */
function InstitutionAssignmentCard({
  assignmentId,
  targetId,
  excludedManagerIds,
  summaries,
  onClick,
}: {
  assignmentId: string;
  targetId: string;
  excludedManagerIds: string[] | null;
  summaries: CoachUserSummary[];
  onClick: () => void;
}) {
  const users = useAppStore((s) => s.users);

  // All org users (from full user list for accurate counts)
  const excluded = new Set(excludedManagerIds ?? []);
  const orgUsers = users.filter((u) => u.institutionId === targetId);
  const scopedMembers = orgUsers.filter((u) => {
    if (u.role === "manager" || u.role === "directeur") {
      return !excluded.has(u.id);
    }
    if (u.role === "conseiller") {
      return !u.managerId || !excluded.has(u.managerId);
    }
    return false;
  });

  const managersCount = scopedMembers.filter(
    (u) => u.role === "manager" || u.role === "directeur"
  ).length;

  // Alert count from summaries belonging to this institution
  const orgSummaries = summaries.filter(
    (s) => s.user.institutionId === targetId
  );
  const totalAlerts = orgSummaries.reduce(
    (sum, s) => sum + s.alertRatios.length,
    0
  );

  return (
    <div
      onClick={onClick}
      className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium text-sm">Organisation</p>
        </div>
        <PlanBadge assignmentId={assignmentId} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums">
            {scopedMembers.length}
          </p>
          <p className="text-xs text-muted-foreground">Membres</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums">{managersCount}</p>
          <p className="text-xs text-muted-foreground">Managers</p>
        </div>
        <div className="text-center">
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              totalAlerts > 0 ? "text-red-500" : "text-green-500"
            )}
          >
            {totalAlerts}
          </p>
          <p className="text-xs text-muted-foreground">Alertes</p>
        </div>
      </div>
    </div>
  );
}

/* ────── User Assignment Card (Manager / Agent) ────── */
function UserAssignmentCard({
  summary,
  assignmentId,
  onClick,
}: {
  summary: CoachUserSummary;
  assignmentId: string;
  onClick: () => void;
}) {
  const { user, avgScore, alertRatios } = summary;

  return (
    <div
      onClick={onClick}
      className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header: Name + Category */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-sm">
          {user.firstName} {user.lastName}
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            CATEGORY_COLORS[user.category] ?? ""
          )}
        >
          {CATEGORY_LABELS[user.category] ?? user.category}
        </span>
      </div>

      {/* Score + Alert count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Score</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              scoreColor(avgScore)
            )}
          >
            {avgScore}%
          </span>
        </div>
        {alertRatios.length > 0 && (
          <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {alertRatios.length} alerte{alertRatios.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Plan status */}
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <PlanBadge assignmentId={assignmentId} />
      </div>
    </div>
  );
}

/* ────── Section Header ────── */
function SectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Users;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{label}</h2>
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

/* ────── Main Page ────── */
export default function CoachDashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const coachId = user?.id ?? "coach-1";
  const { institutions, managers, conseillers, summaries, assignments } =
    useCoachData(coachId);

  // Build a map: for MANAGER/AGENT assignments, find the matching summary
  const managerAssignmentMap = useMemo(() => {
    const map = new Map<string, { summary: CoachUserSummary; assignmentId: string }>();
    const managerAssignments = assignments.filter(
      (a) => a.targetType === "MANAGER"
    );
    for (const a of managerAssignments) {
      const summary = managers.find((s) => s.user.id === a.targetId);
      if (summary) {
        map.set(a.targetId, { summary, assignmentId: a.id });
      }
    }
    return map;
  }, [assignments, managers]);

  const agentAssignmentMap = useMemo(() => {
    const map = new Map<string, { summary: CoachUserSummary; assignmentId: string }>();
    const agentAssignments = assignments.filter(
      (a) => a.targetType === "AGENT"
    );
    for (const a of agentAssignments) {
      const summary = conseillers.find((s) => s.user.id === a.targetId);
      if (summary) {
        map.set(a.targetId, { summary, assignmentId: a.id });
      }
    }
    return map;
  }, [assignments, conseillers]);

  const hasInstitutions = institutions.length > 0;
  const hasManagers = managerAssignmentMap.size > 0;
  const hasAgents = agentAssignmentMap.size > 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tableau de bord Coach
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d&apos;ensemble de vos accompagnements
        </p>
      </div>

      {/* ═══ Institutions ═══ */}
      {hasInstitutions && (
        <section>
          <SectionHeader
            icon={Building2}
            label="Institutions"
            count={institutions.length}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((inst) => (
              <InstitutionAssignmentCard
                key={inst.id}
                assignmentId={inst.id}
                targetId={inst.targetId}
                excludedManagerIds={inst.excludedManagerIds}
                summaries={summaries}
                onClick={() =>
                  router.push(
                    `/coach/targets/INSTITUTION/${inst.targetId}`
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Managers ═══ */}
      {hasManagers && (
        <section>
          <SectionHeader
            icon={UserCheck}
            label="Managers"
            count={managerAssignmentMap.size}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...managerAssignmentMap.entries()].map(
              ([targetId, { summary, assignmentId }]) => (
                <UserAssignmentCard
                  key={targetId}
                  summary={summary}
                  assignmentId={assignmentId}
                  onClick={() =>
                    router.push(`/coach/targets/MANAGER/${targetId}`)
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ═══ Conseillers ═══ */}
      {hasAgents && (
        <section>
          <SectionHeader
            icon={Users}
            label="Conseillers"
            count={agentAssignmentMap.size}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...agentAssignmentMap.entries()].map(
              ([targetId, { summary, assignmentId }]) => (
                <UserAssignmentCard
                  key={targetId}
                  summary={summary}
                  assignmentId={assignmentId}
                  onClick={() =>
                    router.push(`/coach/targets/AGENT/${targetId}`)
                  }
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ═══ Empty state ═══ */}
      {!hasInstitutions && !hasManagers && !hasAgents && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-sm font-medium">
            Aucun accompagnement actif
          </p>
          <p className="text-xs mt-1">
            Vos missions apparaîtront ici une fois attribuées.
          </p>
        </div>
      )}
    </div>
  );
}
