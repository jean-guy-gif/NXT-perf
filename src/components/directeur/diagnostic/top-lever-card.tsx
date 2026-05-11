"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { DirectionPainPoint } from "@/lib/director/aggregate-pain-points-direction";

interface TopLeverCardProps {
  pain: DirectionPainPoint;
}

export function TopLeverCard({ pain }: TopLeverCardProps) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Levier prioritaire direction
      </div>

      <h2 className="mt-2 text-xl font-bold text-foreground">
        {pain.expertise.label}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        Ce levier coûte le plus à votre direction.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Manque à gagner cumulé
          </p>
          <p className="mt-1 text-xl font-bold text-destructive">
            {formatCurrency(Math.round(pain.gainEurCumule))}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Conseillers concernés
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-foreground">
            <Users className="h-4 w-4 text-muted-foreground" />
            {pain.nbConseillersConcernes}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Équipes concernées
          </p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {pain.nbEquipesConcernees}
          </p>
        </div>
      </div>

      <Link
        href={`/directeur/ameliorer?lever=${pain.expertiseId}`}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
      >
        Lancer un plan direction
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
