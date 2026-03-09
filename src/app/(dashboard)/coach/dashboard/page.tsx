"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useCoachData } from "@/hooks/use-coach-data";
import type { CoachPortfolioClient } from "@/hooks/use-coach-data";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import { cn } from "@/lib/utils";
import type { RatioId } from "@/types/ratios";
import type { DiagnosticSeverity, ProgressionTrend } from "@/lib/coach";
import {
  Building2,
  Users,
  UserCheck,
  User as UserIcon,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ShieldAlert,
  Trophy,
  Briefcase,
} from "lucide-react";

/* ────── Helpers ────── */

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 50) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function diagnosticColor(severity: DiagnosticSeverity): string {
  if (severity === "critical") return "text-red-500 bg-red-500/10";
  if (severity === "warning") return "text-orange-500 bg-orange-500/10";
  return "text-green-500 bg-green-500/10";
}

function trendIcon(trend: ProgressionTrend) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function trendColor(trend: ProgressionTrend): string {
  if (trend === "up") return "text-green-500";
  if (trend === "down") return "text-red-500";
  return "text-muted-foreground";
}

const TYPE_ICON: Record<string, typeof Users> = {
  INSTITUTION: Building2,
  MANAGER: UserCheck,
  AGENT: UserIcon,
};

const TYPE_LABEL: Record<string, string> = {
  INSTITUTION: "Agence",
  MANAGER: "Manager",
  AGENT: "Agent",
};

const TYPE_COLOR: Record<string, string> = {
  INSTITUTION: "bg-purple-500/10 text-purple-500",
  MANAGER: "bg-blue-500/10 text-blue-500",
  AGENT: "bg-green-500/10 text-green-500",
};

/* ────── Client Card ────── */
function ClientCard({
  client,
  onClick,
}: {
  client: CoachPortfolioClient;
  onClick: () => void;
}) {
  const Icon = TYPE_ICON[client.targetType] ?? Users;

  return (
    <div
      onClick={onClick}
      className="rounded-xl border bg-card p-4 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header: type badge + name */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                TYPE_COLOR[client.targetType]
              )}
            >
              <Icon className="h-3 w-3" />
              {TYPE_LABEL[client.targetType]}
            </span>
            {client.memberCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {client.memberCount} membre{client.memberCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm truncate">{client.name}</p>
          <p className="text-xs text-muted-foreground truncate">{client.subtitle}</p>
        </div>
        {/* Score */}
        <div className={cn("rounded-lg px-2.5 py-1.5 text-center shrink-0", scoreBg(client.score))}>
          <p className={cn("text-lg font-bold tabular-nums leading-none", scoreColor(client.score))}>
            {client.score}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">score</p>
        </div>
      </div>

      {/* Volumes mini grid */}
      {client.volumes && (
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { label: "Contacts", value: client.volumes.contacts },
            { label: "Mandats", value: client.volumes.mandats },
            { label: "Visites", value: client.volumes.visites },
            { label: "CA", value: client.volumes.ca > 0 ? `${(client.volumes.ca / 1000).toFixed(0)}k` : "0" },
          ].map((v) => (
            <div key={v.label} className="text-center">
              <p className="text-sm font-semibold tabular-nums">{v.value}</p>
              <p className="text-[10px] text-muted-foreground">{v.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert ratios */}
      {client.alertRatios.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {client.alertRatios.slice(0, 2).map((r) => (
            <span
              key={r.ratioId}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                r.status === "danger"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-orange-500/10 text-orange-500"
              )}
            >
              {defaultRatioConfigs[r.ratioId as RatioId]?.name ?? r.ratioId}
            </span>
          ))}
        </div>
      )}

      {/* Footer: diagnostic + progression */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            diagnosticColor(client.diagnostic.severity)
          )}
        >
          {client.diagnostic.label}
        </span>
        <div className="flex items-center gap-1">
          {trendIcon(client.progression.trend)}
          <span className={cn("text-xs font-medium", trendColor(client.progression.trend))}>
            {client.progression.label}
          </span>
        </div>
      </div>

      {/* Alerts badges */}
      {client.alerts.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-[10px] text-red-500 font-medium">
            {client.alerts[0].label}
          </span>
        </div>
      )}
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

