"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  FileCheck,
  FileSignature,
  Gauge,
  AlertTriangle,
  XCircle,
  Users,
  TrendingUp,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";
import { mockTeamStats } from "@/data/mock-team";
import { mockMonthlyCA } from "@/data/mock-results";
import { useAllResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { mockUsers } from "@/data/mock-users";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";

/* ────── Period types ────── */
type PeriodMode = "semaine" | "mois" | "annee" | "personnalise";

const periodButtons: { id: PeriodMode; label: string }[] = [
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "annee", label: "Année" },
  { id: "personnalise", label: "Période" },
];

function getPeriodLabel(mode: PeriodMode, dateFrom: string, dateTo: string): string {
  const now = new Date();
  switch (mode) {
    case "semaine": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `Semaine du ${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
    }
    case "mois":
      return now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    case "annee":
      return `Année ${now.getFullYear()}`;
    case "personnalise":
      if (dateFrom && dateTo) {
        return `Du ${new Date(dateFrom).toLocaleDateString("fr-FR")} au ${new Date(dateTo).toLocaleDateString("fr-FR")}`;
      }
      return "Sélectionnez une période";
  }
}

export default function CockpitPage() {
  const stats = mockTeamStats;
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const conseillers = mockUsers.filter((u) => u.role === "conseiller");

  /* ── Period state ── */
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mois");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Multiplier to simulate period scaling (mock data is monthly)
  const periodMultiplier = useMemo(() => {
    switch (periodMode) {
      case "semaine": return 0.25;
      case "mois": return 1;
      case "annee": return 12;
      case "personnalise": {
        if (!dateFrom || !dateTo) return 1;
        const diff = Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return diff;
      }
    }
  }, [periodMode, dateFrom, dateTo]);

  /* ── Compute team data ── */
  const teamData = useMemo(() => {
    let totalCA = 0;
    let totalActes = 0;
    let totalMandats = 0;
    let totalExclusifs = 0;
    let totalEstimations = 0;
    let totalPerformance = 0;
    let totalCompromisCA = 0;
    let advisorCount = 0;

    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      advisorCount++;
      totalCA += results.ventes.chiffreAffaires;
      totalActes += results.ventes.actesSignes;
      totalMandats += results.vendeurs.mandats.length;
      totalExclusifs += results.vendeurs.mandats.filter(
        (m) => m.type === "exclusif"
      ).length;
      totalEstimations += results.vendeurs.estimationsRealisees;
      // CA compromis = approximate from compromis signed × avg value
      totalCompromisCA += results.acheteurs.compromisSignes * (results.ventes.actesSignes > 0 ? results.ventes.chiffreAffaires / results.ventes.actesSignes : 8000);
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      if (ratios.length > 0) {
        totalPerformance +=
          ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length;
      }
    }

    const avgExclusivite =
      totalMandats > 0 ? Math.round((totalExclusifs / totalMandats) * 100) : 0;
    const avgPerformance =
      advisorCount > 0 ? Math.round(totalPerformance / advisorCount) : 0;

    return {
      totalCA: Math.round(totalCA * periodMultiplier),
      totalActes: Math.round(totalActes * periodMultiplier),
      avgExclusivite,
      avgPerformance,
      advisorCount,
      totalMandats: Math.round(totalMandats * periodMultiplier),
      totalEstimations: Math.round(totalEstimations * periodMultiplier),
      totalCompromisCA: Math.round(totalCompromisCA * periodMultiplier),
    };
  }, [allResults, conseillers, ratioConfigs, periodMultiplier]);

  // Monthly evolution data (team-wide)
  const teamMonthlyCA = mockMonthlyCA.map((d) => ({
    ...d,
    ca: d.ca * conseillers.length,
  }));

  // Per-advisor performance for bar chart
  const advisorPerfData = conseillers.map((user) => {
    const results = allResults.find((r) => r.userId === user.id);
    const ratios = results
      ? computeAllRatios(results, user.category, ratioConfigs)
      : [];
    const avgPerf =
      ratios.length > 0
        ? Math.round(
            ratios.reduce((s, r) => s + r.percentageOfTarget, 0) /
              ratios.length
          )
        : 0;
    return {
      name: `${user.firstName[0]}. ${user.lastName}`,
      performance: avgPerf,
      ca: results?.ventes.chiffreAffaires ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Cockpit Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Vue synthétique de la performance de votre équipe
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {teamData.advisorCount} conseillers
          </span>
        </div>
      </div>

      {/* ── Period Selector ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {periodButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPeriodMode(btn.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  periodMode === btn.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {btn.id === "personnalise" && <Calendar className="h-3.5 w-3.5" />}
                {btn.label}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {getPeriodLabel(periodMode, dateFrom, dateTo)}
          </p>
        </div>

        {/* Custom date range picker */}
        {periodMode === "personnalise" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Estimations"
          value={teamData.totalEstimations}
          icon={ClipboardCheck}
          status="ok"
        />
        <KpiCard
          title="Mandats"
          value={teamData.totalMandats}
          icon={FileSignature}
          status="ok"
        />
        <KpiCard
          title="% Exclusivité"
          value={`${teamData.avgExclusivite}%`}
          icon={FileSignature}
          status={teamData.avgExclusivite >= 50 ? "ok" : "warning"}
        />
        <KpiCard
          title="CA Compromis"
          value={formatCurrency(teamData.totalCompromisCA)}
          icon={DollarSign}
          status="ok"
        />
        <KpiCard
          title="CA Acte Authentique"
          value={formatCurrency(teamData.totalCA)}
          icon={FileCheck}
          status="ok"
        />
        <KpiCard
          title="Performance équipe"
          value={`${teamData.avgPerformance}%`}
          icon={Gauge}
          status={
            teamData.avgPerformance >= 80
              ? "ok"
              : teamData.avgPerformance >= 60
                ? "warning"
                : "danger"
          }
        />
      </div>

      {/* Alerts - max 3 */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertes prioritaires
        </h2>
        {stats.alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              alert.type === "danger"
                ? "border-red-500/30 bg-red-500/5"
                : "border-orange-500/30 bg-orange-500/5"
            )}
          >
            {alert.type === "danger" ? (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            )}
            <p className="text-sm text-foreground">{alert.message}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution CA Équipe (mensuel)
          </h3>
          <LineChart
            data={teamMonthlyCA}
            xKey="month"
            lines={[
              { dataKey: "ca", color: "#22c55e", name: "CA Équipe (€)" },
            ]}
            height={220}
            showGrid
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Gauge className="h-4 w-4 text-primary" />
            Performance par conseiller
          </h3>
          <BarChart
            data={advisorPerfData}
            xKey="name"
            bars={[
              {
                dataKey: "performance",
                color: "#22c55e",
                name: "Performance (%)",
              },
            ]}
            height={220}
          />
        </div>
      </div>

      {/* Team Summary Grid */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-foreground">
          Résumé de l&apos;équipe
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Conseillers actifs</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {teamData.advisorCount}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">CA moyen/conseiller</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {formatCurrency(
                teamData.advisorCount > 0
                  ? Math.round(teamData.totalCA / teamData.advisorCount)
                  : 0
              )}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Mandats totaux</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {teamData.totalMandats}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Actes moyen/conseiller
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {teamData.advisorCount > 0
                ? (teamData.totalActes / teamData.advisorCount).toFixed(1)
                : "0"}
            </p>
          </div>
        </div>

        {/* Quick advisor list */}
        <div className="mt-4 space-y-2">
          {conseillers.map((user) => {
            const results = allResults.find((r) => r.userId === user.id);
            const ratios = results
              ? computeAllRatios(results, user.category, ratioConfigs)
              : [];
            const avgPerf =
              ratios.length > 0
                ? Math.round(
                    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) /
                      ratios.length
                  )
                : 0;
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-lg bg-muted/30 p-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    CATEGORY_COLORS[user.category]
                  )}
                >
                  {CATEGORY_LABELS[user.category]}
                </span>
                <div className="w-24">
                  <ProgressBar
                    value={avgPerf}
                    status={
                      avgPerf >= 80
                        ? "ok"
                        : avgPerf >= 60
                          ? "warning"
                          : "danger"
                    }
                    showValue={false}
                    size="sm"
                  />
                </div>
                <span
                  className={cn(
                    "text-sm font-bold w-12 text-right",
                    avgPerf >= 80
                      ? "text-green-500"
                      : avgPerf >= 60
                        ? "text-orange-500"
                        : "text-red-500"
                  )}
                >
                  {avgPerf}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
