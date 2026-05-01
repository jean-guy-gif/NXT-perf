"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useYTDResults } from "@/hooks/use-ytd-results";
import { useRatios } from "@/hooks/use-ratios";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useAppStore } from "@/stores/app-store";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { aggregateResults } from "@/lib/aggregate-results";
import { mockWeeklyResults } from "@/data/mock-results";
import {
  buildMeasuredRatios,
  RATIO_ID_TO_EXPERTISE_ID,
} from "@/lib/ratio-to-expertise";
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
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { RatioId } from "@/types/ratios";

// Reverse map ExpertiseRatioId → RatioId (legacy id used by DiagnosticKeyFigures)
const EXPERTISE_TO_RATIO_ID: Partial<Record<ExpertiseRatioId, RatioId>> = (
  Object.entries(RATIO_ID_TO_EXPERTISE_ID) as [RatioId, ExpertiseRatioId | null][]
).reduce(
  (acc, [ratioId, expertiseId]) => {
    if (expertiseId) acc[expertiseId] = ratioId;
    return acc;
  },
  {} as Partial<Record<ExpertiseRatioId, RatioId>>
);

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticContent />
    </Suspense>
  );
}

function DiagnosticContent() {
  const router = useRouter();
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const monthResults = useResults();
  const ytdResults = useYTDResults();
  const allResults = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();
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

  const [othersDrawerOpen, setOthersDrawerOpen] = useState(false);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const periodResults = useMemo<PeriodResults | null>(() => {
    if (!user) return null;
    if (period === "semaine") return isDemo ? mockWeeklyResults : null;
    if (period === "mois") return monthResults;
    if (period === "trimestre" || period === "annee") return ytdResults;
    if (period === "depuis_debut") {
      const mine = allResults.filter((r) => r.userId === user.id);
      return aggregateResults(mine);
    }
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

  // ── Handlers du nouveau flow Diagnostic ──────────────────────────────

  const handleSavoirPourquoi = () => {
    if (!criticite.top) return;
    const ratioId = EXPERTISE_TO_RATIO_ID[criticite.top.expertiseId];
    // Actuellement le verdict est toujours sur un ratio (V1) → on bascule
    // sur la vue Ratios et on highlight la carte correspondante.
    setView("ratios");
    if (ratioId) {
      const id = `ratio:${ratioId}`;
      setHighlightedItem(id);
      // Laisse le DOM se mettre à jour (toggle bascule), puis scroll
      setTimeout(() => {
        const el = document.querySelector(`[data-highlight-id="${id}"]`);
        if (el && "scrollIntoView" in el) {
          (el as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
      // Retire la surbrillance après ~5s pour ne pas clignoter en permanence
      setTimeout(() => setHighlightedItem(null), 5000);
    }
  };

  const handleAmeliorer = async () => {
    if (!criticite.top || !user || !periodResults) return;
    setImproving(true);
    setToast(null);
    try {
      const measured = buildMeasuredRatios(computedRatios, periodResults);
      const profile = deriveProfileLevel(category);
      const myHistory = allResults.filter((r) => r.userId === user.id);
      const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
      await createPlan30j({
        mode: "targeted",
        ratioId: criticite.top.expertiseId,
        measuredRatios: measured,
        profile,
        avgCommissionEur: avg,
      });
      router.push("/conseiller/ameliorer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setToast("Un plan est déjà actif — redirection vers votre plan en cours.");
        router.push("/conseiller/ameliorer");
      } else {
        setToast("Erreur lors de la création du plan.");
      }
    } finally {
      setImproving(false);
    }
  };

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
            onSavoirPourquoi={handleSavoirPourquoi}
            onAmeliorer={handleAmeliorer}
            onSeeOthersClick={() => setOthersDrawerOpen(true)}
            improving={improving}
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

        {toast && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-600">
            {toast}
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
            highlightedItem={highlightedItem}
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
      </div>

      {/* Drawer "Voir les autres points en danger" — list only */}
      <WhyDangerDrawer
        open={othersDrawerOpen}
        onClose={() => setOthersDrawerOpen(false)}
        otherPainPoints={criticite.others}
      />
    </div>
  );
}