/* ────── Priority Panel ────── */
function PriorityPanel({ clients, onNavigate }: { clients: CoachPortfolioClient[]; onNavigate: (c: CoachPortfolioClient) => void }) {
  if (clients.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-red-500" />
        <h3 className="text-sm font-semibold text-red-500">À suivre en priorité</h3>
      </div>
      <div className="space-y-2">
        {clients.slice(0, 5).map((c) => {
          const Icon = TYPE_ICON[c.targetType] ?? Users;
          return (
            <div
              key={c.assignment.id}
              onClick={() => onNavigate(c)}
              className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2 cursor-pointer hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{c.name}</span>
                {c.alerts.length > 0 && (
                  <span className="text-[10px] text-red-500 font-medium shrink-0">
                    {c.alerts[0].label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-sm font-bold tabular-nums", scoreColor(c.score))}>
                  {c.score}%
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────── Top Performers Panel ────── */
function TopPanel({ clients, onNavigate }: { clients: CoachPortfolioClient[]; onNavigate: (c: CoachPortfolioClient) => void }) {
  if (clients.length === 0) return null;

  return (
    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-green-500" />
        <h3 className="text-sm font-semibold text-green-500">Top performance</h3>
      </div>
      <div className="space-y-2">
        {clients.map((c) => {
          const Icon = TYPE_ICON[c.targetType] ?? Users;
          return (
            <div
              key={c.assignment.id}
              onClick={() => onNavigate(c)}
              className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-2 cursor-pointer hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{c.name}</span>
              </div>
              <span className={cn("text-sm font-bold tabular-nums", scoreColor(c.score))}>
                {c.score}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────── Main Page ────── */
export default function CoachDashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  const coachId = user?.id ?? "coach-1";
  const { portfolioClients, priorityClients, topPerformers } = useCoachData(coachId);

  const navigate = (c: CoachPortfolioClient) => {
    router.push(`/coach/targets/${c.targetType}/${c.targetId}`);
  };

  // Group clients by type
  const agencyClients = useMemo(
    () => portfolioClients.filter((c) => c.targetType === "INSTITUTION"),
    [portfolioClients]
  );
  const managerClients = useMemo(
    () => portfolioClients.filter((c) => c.targetType === "MANAGER"),
    [portfolioClients]
  );
  const agentClients = useMemo(
    () => portfolioClients.filter((c) => c.targetType === "AGENT"),
    [portfolioClients]
  );

  const isEmpty = portfolioClients.length === 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portefeuille Coaching</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {portfolioClients.length} client{portfolioClients.length > 1 ? "s" : ""} en accompagnement
        </p>
      </div>

      {/* Priority + Top panels */}
      {!isEmpty && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PriorityPanel clients={priorityClients} onNavigate={navigate} />
          <TopPanel clients={topPerformers} onNavigate={navigate} />
        </div>
      )}

      {/* ═══ Agences ═══ */}
      {agencyClients.length > 0 && (
        <section>
          <SectionHeader icon={Building2} label="Agences" count={agencyClients.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agencyClients.map((c) => (
              <ClientCard key={c.assignment.id} client={c} onClick={() => navigate(c)} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Managers ═══ */}
      {managerClients.length > 0 && (
        <section>
          <SectionHeader icon={UserCheck} label="Managers" count={managerClients.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managerClients.map((c) => (
              <ClientCard key={c.assignment.id} client={c} onClick={() => navigate(c)} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Agents ═══ */}
      {agentClients.length > 0 && (
        <section>
          <SectionHeader icon={Users} label="Agents" count={agentClients.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agentClients.map((c) => (
              <ClientCard key={c.assignment.id} client={c} onClick={() => navigate(c)} />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Empty state ═══ */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-sm font-medium">Aucun client dans votre portefeuille</p>
          <p className="text-xs mt-1">Vos missions apparaîtront ici une fois attribuées.</p>
        </div>
      )}
    </div>
  );
}
