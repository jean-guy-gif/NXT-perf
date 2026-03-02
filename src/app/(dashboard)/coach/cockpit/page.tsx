"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useCoachData } from "@/hooks/use-coach-data";
import type { CoachUserSummary } from "@/hooks/use-coach-data";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Users, Building2, UserCheck, AlertTriangle, ShieldMinus } from "lucide-react";
import type { RatioId } from "@/types/ratios";

/* ────── Types ────── */
type Tab = "institutions" | "managers" | "conseillers";

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "institutions", label: "Institutions", icon: Building2 },
  { key: "managers", label: "Managers", icon: UserCheck },
  { key: "conseillers", label: "Conseillers", icon: Users },
];

/* ────── Score color helper ────── */
function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 50) return "bg-orange-500/10";
  return "bg-red-500/10";
}

/* ────── User Card ────── */
function UserCard({
  summary,
  ratioConfigs,
  onClick,
}: {
  summary: CoachUserSummary;
  ratioConfigs: Record<RatioId, { name: string }>;
  onClick: () => void;
}) {
  const { user, avgScore, alertRatios, lastAction } = summary;
  const displayAlerts = alertRatios.slice(0, 2);

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

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
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

      {/* Alert ratios */}
      {displayAlerts.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {displayAlerts.map((r) => (
            <span
              key={r.ratioId}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1",
                r.status === "danger"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-orange-500/10 text-orange-500"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {ratioConfigs[r.ratioId as RatioId]?.name ?? r.ratioId}
            </span>
          ))}
        </div>
      )}

      {/* Last action */}
      <p className="text-xs text-muted-foreground truncate">
        {lastAction ? lastAction.title : "Aucune action"}
      </p>
    </div>
  );
}

/* ────── Institution Card ────── */
function InstitutionCard({
  assignmentId,
  targetId,
  excludedManagerIds,
  summaries,
}: {
  assignmentId: string;
  targetId: string;
  excludedManagerIds: string[] | null;
  summaries: CoachUserSummary[];
}) {
  const [expanded, setExpanded] = useState(false);
  const users = useAppStore((s) => s.users);
  const updateExcludedManagers = useAppStore((s) => s.updateExcludedManagers);

  // Filter summaries belonging to this institution
  const members = summaries.filter(
    (s) => s.user.institutionId === targetId
  );
  const agents = members.filter((s) => s.user.role === "conseiller");
  const managers = members.filter(
    (s) => s.user.role === "manager" || s.user.role === "directeur"
  );
  const avgScore =
    members.length > 0
      ? Math.round(
          members.reduce((sum, s) => sum + s.avgScore, 0) / members.length
        )
      : 0;

  // All managers in this org (from full user list, not just summaries)
  const orgManagers = users.filter(
    (u) =>
      u.institutionId === targetId &&
      (u.role === "manager" || u.role === "directeur")
  );
  const excluded = new Set(excludedManagerIds ?? []);
  const excludedCount = excluded.size;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <p className="font-medium text-sm">Organisation</p>
        {excludedCount > 0 && (
          <span className="ml-auto rounded-full bg-orange-500/10 text-orange-500 px-2 py-0.5 text-xs font-medium inline-flex items-center gap-1">
            <ShieldMinus className="h-3 w-3" />
            {excludedCount} exclu{excludedCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums">{agents.length}</p>
          <p className="text-xs text-muted-foreground">Conseillers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold tabular-nums">{managers.length}</p>
          <p className="text-xs text-muted-foreground">Managers</p>
        </div>
        <div className="text-center">
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              scoreColor(avgScore)
            )}
          >
            {avgScore}%
          </p>
          <p className="text-xs text-muted-foreground">Score moy.</p>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && members.length > 0 && (
        <div className="border-t pt-3 mt-1 space-y-1">
          {members.map((m) => (
            <div
              key={m.user.id}
              className="flex items-center justify-between text-xs"
            >
              <span>
                {m.user.firstName} {m.user.lastName}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  scoreColor(m.avgScore)
                )}
              >
                {m.avgScore}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded: Périmètre — manager exclusions */}
      {expanded && orgManagers.length > 0 && (
        <div className="border-t pt-3 mt-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Périmètre — Managers inclus
          </p>
          <div className="space-y-1">
            {orgManagers.map((mgr) => (
              <label
                key={mgr.id}
                className="flex items-center gap-2 py-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="rounded border-border accent-primary h-4 w-4"
                  checked={!excluded.has(mgr.id)}
                  onChange={(e) => {
                    const newExcluded = e.target.checked
                      ? [...excluded].filter((id) => id !== mgr.id)
                      : [...excluded, mgr.id];
                    updateExcludedManagers(assignmentId, newExcluded);
                  }}
                />
                <span>
                  {mgr.firstName} {mgr.lastName}
                </span>
                <span className="text-xs text-muted-foreground ml-auto capitalize">
                  {mgr.role}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────── Empty State ────── */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Users className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm">Aucun {label} dans votre périmètre</p>
    </div>
  );
}

/* ────── Main Page ────── */
export default function CoachCockpitPage() {
  const [activeTab, setActiveTab] = useState<Tab>("conseillers");
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  const coachId = user?.id ?? "coach-1";
  const { institutions, managers, conseillers, summaries } =
    useCoachData(coachId);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cockpit Coach</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d&apos;ensemble de vos coachés
        </p>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 rounded-lg bg-muted p-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center gap-2",
                activeTab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Tab: Conseillers ═══ */}
      {activeTab === "conseillers" && (
        <>
          {conseillers.length === 0 ? (
            <EmptyState label="conseiller" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {conseillers.map((s) => (
                <UserCard
                  key={s.user.id}
                  summary={s}
                  ratioConfigs={ratioConfigs}
                  onClick={() => router.push(`/coach/${s.user.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Tab: Managers ═══ */}
      {activeTab === "managers" && (
        <>
          {managers.length === 0 ? (
            <EmptyState label="manager" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managers.map((s) => (
                <UserCard
                  key={s.user.id}
                  summary={s}
                  ratioConfigs={ratioConfigs}
                  onClick={() => router.push(`/coach/${s.user.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Tab: Institutions ═══ */}
      {activeTab === "institutions" && (
        <>
          {institutions.length === 0 ? (
            <EmptyState label="institution" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {institutions.map((inst) => (
                <InstitutionCard
                  key={inst.id}
                  assignmentId={inst.id}
                  targetId={inst.targetId}
                  excludedManagerIds={inst.excludedManagerIds}
                  summaries={summaries}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
