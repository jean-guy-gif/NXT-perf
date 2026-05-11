"use client";

import Link from "next/link";
import { TrendingDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { DirectionPainPoint } from "@/lib/director/aggregate-pain-points-direction";

interface OtherLeversListProps {
  levers: DirectionPainPoint[];
}

export function OtherLeversList({ levers }: OtherLeversListProps) {
  if (levers.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5" />
          Autres leviers à surveiller
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun autre levier critique. Votre direction est performante.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <TrendingDown className="h-3.5 w-3.5" />
        Autres leviers à surveiller
      </div>
      <ul className="mt-3 divide-y divide-border">
        {levers.map((lever) => (
          <li key={lever.expertiseId}>
            <Link
              href={`/directeur/ameliorer?lever=${lever.expertiseId}`}
              className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {lever.expertise.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {lever.nbConseillersConcernes} conseiller
                  {lever.nbConseillersConcernes > 1 ? "s" : ""} ·{" "}
                  {lever.nbEquipesConcernees} équipe
                  {lever.nbEquipesConcernees > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold tabular-nums text-destructive">
                  {formatCurrency(Math.round(lever.gainEurCumule))}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
