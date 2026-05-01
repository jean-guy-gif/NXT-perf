"use client";

import Link from "next/link";
import { History, ArrowRight, CheckCircle2, AlertCircle, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanWithMeta, PlanStatus } from "@/hooks/use-plans";

const STATUS_LABELS: Record<PlanStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  termine: {
    label: "Réussi",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    icon: CheckCircle2,
  },
  expire: {
    label: "Partiel",
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    icon: AlertCircle,
  },
  actif: {
    label: "En cours",
    bg: "bg-primary/10",
    text: "text-primary",
    icon: Hourglass,
  },
};

interface Props {
  plans: PlanWithMeta[];
}

export function PlansHistoryCard({ plans }: Props) {
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

  // Tri : actif d'abord, puis par date desc
  const sorted = [...plans].sort((a, b) => {
    if (a.status === "actif" && b.status !== "actif") return -1;
    if (b.status === "actif" && a.status !== "actif") return 1;
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
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const cfg = STATUS_LABELS[p.status];
              const Icon = cfg.icon;
              return (
                <tr
                  key={p.ratioId + p.createdAt.getTime()}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-2 py-3 text-xs text-muted-foreground">
                    {p.createdAt.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-3 text-sm text-foreground">
                    {p.plan.priorities[0]?.label ?? p.ratioId}
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
                    {p.doneActions}/{p.totalActions} ({p.progressPct}%)
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Link
                      href={`/coaching-debrief?planId=${encodeURIComponent(p.ratioId)}`}
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
