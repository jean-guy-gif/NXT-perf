"use client";

import { Suspense, useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useYTDResults } from "@/hooks/use-ytd-results";
import { useRatios } from "@/hooks/use-ratios";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { useAppStore } from "@/stores/app-store";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { aggregateResults } from "@/lib/aggregate-results";
import { mockWeeklyResults } from "@/data/mock-results";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { deriveProfileLevel, getAvgCommissionEur } from "@/lib/get-avg-commission";
import { findCriticitePoints } from "@/lib/diagnostic-criticite";
import { ProductionChain } from "@/components/dashboard/production-chain";
import { WeeklyGateWrapper } from "@/components/dashboard/weekly-gate-wrapper";
import {
  DiagnosticToggle,
  type DiagnosticView,
} from "@/components/conseiller/diagnostic/diagnostic-toggle";
import {
  DiagnosticPeriodSelector,
  type DiagnosticPeriod,
} from "@/components/conseiller/diagnostic/diagnostic-period-selector";
import { DiagnosticVerdictCard } from "@/components/conseiller/diagnostic/diagnostic-verdict-card";
import { DiagnosticKeyFigures } from "@/components/conseiller/diagnostic/diagnostic-key-figures";
import { MiniDPISynthese } from "@/components/conseiller/diagnostic/mini-dpi-synthese";
import { WhyDangerDrawer } from "@/components/conseiller/diagnostic/why-danger-drawer";
import type { PeriodResults } from "@/types/results";

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticContent />
    </Suspense>
  );
}

function DiagnosticContent() {
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const monthResults = useResults();
  const ytdResults = useYTDResults();
  const allResults = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const {
    showGate,
    context: gateContext,
    isLoading: gateLoading,
    dismissGate,
    markSaisieDone,
  } = useWeeklyGate();

  const [view, setView] = usePersistedState<DiagnosticView>(
    "nxt-diag-view",
    "both"
  );
  const [period, setPeriod] = usePersistedState<DiagnosticPeriod>(
    "nxt-diag-period",
    "mois"
  );

  const [drawerMode, setDrawerMode] = useState<"single" | "list" | null>(null);

  const periodResults = useMemo<PeriodResults | null>(() => {
    if (!user) return null;
    if (period === "semaine") return isDemo ? mockWeeklyResults : null;
    if (period === "mois") return monthResults;
    if (period === "trimestre" || period === "annee") return ytdResults;
    if (period === "depuis_debut") {
      const mine = allResults.filter((r) => r.userId === user.id);
      return aggregateResults(mine);
    }
    // personnalise — V1 : fallback YTD ; le picker custom arrivera plus tard
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

  const criticite = useMemo(() => {
    if (!periodResults || computedRatios.length === 0)
      return { top: null, others: [] };
    const measured = buildMeasuredRatios(computedRatios, periodResults);
    if (measured.length === 0) return { top: null, others: [] };
    const profile = deriveProfileLevel(category);
    const myHistory = user
      ? allResults.filter((r) => r.userId === user.id)
      : [];
    const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
    return findCriticitePoints(measured, profile, avg);
  }, [periodResults, computedRatios, category, user, allResults, agencyObjective]);

  // Early returns
  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!gateLoading && showGate) {
    return (
      <WeeklyGateWrapper
        context={gateContext}
        onDismiss={dismissGate}
        onSaisieDone={markSaisieDone}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Search className="h-3.5 w-3.5" />
          Mon diagnostic
        </div>
        <h1 className="text-3xl font-bold text-foreground">Mon diagnostic</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Le point critique du mois, vos chiffres clés, votre flux de production
          et votre DPI synthétique.
        </p>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4">
        {/* 1. Verdict critique */}
        {criticite.top ? (
          <DiagnosticVerdictCard
            verdict={criticite.top}
            onWhyClick={() => setDrawerMode("single")}
            onSeeOthersClick={() => setDrawerMode("list")}
          />
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Aucun point critique détecté ce mois-ci
            </p>
            <p className="mt-2 text-sm text-foreground">
              Vos ratios sont conformes aux objectifs de votre profil.
              Continuez à saisir chaque semaine pour suivre votre progression.
            </p>
          </div>
        )}

        {/* 2. Toggle V/R + Period selector */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <DiagnosticToggle value={view} onChange={setView} />
          <DiagnosticPeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* 3. Mes chiffres clés */}
        <section aria-label="Mes chiffres clés">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Mes chiffres clés
          </h2>
          <DiagnosticKeyFigures
            view={view}
            results={periodResults}
            computedRatios={computedRatios}
            ratioConfigs={ratioConfigs}
            category={category}
            periodMonths={periodMonths}
          />
        </section>

        {/* 4. Mon flux de production */}
        <section aria-label="Mon flux de production">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Mon flux de production
          </h2>
          <ProductionChain
            scope="individual"
            userId={user.id}
            resultsOverride={periodResults}
            periodMonths={Math.max(1, Math.round(periodMonths))}
            periodMode={period === "mois" ? "mois" : "ytd"}
          />
        </section>

        {/* 5. Mini DPI synthétique */}
        <section aria-label="Mon DPI synthétique">
          <MiniDPISynthese />
        </section>

        {/* CTA secondaire vers M'améliorer si critique */}
        {criticite.top && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="text-foreground">
              Prêt·e à corriger ce point ? Lancez votre plan 30 jours sur le
              levier identifié.
            </p>
            <a
              href={`/conseiller/ameliorer?levier=${criticite.top.expertiseId}`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Aller à M'améliorer
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Drawer "Savoir pourquoi" / "Voir les autres points" */}
      <WhyDangerDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        verdict={criticite.top}
        otherPainPoints={criticite.others}
        mode={drawerMode ?? "single"}
      />
    </div>
  );
}
