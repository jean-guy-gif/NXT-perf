"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useCoachData } from "@/hooks/use-coach-data";
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
import type { RatioId } from "@/types/ratios";
import { ArrowLeft, TrendingUp, FileText, Home, Award } from "lucide-react";

/* ────── KPI Card ────── */
function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
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

/* ────── Format ratio value ────── */
function formatRatioValue(ratioId: string, value: number): string {
  const config = defaultRatioConfigs[ratioId as RatioId];
  if (!config) return String(value);
  if (config.isPercentage) return `${value}%`;
  return String(value);
}

/* ────── Main Page ────── */
export default function CoachUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const user = useAppStore((s) => s.user);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  const coachId = user?.id ?? "coach-1";
  const { summaries } = useCoachData(coachId);

  // Find the summary for this user
  const summary = summaries.find((s) => s.user.id === userId);

  // If not found (not in scope), redirect to cockpit
  if (!summary) {
    redirect("/coach/cockpit");
  }

  const { user: targetUser, results, ratios, avgScore, assignment } = summary;

  // KPI values
  const ca =
    results?.ventes.chiffreAffaires != null
      ? `${results.ventes.chiffreAffaires.toLocaleString("fr-FR")} €`
      : "—";
  const actes =
    results?.ventes.actesSignes != null
      ? String(results.ventes.actesSignes)
      : "—";
  const mandats =
    results?.vendeurs.mandatsSignes != null
      ? String(results.vendeurs.mandatsSignes)
      : "—";
  const exclusiviteRatio = ratios.find(
    (r) => r.ratioId === "pct_mandats_exclusifs"
  );
  const exclusivite =
    exclusiviteRatio != null ? `${exclusiviteRatio.value}%` : "—";

  return (
    <div className="space-y-6">
      {/* ═══ Top bar ═══ */}
      <div className="flex items-center gap-3">
        <Link
          href="/coach/cockpit"
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">
            {targetUser.firstName} {targetUser.lastName}
          </h1>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              CATEGORY_COLORS[targetUser.category] ?? ""
            )}
          >
            {CATEGORY_LABELS[targetUser.category] ?? targetUser.category}
          </span>
        </div>
      </div>

      {/* ═══ KPI section ═══ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Chiffre d'Affaires" value={ca} icon={TrendingUp} />
        <KpiCard label="Actes signés" value={actes} icon={FileText} />
        <KpiCard label="Mandats signés" value={mandats} icon={Home} />
        <KpiCard label="% Exclusivité" value={exclusivite} icon={Award} />
      </div>

      {/* ═══ Ratios section ═══ */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Ratios de performance</h2>
        {ratios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune donnée disponible
          </p>
        ) : (
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
        )}
      </div>

      {/* ═══ Coach Panel ═══ */}
      <div className="rounded-xl border bg-card p-5">
        <CoachPanel
          assignmentId={assignment.id}
          userId={userId}
          ratios={ratios}
        />
      </div>
    </div>
  );
}
