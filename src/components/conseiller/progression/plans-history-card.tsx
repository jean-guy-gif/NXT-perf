"use client";

import Link from "next/link";
import {
  History,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { formatCurrency } from "@/lib/formatters";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { ImprovementResource } from "@/lib/improvement-resources-adapters";
import type { Plan30jPayload } from "@/config/coaching";

type DisplayStatus = "active" | "completed" | "expired" | "archived";

const STATUS_LABELS: Record<
  DisplayStatus,
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  active: {
    label: "En cours",
    bg: "bg-primary/10",
    text: "text-primary",
    icon: Hourglass,
  },
  completed: {
    label: "Terminé",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    icon: CheckCircle2,
  },
  expired: {
    label: "Expiré",
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    icon: AlertCircle,
  },
  archived: {
    label: "Archivé",
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: Archive,
  },
};

// PR3.7.3 : statut du nxt_coaching lié à un plan, mappé vers un libellé court
const COACH_RDV_LABELS: Record<string, string> = {
  none: "—",
  debrief_offered: "Debrief offert",
  debrief_used: "Debrief consulté",
  pending_human_coach: "RDV demandé",
  human_coached: "RDV honoré",
  subscribed: "Abonné",
  cancelled: "Annulé",
};

interface Props {
  plans: ImprovementResource[];
}

interface PlanRow {
  id: string;
  ratioId: string;
  label: string;
  displayStatus: DisplayStatus;
  createdAt: Date;
  endsAt: Date | null;
  total: number;
  done: number;
  pct: number;
  estimatedGainEur: number | null;
  realGainEur: number | null;
  coachRdvLabel: string;
}

function buildRow(
  plan: ImprovementResource,
  coachingByPlanId: Map<string, ImprovementResource>
): PlanRow {
  const payload = plan.payload as unknown as Plan30jPayload;
  const allActions = (payload?.weeks ?? []).flatMap((w) => w.actions ?? []);
  const total = allActions.length;
  const done = allActions.filter((a) => a.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  let displayStatus: DisplayStatus;
  if (plan.status === "active" && plan.archived_at === null) {
    displayStatus = "active";
  } else if (plan.status === "completed") {
    displayStatus = "completed";
  } else if (plan.status === "expired") {
    displayStatus = "expired";
  } else {
    displayStatus = "archived";
  }

  const ratioId = plan.pain_ratio_id ?? "";
  const label =
    RATIO_EXPERTISE[ratioId as ExpertiseRatioId]?.label ?? ratioId ?? "Plan";

  const estimatedGainEur =
    typeof payload?.estimated_ca_loss_eur === "number" &&
    payload.estimated_ca_loss_eur > 0
      ? payload.estimated_ca_loss_eur
      : null;

  // Gain réel V1 : pas encore mesuré (pipeline pré/post saisies à venir).
  const realGainEur = null;

  const coaching = coachingByPlanId.get(plan.id);
  const coachStatus = coaching?.status ?? "none";
  const coachRdvLabel = COACH_RDV_LABELS[coachStatus] ?? "—";

  return {
    id: plan.id,
    ratioId,
    label,
    displayStatus,
    createdAt: new Date(plan.created_at),
    endsAt: plan.expires_at ? new Date(plan.expires_at) : null,
    total,
    done,
    pct,
    estimatedGainEur,
    realGainEur,
    coachRdvLabel,
  };
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function PlansHistoryCard({ plans }: Props) {
  const { resources } = useImprovementResources();

  // Index des nxt_coaching par source_plan_id pour un lookup O(1)
  const coachingByPlanId = new Map<string, ImprovementResource>();
  for (const r of resources) {
    if (r.resource_type !== "nxt_coaching") continue;
    const sid = (r.payload as { source_plan_id?: string } | null)
      ?.source_plan_id;
    if (sid) coachingByPlanId.set(sid, r);
  }

  if (plans.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Mes plans 30 jours
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun plan 30 jours encore lancé. Démarrez le premier depuis Mon
          diagnostic ou M'améliorer.
        </p>
      </section>
    );
  }

  // Tri : actifs d'abord, puis par date desc
  const rows = plans
    .map((p) => buildRow(p, coachingByPlanId))
    .sort((a, b) => {
      if (a.displayStatus === "active" && b.displayStatus !== "active")
        return -1;
      if (b.displayStatus === "active" && a.displayStatus !== "active")
        return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Mes plans 30 jours
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Historique complet
      </h3>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">Période</th>
              <th className="px-2 py-2 text-left font-medium">Levier</th>
              <th className="px-2 py-2 text-left font-medium">Statut</th>
              <th className="px-2 py-2 text-right font-medium">Actions</th>
              <th className="px-2 py-2 text-right font-medium">Gain est.</th>
              <th className="px-2 py-2 text-right font-medium">Gain réel</th>
              <th className="px-2 py-2 text-left font-medium">RDV coach</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cfg = STATUS_LABELS[r.displayStatus];
              const Icon = cfg.icon;
              return (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    <div>{fmtDate(r.createdAt)}</div>
                    {r.endsAt && (
                      <div className="text-[11px] text-muted-foreground/70">
                        → {fmtDate(r.endsAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-sm text-foreground">
                    {r.label}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        cfg.bg,
                        cfg.text
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right text-xs tabular-nums text-foreground">
                    {r.done}/{r.total} ({r.pct}%)
                  </td>
                  <td className="px-2 py-3 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-500">
                    {r.estimatedGainEur
                      ? `+${formatCurrency(Math.round(r.estimatedGainEur))}`
                      : "—"}
                  </td>
                  <td
                    className="px-2 py-3 text-right text-xs tabular-nums text-muted-foreground"
                    title="Mesure pré/post à venir"
                  >
                    {r.realGainEur
                      ? `+${formatCurrency(Math.round(r.realGainEur))}`
                      : "—"}
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    {r.coachRdvLabel}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/coaching-debrief?planId=${encodeURIComponent(r.id)}&readonly=1`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Revoir
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
