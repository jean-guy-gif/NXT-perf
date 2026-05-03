"use client";

import { useMemo, useState } from "react";
import { ChevronDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useYTDResults } from "@/hooks/use-ytd-results";
import { useRatios } from "@/hooks/use-ratios";
import { useAppStore } from "@/stores/app-store";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { aggregateResults } from "@/lib/aggregate-results";
import { mockWeeklyResults } from "@/data/mock-results";
import {
  computeEffectivePeriodMonths,
  isCurrentMonthInProgress,
} from "@/lib/performance/pro-rated-objective";
import {
  DiagnosticToggle,
  type DiagnosticView,
} from "./diagnostic-toggle";
import {
  DiagnosticPeriodSelector,
  type DiagnosticPeriod,
} from "./diagnostic-period-selector";
import { DiagnosticKpiCards } from "./diagnostic-kpi-cards";
import { ProductionFlow } from "./production-flow";
import { MiniDpiGauge } from "./mini-dpi-gauge";
import type { PeriodResults } from "@/types/results";

/**
 * KeyFiguresAccordion — accordéon « Voir mes chiffres clés » (PR3.7 Q1=C).
 *
 * Replié par défaut. Quand déplié :
 *   1. Toggle Volumes / Ratios / Les deux
 *   2. Sélecteur de période (Semaine / Mois / Trimestre / Année / Depuis début / Personnalisé)
 *   3. Cartes KPI colorées (4 volumes + 4 ratios prioritaires)
 *   4. Flux de production (ProductionChain wrapper)
 *   5. Mini-jauge DPI synthétique
 *
 * État (view + period) persisté en localStorage pour conserver la préférence
 * de l'utilisateur entre sessions.
 */
export function KeyFiguresAccordion() {
  const [open, setOpen] = useState(false);
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const monthResults = useResults();
  const ytdResults = useYTDResults();
  const allResults = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);

  const [view, setView] = usePersistedState<DiagnosticView>(
    "nxt-diag-view",
    "both"
  );
  const [period, setPeriod] = usePersistedState<DiagnosticPeriod>(
    "nxt-diag-period",
    "mois"
  );

  const periodResults = useMemo<PeriodResults | null>(() => {
    if (!user) return null;
    if (period === "semaine") return isDemo ? mockWeeklyResults : null;
    if (period === "mois") return monthResults;
    if (period === "trimestre" || period === "annee") return ytdResults;
    if (period === "depuis_debut") {
      const mine = allResults.filter((r) => r.userId === user.id);
      return aggregateResults(mine);
    }
    // personnalisé — V1 : fallback YTD (date-picker custom à venir)
    return ytdResults;
  }, [period, user, isDemo, monthResults, ytdResults, allResults]);

  const periodMonths = useMemo(() => {
    if (period === "semaine") return 0.25;
    if (period === "mois") return 1;
    if (period === "trimestre") return 3;
    if (period === "annee") return 12;
    if (period === "depuis_debut") return 12;
    return 1;
  }, [period]);

  // PR3.8.6 — Échelle d'objectif EFFECTIVE (proratée si la période contient
  // le mois en cours). Pas de proration sur "semaine" : la période est déjà
  // une fraction de mois, le caller est explicite. Pour "mois / trimestre /
  // année / depuis_debut" : on retire le dernier mois entier et on le
  // remplace par la fraction écoulée du mois courant si applicable.
  const effectiveMonths = useMemo(() => {
    if (period === "semaine") return periodMonths;
    const today = new Date();
    const inProgress = isCurrentMonthInProgress(periodResults, today);
    return computeEffectivePeriodMonths(periodMonths, today, inProgress);
  }, [period, periodMonths, periodResults]);

  const periodMode: "mois" | "ytd" | "custom" =
    period === "mois" ? "mois" : period === "personnalise" ? "custom" : "ytd";

  if (!user) return null;

  return (
    <section
      aria-label="Voir mes chiffres clés"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="key-figures-accordion-content"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Voir mes chiffres clés
            </span>
            <span className="block text-xs text-muted-foreground">
              Volumes, ratios, flux de production et DPI synthétique
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          id="key-figures-accordion-content"
          className="space-y-6 border-t border-border px-5 py-5"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <DiagnosticToggle value={view} onChange={setView} />
            <DiagnosticPeriodSelector value={period} onChange={setPeriod} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              Mes chiffres clés
            </h3>
            <DiagnosticKpiCards
              view={view}
              results={periodResults}
              computedRatios={computedRatios}
              ratioConfigs={ratioConfigs}
              category={category}
              periodMonths={periodMonths}
              effectiveMonths={effectiveMonths}
            />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              Mon flux de production
            </h3>
            <ProductionFlow
              userId={user.id}
              results={periodResults}
              periodMonths={periodMonths}
              periodMode={periodMode}
            />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              Mon DPI synthétique
            </h3>
            <MiniDpiGauge />
          </div>
        </div>
      )}
    </section>
  );
}
