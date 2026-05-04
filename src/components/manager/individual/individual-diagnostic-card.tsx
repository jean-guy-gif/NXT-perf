"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdvisorDiagnosis, DiagnosticMetric, PainPoint } from "@/lib/coaching/advisor-diagnosis";

interface Props {
  advisorFirstName: string;
  diagnosis: AdvisorDiagnosis;
}

/**
 * IndividualDiagnosticCard — bloc "Diagnostic chiffres clés + douleur
 * prioritaire" affiché AVANT la trame coaching (PR3.8 follow-up).
 *
 * Donne au manager une vision objective des chiffres et un point de
 * focus avant d'entrer en coaching, plutôt qu'un questionnaire à froid.
 */
export function IndividualDiagnosticCard({
  advisorFirstName,
  diagnosis,
}: Props) {
  const { primary, secondary, displayMetrics, focusRecommendation } = diagnosis;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-foreground">
            Diagnostic chiffres clés — {advisorFirstName}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lecture automatique des résultats de la période. Sert de point de
            départ au coaching.
          </p>
        </div>
      </header>

      {/* Chiffres clés */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {displayMetrics.map((m) => (
          <MetricTile key={m.label} metric={m} />
        ))}
      </div>

      {/* Point de douleur prioritaire */}
      {primary ? (
        <PainPointCallout primary={primary} />
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Aucun point de douleur prioritaire détecté.</span>{" "}
            L&apos;activité est équilibrée sur le funnel. Le coaching peut
            cibler la régularité ou un objectif d&apos;ambition.
          </p>
        </div>
      )}

      {/* Points secondaires */}
      {secondary.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Autres points à surveiller
          </p>
          {secondary.map((p) => (
            <SecondaryPainItem key={p.key} point={p} />
          ))}
        </div>
      )}

      {/* Reco focus */}
      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Focus recommandé pour le coaching
        </p>
        <p className="mt-1 text-sm text-foreground">{focusRecommendation}</p>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function MetricTile({ metric }: { metric: DiagnosticMetric }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{metric.label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-foreground">
        {metric.value}
      </p>
      {metric.trendPct != null && (
        <TrendBadge value={metric.trendPct} />
      )}
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        positive && "text-emerald-600 dark:text-emerald-500",
        negative && "text-red-500",
        !positive && !negative && "text-muted-foreground",
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {value > 0 ? "+" : ""}
      {value} %
    </span>
  );
}

function PainPointCallout({ primary }: { primary: PainPoint }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-500" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-500">
            Point de douleur prioritaire détecté
          </p>
          <h4 className="mt-1 text-base font-bold text-foreground">
            {primary.label}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {primary.justification}
          </p>
          {primary.metrics.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {primary.metrics.map((m, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  • {m.label} : <span className="font-medium text-foreground">{m.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SecondaryPainItem({ point }: { point: PainPoint }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-sm font-medium text-foreground">{point.label}</p>
      <p className="text-xs text-muted-foreground">{point.justification}</p>
    </div>
  );
}
