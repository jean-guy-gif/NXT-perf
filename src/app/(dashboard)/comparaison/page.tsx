"use client";

import { useState, useMemo } from "react";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { BarChart } from "@/components/charts/bar-chart";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import { CATEGORY_LABELS, NXT_COLORS } from "@/lib/constants";
import type { UserCategory } from "@/types/user";
import type { RatioId } from "@/types/ratios";
import type { ComputedRatio } from "@/types/ratios";

type CompareMode = "advisor" | "profile";
type TabType = "interne" | "temporel" | "dpi";

function getPerformanceIndicator(ratio: ComputedRatio) {
  const pct = ratio.percentageOfTarget;

  if (ratio.status === "ok") {
    return {
      emoji: "🏄‍♂️",
      label: "Sur-performance",
      colorClass: "text-green-500",
      bgClass: "bg-green-500/10 border-green-500/30",
      pct: `${Math.round(pct)}%`,
    };
  } else if (ratio.status === "warning") {
    return {
      emoji: "🏊‍♂️",
      label: "Performance stable",
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10 border-blue-500/30",
      pct: `${Math.round(pct)}%`,
    };
  } else {
    return {
      emoji: "🐟",
      label: "Sous-performance",
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10 border-red-500/30",
      pct: `${Math.round(pct)}%`,
    };
  }
}

export default function ComparaisonPage() {
  const [tab, setTab] = useState<TabType>("interne");
  const [mode, setMode] = useState<CompareMode>("advisor");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("u-demo-2");
  const [selectedProfile, setSelectedProfile] =
    useState<UserCategory>("expert");

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

  // Performance vs level thresholds
  const levelData = useMemo(() => {
    return myRatios.map((r) => {
      const config = ratioConfigs[r.ratioId as RatioId];
      const indicator = getPerformanceIndicator(r);
      return {
        ratioId: r.ratioId,
        name: config?.name ?? r.ratioId,
        shortName: config?.name.split("→")[0].trim().slice(0, 14) ?? r.ratioId,
        percentageOfTarget: r.percentageOfTarget,
        value: r.value,
        threshold: r.thresholdForCategory,
        isPercentage: config?.isPercentage ?? false,
        unit: config?.unit ?? "",
        indicator,
      };
    });
  }, [myRatios, ratioConfigs]);

  const levelChartData = levelData.map((d) => ({
    name: d.shortName,
    "Ma performance": d.percentageOfTarget,
    "Objectif": 100,
  }));

  const surPerf = levelData.filter((d) => d.indicator.label === "Sur-performance");
  const stablePerf = levelData.filter((d) => d.indicator.label === "Performance stable");
  const sousPerf = levelData.filter((d) => d.indicator.label === "Sous-performance");

  const otherUsers = users.filter(
    (u) => u.id !== user?.id && u.role === "conseiller"
  );

  return (
    <LockedFeature feature="comparaison" featureName="Comparaison N-1" featureDescription="Comparez vos résultats avec l'année précédente">
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
          onClick={() => setTab("temporel")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "temporel"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Performance vs Niveau
        </button>
        <button
          onClick={() => setTab("dpi")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "dpi"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison DPI
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

      {/* ========== PERFORMANCE VS NIVEAU ========== */}
      {tab === "temporel" && (
        <div className="space-y-6">
          {/* Level indicator */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="text-2xl">
              {category === "debutant" ? "🌱" : category === "confirme" ? "💼" : "🏆"}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Performance évaluée selon le niveau</p>
              <p className="font-semibold text-foreground">
                {CATEGORY_LABELS[category]}
              </p>
            </div>
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
              Ma performance vs objectif {CATEGORY_LABELS[category]} (% de l&apos;objectif)
            </h3>
            <BarChart
              data={levelChartData}
              xKey="name"
              bars={[
                {
                  dataKey: "Ma performance",
                  color: NXT_COLORS.green,
                  name: "Ma performance",
                },
                {
                  dataKey: "Objectif",
                  color: NXT_COLORS.violet,
                  name: "Objectif",
                },
              ]}
              height={300}
            />
            <div className="mt-3 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">
                  Ma performance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-indigo-500" />
                <span className="text-sm text-muted-foreground">
                  Objectif {CATEGORY_LABELS[category]}
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
              {levelData.map((d) => (
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
                            Ma valeur
                          </p>
                          <p className="text-xl font-bold text-foreground">
                            {d.isPercentage ? `${Math.round(d.value)}%` : d.value.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-muted-foreground">/</div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Objectif
                          </p>
                          <p className="text-lg font-semibold text-muted-foreground">
                            {d.isPercentage ? `${Math.round(d.threshold)}%` : d.threshold.toFixed(1)}
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
                        {d.indicator.pct}
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
                  <p className="text-xs text-muted-foreground">Atteint ou dépasse l&apos;objectif {CATEGORY_LABELS[category]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏊‍♂️</span>
                <div>
                  <p className="text-sm font-medium text-blue-500">Performance stable</p>
                  <p className="text-xs text-muted-foreground">Proche de l&apos;objectif (70-100%)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🐟</span>
                <div>
                  <p className="text-sm font-medium text-red-500">Sous-performance</p>
                  <p className="text-xs text-muted-foreground">En dessous de 70% de l&apos;objectif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== COMPARAISON DPI ========== */}
      {tab === "dpi" && (
        <DPIComparisonView />
      )}
    </div>
    </LockedFeature>
  );
}
