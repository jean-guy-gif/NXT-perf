"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { ProspectionTab } from "@/components/resultats/prospection-tab";
import { VendeursTab } from "@/components/resultats/vendeurs-tab";
import { AcheteursTab } from "@/components/resultats/acheteurs-tab";
import { VentesTab } from "@/components/resultats/ventes-tab";
import { useResults } from "@/hooks/use-results";
import {
  mockWeeklyResults,
  mockYearlyResults,
} from "@/data/mock-results";
import { useAppStore } from "@/stores/app-store";
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

  // year
  const year = now.getFullYear() + offset;
  return `Année ${year}`;
}

export default function ResultatsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("prospection");
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [periodOffset, setPeriodOffset] = useState(0);

  const monthResults = useResults();
  const isDemo = useAppStore((s) => s.isDemo);

  // Select the right data based on period view
  const results: PeriodResults | null = useMemo(() => {
    if (periodView === "week" && periodOffset === 0) return isDemo ? mockWeeklyResults : null;
    if (periodView === "year" && periodOffset === 0) return isDemo ? mockYearlyResults : null;
    if (periodView === "month" && periodOffset === 0) return monthResults;
    // For offsets != 0, return null (no data for other periods yet)
    return null;
  }, [periodView, periodOffset, monthResults, isDemo]);

  const periodLabel = getPeriodLabel(periodView, periodOffset);
  const isCurrentPeriod = periodOffset === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mes Résultats</h1>

      {/* Period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Period type buttons */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {periodLabels[pv]}
            </button>
          ))}
        </div>

        {/* Period navigation */}
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
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

      {/* No data message */}
      {!results && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune donnée disponible pour cette période.
          </p>
          <button
            onClick={() => setPeriodOffset(0)}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Revenir à la période actuelle
          </button>
        </div>
      )}

      {/* Tab navigation */}
      {results && (
        <>
          <div className="flex overflow-x-auto scrollbar-hide gap-1 rounded-lg bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "prospection" && (
            <ProspectionTab results={results} />
          )}
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
    </div>
  );
}
