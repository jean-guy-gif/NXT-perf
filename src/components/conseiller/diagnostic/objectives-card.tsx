"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Target, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useUser } from "@/hooks/use-user";
import { useYTDResults } from "@/hooks/use-ytd-results";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";

/**
 * Carte « Mes objectifs » — en haut du diagnostic conseiller.
 *
 * Confronte l'objectif ANNUEL (dérivé du GPS objectifs stocké dans le store :
 * `agencyObjective = { annualCA, avgActValue }`, via `calculateObjectiveBreakdown`)
 * au RÉALISÉ depuis le 1er janvier (`useYTDResults`), pour mandats, compromis,
 * actes et chiffre d'affaires. Pour chacun : % atteint + barre + phrase de
 * rythme (projection fin d'année vs objectif).
 *
 * Sans objectif fixé → invite « Fixer mes objectifs » vers /objectifs.
 */

interface Metric {
  key: string;
  label: string;
  objective: number;
  realized: number;
  isCurrency: boolean;
}

/** Formate une valeur selon son type : € sans décimales, sinon entier. */
function fmt(value: number, isCurrency: boolean): string {
  if (isCurrency) return formatCurrency(Math.round(value));
  return String(Math.round(value));
}

export function ObjectivesCard() {
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { category } = useUser();
  const ytd = useYTDResults();

  const breakdown = useMemo(() => {
    if (
      !agencyObjective ||
      agencyObjective.annualCA <= 0 ||
      agencyObjective.avgActValue <= 0
    ) {
      return null;
    }
    return calculateObjectiveBreakdown(
      agencyObjective.annualCA,
      agencyObjective.avgActValue,
      category,
      ratioConfigs
    );
  }, [agencyObjective, category, ratioConfigs]);

  // Fraction de l'année écoulée → projection « à ce rythme ».
  const { fractionElapsed, monthsElapsed, monthsRemaining } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime();
    const f = (now.getTime() - start) / (end - start);
    return {
      fractionElapsed: f,
      monthsElapsed: Math.max(0.5, f * 12),
      monthsRemaining: Math.max(0.5, 12 - f * 12),
    };
  }, []);

  // ── Pas d'objectif → invite à en fixer un ──
  if (!agencyObjective || !breakdown) {
    return (
      <section
        aria-label="Mes objectifs"
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Mes objectifs</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Fixe ton objectif annuel pour suivre ta progression vers tes mandats,
          compromis, actes et chiffre d&apos;affaires.
        </p>
        <Link
          href="/objectifs"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Fixer mes objectifs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const metrics: Metric[] = [
    {
      key: "mandats",
      label: "Mandats",
      objective: breakdown.mandatsNecessaires,
      realized: ytd?.vendeurs.mandatsSignes ?? 0,
      isCurrency: false,
    },
    {
      key: "compromis",
      label: "Compromis",
      objective: breakdown.compromisNecessaires,
      realized: ytd?.acheteurs.compromisSignes ?? 0,
      isCurrency: false,
    },
    {
      key: "actes",
      label: "Actes",
      objective: breakdown.actesNecessaires,
      realized: ytd?.ventes.actesSignes ?? 0,
      isCurrency: false,
    },
    {
      key: "ca",
      label: "Chiffre d'affaires",
      objective: agencyObjective.annualCA,
      realized: ytd?.ventes.chiffreAffaires ?? 0,
      isCurrency: true,
    },
  ];

  return (
    <section
      aria-label="Mes objectifs"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Mes objectifs</h2>
        <span className="text-xs text-muted-foreground">
          — réalisé depuis le 1er janvier
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {metrics.map((m) => {
          const pct = m.objective > 0 ? (m.realized / m.objective) * 100 : 0;
          const projection =
            fractionElapsed > 0 ? m.realized / fractionElapsed : m.realized;
          const onTrack = projection >= m.objective;
          // Combien produire en plus chaque mois (vs rythme actuel) pour finir à Y.
          const extraPerMonth = Math.max(
            0,
            (m.objective - m.realized) / monthsRemaining -
              m.realized / monthsElapsed
          );
          const status = onTrack ? "ok" : pct >= 60 ? "warning" : "danger";

          return (
            <div
              key={m.key}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {m.label}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {fmt(m.realized, m.isCurrency)}
                  </span>
                  {" / "}
                  {fmt(m.objective, m.isCurrency)}
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <ProgressBar
                  value={pct}
                  status={status}
                  showValue={false}
                  size="sm"
                  className="flex-1"
                />
                <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                  {Math.round(pct)}%
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                À ce rythme tu finis l&apos;année à{" "}
                <span className="font-semibold text-foreground">
                  {fmt(projection, m.isCurrency)}
                </span>
                , objectif {fmt(m.objective, m.isCurrency)}
                {onTrack ? (
                  <>
                    {" → "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                      tu es dans les temps
                    </span>
                    .
                  </>
                ) : (
                  <>
                    {" → "}
                    <span className="font-semibold text-foreground">
                      {fmt(extraPerMonth, m.isCurrency)} de plus par mois
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
