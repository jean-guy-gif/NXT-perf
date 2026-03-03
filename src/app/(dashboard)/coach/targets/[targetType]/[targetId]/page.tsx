"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useCoachTargetData } from "@/hooks/use-coach-target-data";
import { TargetHeader } from "@/components/coach/target-header";
import { ScopeKpiGrid } from "@/components/coach/scope-kpi-grid";
import { CoachPanel } from "@/components/coach/coach-panel";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  STATUS_BORDER_COLORS,
} from "@/lib/constants";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import { cn } from "@/lib/utils";
import type { CoachTargetType } from "@/types/coach";
import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { User } from "@/types/user";
import {
  TrendingUp,
  FileText,
  Award,
  AlertTriangle,
  Users,
  ArrowRight,
} from "lucide-react";

/* ────── Helpers ────── */

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function formatRatioValue(ratioId: string, value: number): string {
  const config = defaultRatioConfigs[ratioId as RatioId];
  if (!config) return String(value);
  if (config.isPercentage) return `${value}%`;
  return String(value);
}

/* ────── Status badge ────── */
function StatusBadge({ status }: { status: "ok" | "warning" | "danger" }) {
  const labels: Record<string, string> = {
    ok: "OK",
    warning: "Attention",
    danger: "Critique",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium border",
        STATUS_COLORS[status],
        STATUS_BG_COLORS[status],
        STATUS_BORDER_COLORS[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

/* ────── Ratio grid (reused across views) ────── */
function RatioGrid({ ratios }: { ratios: ComputedRatio[] }) {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  if (ratios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune donnée disponible
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ratios.map((ratio) => {
        const config = ratioConfigs[ratio.ratioId as RatioId];
        return (
          <div
            key={ratio.ratioId}
            className="rounded-xl border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {config?.name ?? ratio.ratioId}
              </p>
              <StatusBadge status={ratio.status} />
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  STATUS_COLORS[ratio.status]
                )}
              >
                {formatRatioValue(ratio.ratioId, ratio.value)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {formatRatioValue(ratio.ratioId, ratio.thresholdForCategory)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  ratio.status === "ok"
                    ? "bg-green-500"
                    : ratio.status === "warning"
                      ? "bg-orange-500"
                      : "bg-red-500"
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, ratio.percentageOfTarget))}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────── Clickable advisor/manager row ────── */
function PersonRow({
  user,
  href,
  score,
  alerts,
  extra,
}: {
  user: User;
  href: string;
  score: number;
  alerts: number;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.firstName} {user.lastName}
        </p>
        {extra}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className={cn("text-sm font-semibold tabular-nums", scoreColor(score))}>
          {score}%
        </span>
        {alerts > 0 && (
          <span className="flex items-center gap-1 text-xs text-orange-500">
            <AlertTriangle className="h-3 w-3" />
            {alerts}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ────── INSTITUTION View ────── */
function InstitutionView({
  data,
}: {
  data: ReturnType<typeof useCoachTargetData>;
}) {
  const { agencyKpis, managersAggregate, advisorsAggregate, assignment } = data;

  const kpis = agencyKpis
    ? [
        {
          label: "CA total",
          value: agencyKpis.totalCA.toLocaleString("fr-FR") + " \u20AC",
          icon: TrendingUp,
        },
        {
          label: "Actes total",
          value: String(agencyKpis.totalActes),
          icon: FileText,
        },
        {
          label: "Score moyen",
          value: agencyKpis.avgScore + "%",
          icon: Award,
        },
        {
          label: "Alertes",
          value: String(agencyKpis.alertCount),
          icon: AlertTriangle,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <TargetHeader targetType="INSTITUTION" targetName="Organisation" />

      {kpis.length > 0 && <ScopeKpiGrid kpis={kpis} />}

      {/* Managers table */}
      {managersAggregate && managersAggregate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Managers</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Nom</span>
              <span className="text-center">Taille équipe</span>
              <span className="text-center">Score moyen</span>
              <span className="text-center">Alertes</span>
            </div>
            {managersAggregate.map((mgr) => (
              <Link
                key={mgr.user.id}
                href={`/coach/targets/MANAGER/${mgr.user.id}`}
                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
              >
                <span className="text-sm font-medium truncate">
                  {mgr.user.firstName} {mgr.user.lastName}
                </span>
                <span className="text-sm text-center tabular-nums">
                  {mgr.teamSize}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold text-center tabular-nums",
                    scoreColor(mgr.avgScore)
                  )}
                >
                  {mgr.avgScore}%
                </span>
                <span className="text-sm text-center tabular-nums">
                  {mgr.alertCount}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Advisors table */}
      {advisorsAggregate && advisorsAggregate.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Conseillers</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
              <span>Nom</span>
              <span className="text-center">Catégorie</span>
              <span className="text-center">Score</span>
              <span className="text-center">Alertes</span>
            </div>
            {advisorsAggregate.map((adv) => (
              <Link
                key={adv.user.id}
                href={`/coach/targets/AGENT/${adv.user.id}`}
                className="grid grid-cols-4 gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
              >
                <span className="text-sm font-medium truncate">
                  {adv.user.firstName} {adv.user.lastName}
                </span>
                <span className="text-center">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      CATEGORY_COLORS[adv.user.category] ?? ""
                    )}
                  >
                    {CATEGORY_LABELS[adv.user.category] ?? adv.user.category}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold text-center tabular-nums",
                    scoreColor(adv.avgScore)
                  )}
                >
                  {adv.avgScore}%
                </span>
                <span className="text-sm text-center tabular-nums">
                  {adv.alertCount}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Plan link */}
      <Link
        href="./plan"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* CoachPanel */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel
            assignmentId={assignment.id}
            userId={advisorsAggregate?.[0]?.user.id ?? ""}
            ratios={advisorsAggregate?.[0]?.ratios ?? []}
          />
        </div>
      )}
    </div>
  );
}

/* ────── MANAGER View ────── */
function ManagerView({
  data,
  targetId,
}: {
  data: ReturnType<typeof useCoachTargetData>;
  targetId: string;
}) {
  const { managerUser, managerRatios, teamAdvisors, assignment } = data;

  if (!managerUser) return null;

  const teamSize = teamAdvisors?.length ?? 0;
  const avgScoreVal =
    managerRatios && managerRatios.length > 0
      ? Math.round(
          managerRatios.reduce((s, r) => s + (r.percentageOfTarget ?? 0), 0) /
            managerRatios.length
        )
      : 0;
  const alertsVal = managerRatios
    ? managerRatios.filter(
        (r) => r.status === "danger" || r.status === "warning"
      ).length
    : 0;

  const kpis = [
    {
      label: "Score moyen",
      value: avgScoreVal + "%",
      icon: Award,
    },
    {
      label: "Alertes",
      value: String(alertsVal),
      icon: AlertTriangle,
    },
    {
      label: "Taille équipe",
      value: String(teamSize),
      icon: Users,
    },
    {
      label: "Conseillers en alerte",
      value: String(
        teamAdvisors?.filter((a) => a.alertCount > 0).length ?? 0
      ),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <TargetHeader
        targetType="MANAGER"
        targetName={managerUser.firstName + " " + managerUser.lastName}
      />

      <ScopeKpiGrid kpis={kpis} />

      {/* Manager ratios */}
      {managerRatios && managerRatios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Ratios de performance
          </h2>
          <RatioGrid ratios={managerRatios} />
        </div>
      )}

      {/* Team advisors list */}
      {teamAdvisors && teamAdvisors.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Équipe</h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            {teamAdvisors.map((adv) => (
              <PersonRow
                key={adv.user.id}
                user={adv.user}
                href={`/coach/targets/AGENT/${adv.user.id}`}
                score={adv.avgScore}
                alerts={adv.alertCount}
                extra={
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
                      CATEGORY_COLORS[adv.user.category] ?? ""
                    )}
                  >
                    {CATEGORY_LABELS[adv.user.category] ?? adv.user.category}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Plan link */}
      <Link
        href="./plan"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* CoachPanel */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel
            assignmentId={assignment.id}
            userId={managerUser.id}
            ratios={managerRatios ?? []}
          />
        </div>
      )}
    </div>
  );
}

/* ────── AGENT View ────── */
function AgentView({
  data,
  targetId,
}: {
  data: ReturnType<typeof useCoachTargetData>;
  targetId: string;
}) {
  const { advisorUser, advisorRatios, assignment } = data;
  const allResults = useAppStore((s) => s.results);

  if (!advisorUser) return null;

  const userResults = allResults.find((r) => r.userId === targetId);

  // Extract KPIs from results
  const ca =
    userResults?.ventes.chiffreAffaires != null
      ? userResults.ventes.chiffreAffaires.toLocaleString("fr-FR") + " \u20AC"
      : "\u2014";
  const actes =
    userResults?.ventes.actesSignes != null
      ? String(userResults.ventes.actesSignes)
      : "\u2014";
  const mandats =
    userResults?.vendeurs.mandatsSignes != null
      ? String(userResults.vendeurs.mandatsSignes)
      : "\u2014";
  const exclusiviteRatio = advisorRatios?.find(
    (r) => r.ratioId === "pct_mandats_exclusifs"
  );
  const exclusivite =
    exclusiviteRatio != null ? `${exclusiviteRatio.value}%` : "\u2014";

  const kpis = [
    { label: "Chiffre d'Affaires", value: ca, icon: TrendingUp },
    { label: "Actes signés", value: actes, icon: FileText },
    { label: "Mandats signés", value: mandats, icon: Award },
    { label: "% Exclusivité", value: exclusivite, icon: Award },
  ];

  return (
    <div className="space-y-6">
      <TargetHeader
        targetType="AGENT"
        targetName={advisorUser.firstName + " " + advisorUser.lastName}
      />

      <ScopeKpiGrid kpis={kpis} />

      {/* Full ratio grid */}
      {advisorRatios && advisorRatios.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">
            Ratios de performance
          </h2>
          <RatioGrid ratios={advisorRatios} />
        </div>
      )}

      {/* Plan link */}
      <Link
        href="./plan"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Plan 30 jours
        <ArrowRight className="h-4 w-4" />
      </Link>

      {/* CoachPanel */}
      {assignment && (
        <div className="rounded-xl border bg-card p-5">
          <CoachPanel
            assignmentId={assignment.id}
            userId={advisorUser.id}
            ratios={advisorRatios ?? []}
          />
        </div>
      )}
    </div>
  );
}

/* ────── Main Page ────── */
const VALID_TYPES: CoachTargetType[] = ["AGENT", "MANAGER", "INSTITUTION"];

export default function TargetScopeViewPage({
  params,
}: {
  params: Promise<{ targetType: string; targetId: string }>;
}) {
  const { targetType, targetId } = use(params);

  // Validate targetType
  if (!VALID_TYPES.includes(targetType as CoachTargetType)) {
    redirect("/coach/dashboard");
  }

  const validType = targetType as CoachTargetType;
  const data = useCoachTargetData(validType, targetId);

  // If no assignment found, redirect
  if (!data.assignment) {
    redirect("/coach/dashboard");
  }

  return (
    <div className="space-y-6">
      {validType === "INSTITUTION" && <InstitutionView data={data} />}
      {validType === "MANAGER" && (
        <ManagerView data={data} targetId={targetId} />
      )}
      {validType === "AGENT" && (
        <AgentView data={data} targetId={targetId} />
      )}
    </div>
  );
}
