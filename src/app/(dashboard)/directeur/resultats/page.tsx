"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Users,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { ProspectionTab } from "@/components/resultats/prospection-tab";
import { VendeursTab } from "@/components/resultats/vendeurs-tab";
import { AcheteursTab } from "@/components/resultats/acheteurs-tab";
import { VentesTab } from "@/components/resultats/ventes-tab";
import { useDirecteurScope } from "@/hooks/use-directeur-scope";
import { useDirectorData } from "@/hooks/use-director-data";
import { useResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { aggregateResults } from "@/lib/aggregate-results";
import { mockWeeklyResults, mockYearlyResults } from "@/data/mock-results";
import { cn } from "@/lib/utils";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

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

export default function DirecteurResultatsPage() {
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const { allConseillers, allResults } = useDirectorData();
  const currentUser = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const isDemo = useAppStore((s) => s.isDemo);

  // Hook conseiller individuel — appelé inconditionnellement (règles des hooks).
  // Renvoie les résultats du conseiller scopé si scope === "conseiller", sinon
  // la valeur est ignorée par le useMemo plus bas.
  const individualMonthResults = useResults(
    scope === "conseiller" && scopeId ? scopeId : undefined,
  );

  const [activeTab, setActiveTab] = useState<TabId>("prospection");
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [periodOffset, setPeriodOffset] = useState(0);

  // Pool de conseillers selon le scope Directeur.
  const pool: User[] = useMemo(() => {
    const base = currentUser?.institutionId
      ? allConseillers.filter((c) => c.institutionId === currentUser.institutionId)
      : allConseillers;
    if (scope === "conseiller" && scopeId) {
      return base.filter((c) => c.id === scopeId);
    }
    if (scope === "equipe" && scopeId) {
      return base.filter((c) => c.teamId === scopeId);
    }
    return base;
  }, [scope, scopeId, allConseillers, currentUser?.institutionId]);

  function resolveTeamLabel(teamId: string): string {
    const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
    if (fromInfos) return fromInfos;
    const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
    return manager ? `Équipe de ${manager.firstName}` : "équipe";
  }

  // Titre + sous-titre dynamiques (cohérents avec PR2c sur /directeur/pilotage)
  const { title, subtitle } = useMemo(() => {
    if (scope === "conseiller" && scopeId) {
      const c = users.find((u) => u.id === scopeId);
      const baseName = c ? `${c.firstName} ${c.lastName}` : null;
      const ctxSuffix = teamContext ? ` (${resolveTeamLabel(teamContext)})` : "";
      return {
        title: baseName
          ? `Volume d'Activité — ${baseName}${ctxSuffix}`
          : "Volume d'Activité",
        subtitle:
          "Consultez l'historique de performance du conseiller par semaine, mois ou année.",
      };
    }
    if (scope === "equipe" && scopeId) {
      return {
        title: `Volume d'Activité — ${resolveTeamLabel(scopeId)}`,
        subtitle:
          "Consultez l'historique de performance de l'équipe par semaine, mois ou année.",
      };
    }
    return {
      title: "Mon Volume d'Activité",
      subtitle:
        "Consultez l'historique de performance de l'agence par semaine, mois ou année.",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, teamContext, users, teamInfos]);

  // Calcul des résultats selon scope + période (logique miroir du Manager)
  const results: PeriodResults | null = useMemo(() => {
    // ── Mode CONSEILLER (individuel)
    if (scope === "conseiller" && scopeId) {
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

    // ── Mode ÉQUIPE ou AGENCE (collectif agrégé sur le pool)
    if (pool.length === 0) return null;

    if (periodView === "week" && periodOffset === 0) {
      if (!isDemo) return null;
      return aggregateResults(pool.map(() => mockWeeklyResults));
    }
    if (periodView === "year" && periodOffset === 0) {
      if (!isDemo) return null;
      return aggregateResults(pool.map(() => mockYearlyResults));
    }
    if (periodView === "month" && periodOffset === 0) {
      const list = pool.flatMap((c) => {
        const cResults = allResults
          .filter((r) => r.userId === c.id)
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
        return cResults[0] ? [cResults[0]] : [];
      });
      return aggregateResults(list);
    }
    return null;
  }, [
    scope,
    scopeId,
    pool,
    allResults,
    periodView,
    periodOffset,
    isDemo,
    individualMonthResults,
  ]);

  const periodLabel = getPeriodLabel(periodView, periodOffset);
  const isCurrentPeriod = periodOffset === 0;

  // Empty state — agence/équipe vide en prod réel (pas en démo)
  if (scope !== "conseiller" && pool.length === 0 && !isDemo) {
    const emptyTitle =
      scope === "equipe"
        ? "Cette équipe n'a pas encore de conseillers"
        : "Votre agence n'a pas encore de conseillers";
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            {emptyTitle}
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Pour voir les résultats, ajoutez des conseillers à l&apos;équipe.
          </p>
          <a
            href="/directeur/equipe"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Gérer l&apos;équipe
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
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
      </header>

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

        {/* ═══ Tabs ou empty state période ═══ */}
        {!results ? (
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
