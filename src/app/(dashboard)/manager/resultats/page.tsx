"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Eye,
  Users,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { ProspectionTab } from "@/components/resultats/prospection-tab";
import { VendeursTab } from "@/components/resultats/vendeurs-tab";
import { AcheteursTab } from "@/components/resultats/acheteurs-tab";
import { VentesTab } from "@/components/resultats/ventes-tab";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { aggregateResults } from "@/lib/aggregate-results";
import { mockWeeklyResults, mockYearlyResults } from "@/data/mock-results";
import { cn } from "@/lib/utils";
import type { PeriodResults } from "@/types/results";

const tabs = [
  { id: "prospection", label: "Prospection" },
  { id: "vendeurs", label: "Vendeurs" },
  { id: "acheteurs", label: "Acheteurs" },
  { id: "ventes", label: "Ventes" },
] as const;

type TabId = (typeof tabs)[number]["id"];
type PeriodView = "week" | "month" | "year";

const periodLabels: Record<PeriodView, string> = {
  week: "Semaine",
  month: "Mois",
  year: "Année",
};

function getPeriodLabel(view: PeriodView, offset: number): string {
  const now = new Date();

  if (view === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() + offset * 7);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (date: Date) =>
      date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    return `Semaine du ${fmt(monday)} au ${fmt(sunday)}`;
  }

  if (view === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  const year = now.getFullYear() + offset;
  return `Année ${year}`;
}

export default function ManagerResultatsPage() {
  const { conseiller, conseillerId, isIndividualScope, setScope } = useManagerScope();
  const { conseillers } = useTeamResults();
  const allResults = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const individualMonthResults = useResults(conseillerId ?? undefined);

  const [activeTab, setActiveTab] = useState<TabId>("prospection");
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [periodOffset, setPeriodOffset] = useState(0);

  // Compute results based on scope + period
  const results: PeriodResults | null = useMemo(() => {
    // ── Mode INDIVIDUAL
    if (isIndividualScope && conseillerId) {
      if (periodView === "week" && periodOffset === 0) {
        return isDemo ? mockWeeklyResults : null;
      }
      if (periodView === "year" && periodOffset === 0) {
        return isDemo ? mockYearlyResults : null;
      }
      if (periodView === "month" && periodOffset === 0) {
        return individualMonthResults;
      }
      return null;
    }

    // ── Mode TEAM (collectif) — empty team handled outside
    if (conseillers.length === 0) return null;

    if (periodView === "week" && periodOffset === 0) {
      if (!isDemo) return null;
      // Demo aggregate × N conseillers (simulates team weekly aggregate)
      return aggregateResults(conseillers.map(() => mockWeeklyResults));
    }
    if (periodView === "year" && periodOffset === 0) {
      if (!isDemo) return null;
      return aggregateResults(conseillers.map(() => mockYearlyResults));
    }
    if (periodView === "month" && periodOffset === 0) {
      // Aggregate each conseiller's most recent result
      const list = conseillers.flatMap((c) => {
        const cResults = allResults
          .filter((r) => r.userId === c.id)
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
        return cResults[0] ? [cResults[0]] : [];
      });
      return aggregateResults(list);
    }
    return null;
  }, [
    isIndividualScope,
    conseillerId,
    conseillers,
    allResults,
    periodView,
    periodOffset,
    isDemo,
    individualMonthResults,
  ]);

  const periodLabel = getPeriodLabel(periodView, periodOffset);
  const isCurrentPeriod = periodOffset === 0;

  // ── Empty state Q4 : équipe vide en mode collectif (prod réel uniquement)
  if (!isIndividualScope && conseillers.length === 0 && !isDemo) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Votre équipe n&apos;a pas encore de conseillers
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Pour voir les résultats, ajoutez des conseillers à votre équipe.
          </p>
          <a
            href="/manager/equipe"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Inviter des conseillers
          </a>
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <BarChart3 className="h-3.5 w-3.5" />
          Résultats
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mon Volume d&apos;Activité
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Consultez l&apos;historique de performance de votre équipe par semaine, mois
          ou année.
        </p>
      </header>

      {/* ═══ Bandeau "Vous regardez X" (mode individuel) ═══ */}
      {isIndividualScope && conseiller && (
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">
                Vous regardez :{" "}
                <strong>
                  {conseiller.firstName} {conseiller.lastName}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScope("team")}
              className="text-xs text-primary hover:underline"
            >
              Retour à la vue équipe
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
        {/* Period selector + navigation */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
            {(["week", "month", "year"] as PeriodView[]).map((pv) => (
              <button
                key={pv}
                onClick={() => {
                  setPeriodView(pv);
                  setPeriodOffset(0);
                }}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  periodView === pv
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {periodLabels[pv]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeriodOffset((o) => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize text-foreground">
                {periodLabel}
              </span>
            </div>
            <button
              onClick={() => setPeriodOffset((o) => Math.min(o + 1, 0))}
              disabled={isCurrentPeriod}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors",
                isCurrentPeriod
                  ? "cursor-not-allowed text-muted-foreground/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!isCurrentPeriod && (
              <button
                onClick={() => setPeriodOffset(0)}
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Aujourd&apos;hui
              </button>
            )}
          </div>
        </div>

        {/* ═══ Dispatch empty states + tabs ═══ */}
        {isIndividualScope && !conseillerId ? (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un conseiller dans la barre en haut pour voir sa vue
              détaillée.
            </p>
          </div>
        ) : !results ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucune donnée disponible pour cette période.
            </p>
            <button
              onClick={() => setPeriodOffset(0)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Revenir à la période actuelle
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "prospection" && <ProspectionTab results={results} />}
            {activeTab === "vendeurs" && <VendeursTab results={results} />}
            {activeTab === "acheteurs" && <AcheteursTab results={results} />}
            {activeTab === "ventes" && <VentesTab results={results} />}
          </>
        )}

        <Tooltip
          id="field-tooltip"
          place="top"
          className="!max-w-xs !rounded-lg !bg-popover !px-3 !py-2 !text-xs !text-popover-foreground !shadow-lg !border !border-border"
          opacity={1}
        />
      </section>
    </div>
  );
}
