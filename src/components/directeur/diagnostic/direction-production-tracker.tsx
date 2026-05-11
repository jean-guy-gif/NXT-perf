"use client";

import { Activity, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ProductionDirection } from "@/hooks/use-directeur-diagnostic";

interface DirectionProductionTrackerProps {
  production: ProductionDirection;
}

const STATUS_STYLE: Record<
  ProductionDirection["actesStatus"],
  { label: string; tone: string; Icon: typeof CheckCircle2 }
> = {
  ahead: {
    label: "En avance",
    tone: "text-emerald-600 bg-emerald-50 border-emerald-200",
    Icon: CheckCircle2,
  },
  on_track: {
    label: "Dans le rythme",
    tone: "text-amber-600 bg-amber-50 border-amber-200",
    Icon: Clock,
  },
  behind: {
    label: "En retard",
    tone: "text-red-600 bg-red-50 border-red-200",
    Icon: AlertCircle,
  },
  no_target: {
    label: "Objectif non défini",
    tone: "text-muted-foreground bg-muted/40 border-border",
    Icon: Clock,
  },
};

export function DirectionProductionTracker({
  production,
}: DirectionProductionTrackerProps) {
  const status = STATUS_STYLE[production.actesStatus];
  const StatusIcon = status.Icon;
  const monthProgressPct = Math.round(
    (production.dayOfMonth / production.daysInMonth) * 100,
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Production direction cumulée
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            status.tone,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Jour {production.dayOfMonth}/{production.daysInMonth} du mois ·{" "}
        {monthProgressPct}% écoulé · CA cumulé{" "}
        <span className="font-semibold text-foreground">
          {formatCurrency(production.caCumule)}
        </span>
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Étape</th>
              <th className="px-3 py-2 text-right">Réalisé</th>
              <th className="px-3 py-2 text-right">Objectif rythme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <ProductionRow label="Estimations" value={production.estimations} />
            <ProductionRow label="Mandats" value={production.mandats} />
            <ProductionRow label="Visites" value={production.visites} />
            <ProductionRow label="Compromis" value={production.compromis} />
            <ProductionRow
              label="Actes signés"
              value={production.actes}
              target={production.expectedActes}
              monthly={production.monthlyActesTarget}
              highlight
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ProductionRowProps {
  label: string;
  value: number;
  target?: number | null;
  monthly?: number | null;
  highlight?: boolean;
}

function ProductionRow({
  label,
  value,
  target,
  monthly,
  highlight,
}: ProductionRowProps) {
  return (
    <tr className={cn(highlight && "bg-primary/5 font-semibold")}>
      <td className="px-3 py-2 text-foreground">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums text-foreground">
        {value}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
        {target !== undefined && target !== null ? (
          <>
            {target}
            {monthly !== undefined && monthly !== null && (
              <span className="ml-1 text-xs text-muted-foreground/70">
                / {monthly} mois
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
    </tr>
  );
}
