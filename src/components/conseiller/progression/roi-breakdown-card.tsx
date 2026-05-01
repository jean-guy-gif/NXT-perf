"use client";

import Link from "next/link";
import { PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RoiSummary } from "@/lib/roi-calculator";

interface Props {
  summary: RoiSummary;
}

export function RoiBreakdownCard({ summary }: Props) {
  const { breakdown, totalEuros } = summary;

  if (breakdown.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <PieChart className="h-3.5 w-3.5" />
          D'où vient ce gain ?
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Vous n'avez pas encore terminé de plan 30 jours. Lancez votre premier
          plan depuis Mon diagnostic ou M'améliorer pour voir le détail
          apparaître ici.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <PieChart className="h-3.5 w-3.5" />
        D'où vient ce gain ?
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Décomposition par plan 30j
      </h3>

      <ul className="mt-4 space-y-2">
        {breakdown.map((entry) => {
          const widthPct =
            totalEuros > 0 ? Math.round((entry.gainEur / totalEuros) * 100) : 0;
          return (
            <li key={entry.ratioId + entry.createdAt.getTime()}>
              <Link
                href={`/coaching-debrief?planId=${encodeURIComponent(entry.ratioId)}`}
                className="block rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-foreground">
                    {entry.label}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
                    +{formatCurrency(entry.gainEur)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({widthPct}%)
                    </span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      entry.status === "termine"
                        ? "bg-emerald-500"
                        : "bg-orange-500"
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.status === "termine"
                    ? "Plan terminé"
                    : `Plan expiré · ${entry.pct}% des actions cochées`}{" "}
                  · {entry.createdAt.toLocaleDateString("fr-FR")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
