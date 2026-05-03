"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, AlertTriangle, Users } from "lucide-react";
import type { TeamLever } from "@/lib/manager/team-diagnostic";
import { formatCurrency } from "@/lib/formatters";

interface TeamDiagnosticSummaryProps {
  top: TeamLever | null;
  secondaries: TeamLever[];
  totalAdvisors: number;
}

/**
 * Bloc principal "Diagnostic de l'équipe" (PR3.8.3 — Manager Collectif).
 *
 * Affiche en headline le levier prioritaire équipe + 2 leviers secondaires
 * en dessous + un CTA vers /manager/ameliorer?levier=X. Reste lisible en
 * moins de 5 secondes : un seul levier en gros, secondaries en compact.
 *
 * Empty state (top=null) : équipe au-dessus des seuils — message positif.
 */
export function TeamDiagnosticSummary({
  top,
  secondaries,
  totalAdvisors,
}: TeamDiagnosticSummaryProps) {
  if (totalAdvisors === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Diagnostic indisponible
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aucun conseiller de votre équipe n&apos;a encore de résultats
          exploitables. Le diagnostic apparaîtra dès que des données seront
          saisies.
        </p>
      </div>
    );
  }

  if (!top) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Votre équipe est au-dessus des seuils
          </h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aucun levier prioritaire à activer ce mois-ci sur les{" "}
          {totalAdvisors} conseiller{totalAdvisors > 1 ? "s" : ""} évalué
          {totalAdvisors > 1 ? "s" : ""}. Continuez le pilotage régulier.
        </p>
      </div>
    );
  }

  const ctaHref = `/manager/ameliorer?levier=${encodeURIComponent(top.expertiseId)}`;

  return (
    <div className="space-y-4">
      {/* HEADLINE */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Votre équipe perd principalement de la performance sur :
            </p>
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              {top.label}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  <span className="font-semibold text-foreground">
                    {top.frequencyCount}
                  </span>
                  /{top.totalAdvisors} conseiller{top.frequencyCount > 1 ? "s" : ""} concerné
                  {top.frequencyCount > 1 ? "s" : ""}
                </span>
              </span>
              <span>
                Impact estimé :{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(Math.round(top.totalGainEur))}
                </span>{" "}
                / mois
              </span>
            </div>
          </div>
        </div>

        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Faire progresser mon équipe sur ce point
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* SECONDAIRES */}
      {secondaries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Autres leviers à surveiller
          </p>
          <ul className="space-y-2">
            {secondaries.map((lever) => (
              <li
                key={lever.expertiseId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {lever.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lever.frequencyCount}/{lever.totalAdvisors} conseiller
                    {lever.frequencyCount > 1 ? "s" : ""} • Impact estimé{" "}
                    {formatCurrency(Math.round(lever.totalGainEur))}
                  </p>
                </div>
                <Link
                  href={`/manager/ameliorer?levier=${encodeURIComponent(lever.expertiseId)}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Activer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
