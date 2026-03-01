"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { mockResultsLastYear } from "@/data/mock-results";
import { BarChart } from "@/components/charts/bar-chart";
import { CATEGORY_LABELS, NXT_COLORS } from "@/lib/constants";
import type { UserCategory } from "@/types/user";
import type { RatioId } from "@/types/ratios";

type CompareMode = "advisor" | "profile";
type TabType = "interne" | "anneeN1" | "temporel";
type TimePeriod = "mois" | "trimestre" | "semestre" | "annee";

const periodLabels: Record<TimePeriod, string> = {
  mois: "Mois",
  trimestre: "Trimestre",
  semestre: "Semestre",
  annee: "Année",
};

const mockPreviousPeriodPerf: Record<TimePeriod, Record<RatioId, number>> = {
  mois: {
    contacts_rdv: 72,
    estimations_mandats: 85,
    pct_mandats_exclusifs: 60,
    visites_offre: 90,
    offres_compromis: 55,
    mandats_simples_vente: 40,
    mandats_exclusifs_vente: 78,
  },
  trimestre: {
    contacts_rdv: 68,
    estimations_mandats: 80,
    pct_mandats_exclusifs: 55,
    visites_offre: 75,
    offres_compromis: 65,
    mandats_simples_vente: 50,
    mandats_exclusifs_vente: 70,
  },
  semestre: {
    contacts_rdv: 74,
    estimations_mandats: 78,
    pct_mandats_exclusifs: 62,
    visites_offre: 82,
    offres_compromis: 58,
    mandats_simples_vente: 45,
    mandats_exclusifs_vente: 65,
  },
  annee: {
    contacts_rdv: 70,
    estimations_mandats: 75,
    pct_mandats_exclusifs: 50,
    visites_offre: 70,
    offres_compromis: 60,
    mandats_simples_vente: 42,
    mandats_exclusifs_vente: 60,
  },
};

function getPerformanceIndicator(current: number, previous: number) {
  const diff = current - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : diff > 0 ? 100 : 0;

  if (pct > 10) {
    return {
      emoji: "🏄‍♂️",
      label: "Sur-performance",
      colorClass: "text-green-500",
      bgClass: "bg-green-500/10 border-green-500/30",
      diff: `+${Math.round(pct)}%`,
    };
  } else if (pct >= -10) {
    return {
      emoji: "🏊‍♂️",
      label: "Performance stable",
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10 border-blue-500/30",
      diff: pct >= 0 ? `+${Math.round(pct)}%` : `${Math.round(pct)}%`,
    };
  } else {
    return {
      emoji: "🐟",
      label: "Sous-performance",
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10 border-red-500/30",
      diff: `${Math.round(pct)}%`,
    };
  }
}

export default function ComparaisonPage() {
  const [tab, setTab] = useState<TabType>("interne");
  const [mode, setMode] = useState<CompareMode>("advisor");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("u-demo-2");
  const [selectedProfile, setSelectedProfile] =
    useState<UserCategory>("expert");
  const [showAllRatios, setShowAllRatios] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("mois");

  const { user, category } = useUser();
  const myResults = useResults();
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);

  const otherResults =
    mode === "advisor"
      ? allResults.find((r) => r.userId === selectedAdvisorId) ?? null
      : null;

  const myRatios = useMemo(() => {
    if (!myResults) return [];
    return computeAllRatios(myResults, category, ratioConfigs);
  }, [myResults, category, ratioConfigs]);

  const otherRatios = useMemo(() => {
    if (mode === "advisor" && otherResults) {
      const otherUser = users.find((u) => u.id === selectedAdvisorId);
      const otherCat = otherUser?.category ?? "confirme";
      return computeAllRatios(otherResults, otherCat, ratioConfigs);
    }
    if (mode === "profile") {
      if (!myResults) return [];
      return computeAllRatios(myResults, selectedProfile, ratioConfigs);
    }
    return [];
  }, [mode, otherResults, myResults, selectedAdvisorId, selectedProfile, ratioConfigs, users]);

  const comparisonData = myRatios.map((r, idx) => {
    const config = ratioConfigs[r.ratioId as RatioId];
    return {
      name: config?.name.split("→")[0].trim().slice(0, 12) ?? r.ratioId,
      Moi: r.percentageOfTarget,
      Autre: otherRatios[idx]?.percentageOfTarget ?? 0,
    };
  });

  const lastYearResults = mockResultsLastYear[0];
  const lastYearRatios = lastYearResults
    ? computeAllRatios(lastYearResults, category, ratioConfigs)
    : [];

  const defaultYearKeys: RatioId[] = [
    "estimations_mandats",
    "offres_compromis",
    "mandats_exclusifs_vente",
  ];
  const yearComparisonData = (
    showAllRatios ? myRatios : myRatios.filter((r) => defaultYearKeys.includes(r.ratioId as RatioId))
  ).map((r) => {
    const config = ratioConfigs[r.ratioId as RatioId];
    const ly = lastYearRatios.find((lr) => lr.ratioId === r.ratioId);
    return {
      name: config?.name.split("→")[0].trim().slice(0, 12) ?? r.ratioId,
      "Cette année": r.percentageOfTarget,
      "Année N-1": ly?.percentageOfTarget ?? 0,
    };
  });

  // Temporal comparison data
  const temporalData = useMemo(() => {
    const prevPerf = mockPreviousPeriodPerf[timePeriod];
    return myRatios.map((r) => {
      const config = ratioConfigs[r.ratioId as RatioId];
      const previous = prevPerf[r.ratioId as RatioId] ?? 0;
      const current = r.percentageOfTarget;
      const indicator = getPerformanceIndicator(current, previous);
      return {
        ratioId: r.ratioId,
        name: config?.name ?? r.ratioId,
        shortName: config?.name.split("→")[0].trim().slice(0, 14) ?? r.ratioId,
        current,
        previous,
        indicator,
      };
    });
  }, [myRatios, ratioConfigs, timePeriod]);

  const temporalChartData = temporalData.map((d) => ({
    name: d.shortName,
    "Période actuelle": d.current,
    "Période précédente": d.previous,
  }));

  const surPerf = temporalData.filter((d) => d.indicator.label === "Sur-performance");
  const stablePerf = temporalData.filter((d) => d.indicator.label === "Performance stable");
  const sousPerf = temporalData.filter((d) => d.indicator.label === "Sous-performance");

  const otherUsers = users.filter(
    (u) => u.id !== user?.id && u.role === "conseiller"
  );

  const periodCompareLabel: Record<TimePeriod, string> = {
    mois: "mois précédent",
    trimestre: "trimestre précédent",
    semestre: "semestre précédent",
    annee: "année précédente",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Comparaison</h1>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("interne")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "interne"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison Interne
        </button>
        <button
          onClick={() => setTab("anneeN1")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "anneeN1"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Année N-1
        </button>
        <button
          onClick={() => setTab("temporel")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "temporel"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Évolution temporelle
        </button>
      </div>

      {/* ========== INTERNE ========== */}
      {tab === "interne" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("advisor")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "advisor"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un conseiller
              </button>
              <button
                onClick={() => setMode("profile")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "profile"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un profil
              </button>
            </div>

            {mode === "advisor" && (
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            )}

            {mode === "profile" && (
              <select
                value={selectedProfile}
                onChange={(e) =>
                  setSelectedProfile(e.target.value as UserCategory)
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {(["debutant", "confirme", "expert"] as UserCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Performance comparée (% objectif)
            </h3>
            <BarChart
              data={comparisonData}
              xKey="name"
              bars={[
                { dataKey: "Moi", color: NXT_COLORS.green, name: "Moi" },
                { dataKey: "Autre", color: NXT_COLORS.yellow, name: "Autre" },
              ]}
              height={300}
            />
            <div className="mt-3 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">Moi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  {mode === "advisor"
                    ? otherUsers.find((u) => u.id === selectedAdvisorId)
                        ?.firstName ?? "Autre"
                    : CATEGORY_LABELS[selectedProfile]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== ANNEE N-1 ========== */}
      {tab === "anneeN1" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Comparaison de vos performances avec l&apos;année précédente
            </p>
            <button
              onClick={() => setShowAllRatios(!showAllRatios)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                showAllRatios
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {showAllRatios ? "Métriques clés" : "Tous les ratios"}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Année N vs N-1 (% objectif)
            </h3>
            <BarChart
              data={yearComparisonData}
              xKey="name"
              bars={[
                {
                  dataKey: "Cette année",
                  color: NXT_COLORS.green,
                  name: "Cette année",
                },
                {
                  dataKey: "Année N-1",
                  color: NXT_COLORS.green + "80",
                  name: "Année N-1",
                },
              ]}
              height={300}
            />
          </div>
        </div>
      )}

      {/* ========== EVOLUTION TEMPORELLE ========== */}
      {tab === "temporel" && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(["mois", "trimestre", "semestre", "annee"] as TimePeriod[]).map(
                (tp) => (
                  <button
                    key={tp}
                    onClick={() => setTimePeriod(tp)}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      timePeriod === tp
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {periodLabels[tp]}
                  </button>
                )
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              vs {periodCompareLabel[timePeriod]}
            </p>
          </div>

          {/* Quick visual summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center">
              <span className="text-4xl">🏄‍♂️</span>
              <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                Sur-performance
              </p>
              <p className="mt-1 text-3xl font-bold text-green-500">
                {surPerf.length}
              </p>
              <p className="text-xs text-muted-foreground">ratio(s)</p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
              <span className="text-4xl">🏊‍♂️</span>
              <p className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                Performance stable
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-500">
                {stablePerf.length}
              </p>
              <p className="text-xs text-muted-foreground">ratio(s)</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
              <span className="text-4xl">🐟</span>
              <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                Sous-performance
              </p>
              <p className="mt-1 text-3xl font-bold text-red-500">
                {sousPerf.length}
              </p>
              <p className="text-xs text-muted-foreground">ratio(s)</p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Comparaison {periodLabels[timePeriod].toLowerCase()} actuel vs{" "}
              {periodCompareLabel[timePeriod]} (% objectif)
            </h3>
            <BarChart
              data={temporalChartData}
              xKey="name"
              bars={[
                {
                  dataKey: "Période actuelle",
                  color: NXT_COLORS.green,
                  name: "Période actuelle",
                },
                {
                  dataKey: "Période précédente",
                  color: NXT_COLORS.violet,
                  name: "Période précédente",
                },
              ]}
              height={300}
            />
            <div className="mt-3 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">
                  {periodLabels[timePeriod]} actuel
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-indigo-500" />
                <span className="text-sm text-muted-foreground">
                  {periodLabels[timePeriod]} précédent{timePeriod === "annee" ? "e" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Detail cards per ratio */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">
              Détail par ratio
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {temporalData.map((d) => (
                <div
                  key={d.ratioId}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    d.indicator.bgClass
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {d.name}
                      </p>
                      <div className="mt-2 flex items-baseline gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Actuel
                          </p>
                          <p className="text-xl font-bold text-foreground">
                            {d.current}%
                          </p>
                        </div>
                        <div className="text-muted-foreground">→</div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Précédent
                          </p>
                          <p className="text-lg font-semibold text-muted-foreground">
                            {d.previous}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">{d.indicator.emoji}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          d.indicator.colorClass
                        )}
                      >
                        {d.indicator.diff}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Légende</p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏄‍♂️</span>
                <div>
                  <p className="text-sm font-medium text-green-500">Sur-performance</p>
                  <p className="text-xs text-muted-foreground">&gt; +10% vs période précédente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏊‍♂️</span>
                <div>
                  <p className="text-sm font-medium text-blue-500">Performance stable</p>
                  <p className="text-xs text-muted-foreground">±10% vs période précédente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🐟</span>
                <div>
                  <p className="text-sm font-medium text-red-500">Sous-performance</p>
                  <p className="text-xs text-muted-foreground">&lt; -10% vs période précédente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
