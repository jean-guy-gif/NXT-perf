"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  FileSignature,
  Handshake,
  DollarSign,
  TrendingUp,
  Clock,
  Star,
  StarOff,
  Eye,
  FileText,
  Gauge,
  Phone,
  X,
  Archive,
  CheckCircle2,
  XCircle,
  Info,
  Flame,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressBar } from "@/components/charts/progress-bar";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS, NXT_COLORS } from "@/lib/constants";
import {
  mockMonthlyCA,
  mockWeeklyActivity,
  mockMonthlyEstimations,
  mockMonthlyMandats,
  mockMonthlyCompromis,
  mockMonthlyCAAnnuel,
} from "@/data/mock-results";
import { useAppStore, type RemovedItem } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { RatioId } from "@/types/ratios";

type DashboardTab = "overview" | "favoris" | "mois" | "suivi";

// Widgets que le conseiller peut ajouter/retirer de ses favoris
type WidgetId =
  | "kpi_estimations"
  | "kpi_mandats"
  | "kpi_compromis"
  | "kpi_ca"
  | "donut_mandats"
  | "stats_ca"
  | "stats_exclusivite"
  | "chart_evolution"
  | "chart_activite"
  | "profil"
  | "performance";

interface WidgetConfig {
  id: WidgetId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  zone: "kpi" | "left" | "right";
}

const allWidgets: WidgetConfig[] = [
  { id: "kpi_estimations", label: "Estimations réalisées", icon: ClipboardCheck, zone: "kpi" },
  { id: "kpi_mandats", label: "Mandats signés", icon: FileSignature, zone: "kpi" },
  { id: "kpi_compromis", label: "Compromis signés", icon: Handshake, zone: "kpi" },
  { id: "kpi_ca", label: "Chiffre d'affaires", icon: DollarSign, zone: "kpi" },
  { id: "donut_mandats", label: "Répartition mandats", icon: FileSignature, zone: "left" },
  { id: "stats_ca", label: "CA Mensuel", icon: DollarSign, zone: "left" },
  { id: "stats_exclusivite", label: "Taux exclusivité", icon: FileSignature, zone: "left" },
  { id: "chart_evolution", label: "Évolution CA", icon: TrendingUp, zone: "left" },
  { id: "chart_activite", label: "Activité hebdomadaire", icon: Eye, zone: "right" },
  { id: "profil", label: "Mon profil", icon: Star, zone: "right" },
  { id: "performance", label: "Performance globale", icon: Gauge, zone: "right" },
];

// KPI expansion config for monthly progression charts
type ExpandableKpi = "estimations" | "mandats" | "compromis" | "ca";

interface KpiChartConfig {
  title: string;
  data: Array<{ month: string; value: number }>;
  color: string;
  valueLabel: string;
  isCurrency?: boolean;
}

const kpiChartConfigs: Record<ExpandableKpi, KpiChartConfig> = {
  estimations: {
    title: "Progression des Estimations — Mois par mois",
    data: mockMonthlyEstimations,
    color: NXT_COLORS.green,
    valueLabel: "Estimations",
  },
  mandats: {
    title: "Progression des Mandats signés — Mois par mois",
    data: mockMonthlyMandats,
    color: NXT_COLORS.blue,
    valueLabel: "Mandats",
  },
  compromis: {
    title: "Progression des Compromis signés — Mois par mois",
    data: mockMonthlyCompromis,
    color: NXT_COLORS.orange,
    valueLabel: "Compromis",
  },
  ca: {
    title: "Progression du Chiffre d'affaires — Mois par mois",
    data: mockMonthlyCAAnnuel,
    color: NXT_COLORS.green,
    valueLabel: "CA (€)",
    isCurrency: true,
  },
};

const defaultFavorites: WidgetId[] = [
  "kpi_estimations",
  "kpi_mandats",
  "kpi_compromis",
  "kpi_ca",
  "donut_mandats",
  "stats_ca",
  "stats_exclusivite",
  "chart_evolution",
  "chart_activite",
  "profil",
  "performance",
];

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user } = useUser();
  const results = useResults();
  const { computedRatios, ratioConfigs } = useRatios();
  const removedItems = useAppStore((s) => s.removedItems);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [favorites, setFavorites] = useState<WidgetId[]>(defaultFavorites);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [expandedKpi, setExpandedKpi] = useState<ExpandableKpi | null>(null);

  // Allow navigation via ?tab=suivi (from notifications, etc.)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "suivi" || tab === "favoris" || tab === "mois" || tab === "overview") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (!user || !results) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const { prospection, vendeurs, acheteurs, ventes } = results;

  const mandatData = [
    {
      name: "Exclusifs",
      value: vendeurs.mandats.filter((m) => m.type === "exclusif").length,
      color: NXT_COLORS.green,
    },
    {
      name: "Simples",
      value: vendeurs.mandats.filter((m) => m.type === "simple").length,
      color: NXT_COLORS.yellow,
    },
  ];

  const overallPerformance =
    computedRatios.length > 0
      ? Math.round(
          computedRatios.reduce((acc, r) => acc + r.percentageOfTarget, 0) /
            computedRatios.length
        )
      : 0;

  const exclusiviteRate =
    vendeurs.mandats.length > 0
      ? Math.round(
          (vendeurs.mandats.filter((m) => m.type === "exclusif").length /
            vendeurs.mandats.length) *
            100
        )
      : 0;

  const isVisible = (id: WidgetId) => favorites.includes(id);

  const toggleFavorite = (id: WidgetId) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // For "Ce mois" tab: compute current month data
  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  // Projected values based on current pace
  const projectedCA =
    currentDay > 0
      ? Math.round((ventes.chiffreAffaires / currentDay) * daysInMonth)
      : 0;
  const projectedActes =
    currentDay > 0
      ? Math.round(((ventes.actesSignes / currentDay) * daysInMonth) * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Top navigation tabs */}
      <div className="flex items-center gap-6 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
            activeTab === "overview"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Vue d&apos;ensemble
        </button>
        <button
          onClick={() => setActiveTab("favoris")}
          className={cn(
            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
            activeTab === "favoris"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className="h-4 w-4" />
          Favoris
        </button>
        <button
          onClick={() => setActiveTab("mois")}
          className={cn(
            "flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
            activeTab === "mois"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="h-4 w-4" />
          Ce mois
        </button>
        <button
          onClick={() => setActiveTab("suivi")}
          className={cn(
            "relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
            activeTab === "suivi"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Archive className="h-4 w-4" />
          Suivi contacts
          {removedItems.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {removedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ========== KPI EXPANSION PANEL ========== */}
      {expandedKpi && (
        <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {kpiChartConfigs[expandedKpi].title}
            </h3>
            <button
              onClick={() => setExpandedKpi(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <BarChart
            data={kpiChartConfigs[expandedKpi].data}
            xKey="month"
            bars={[
              {
                dataKey: "value",
                color: kpiChartConfigs[expandedKpi].color,
                name: kpiChartConfigs[expandedKpi].valueLabel,
              },
            ]}
            height={300}
          />
          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Moyenne 12 mois</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {kpiChartConfigs[expandedKpi].isCurrency
                  ? formatCurrency(
                      Math.round(
                        kpiChartConfigs[expandedKpi].data.reduce((s, d) => s + d.value, 0) /
                          kpiChartConfigs[expandedKpi].data.length
                      )
                    )
                  : (
                      kpiChartConfigs[expandedKpi].data.reduce((s, d) => s + d.value, 0) /
                      kpiChartConfigs[expandedKpi].data.length
                    ).toFixed(1)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Maximum</p>
              <p className="mt-1 text-lg font-bold text-green-500">
                {kpiChartConfigs[expandedKpi].isCurrency
                  ? formatCurrency(
                      Math.max(...kpiChartConfigs[expandedKpi].data.map((d) => d.value))
                    )
                  : Math.max(...kpiChartConfigs[expandedKpi].data.map((d) => d.value))}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Mois en cours</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {kpiChartConfigs[expandedKpi].isCurrency
                  ? formatCurrency(
                      kpiChartConfigs[expandedKpi].data[kpiChartConfigs[expandedKpi].data.length - 1].value
                    )
                  : kpiChartConfigs[expandedKpi].data[kpiChartConfigs[expandedKpi].data.length - 1].value}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: VUE D'ENSEMBLE ========== */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Estimations réalisées"
              value={vendeurs.estimationsRealisees}
              trend={{ value: 12.5, isPositive: true }}
              icon={ClipboardCheck}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "estimations" ? null : "estimations")}
            />
            <KpiCard
              title="Mandats signés"
              value={vendeurs.mandatsSignes}
              trend={{ value: 8.3, isPositive: true }}
              icon={FileSignature}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "mandats" ? null : "mandats")}
            />
            <KpiCard
              title="Compromis signés"
              value={acheteurs.compromisSignes}
              trend={{ value: 4.5, isPositive: true }}
              icon={Handshake}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "compromis" ? null : "compromis")}
            />
            <KpiCard
              title="Chiffre d'affaires"
              value={formatCurrency(ventes.chiffreAffaires)}
              trend={{ value: 15.2, isPositive: true }}
              icon={DollarSign}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "ca" ? null : "ca")}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Donut */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Répartition des mandats
                  </h3>
                  <DonutChart
                    data={mandatData}
                    centerValue={`${vendeurs.mandatsSignes}`}
                    centerLabel="Mandats"
                    height={220}
                  />
                  <div className="mt-3 flex justify-center gap-4">
                    {mandatData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {d.name}: {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats cards */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          CA Mensuel
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(ventes.chiffreAffaires)}
                        </p>
                      </div>
                      <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                        +4,5%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                        <FileSignature className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Taux d&apos;exclusivité
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {exclusiviteRate}%
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={exclusiviteRate}
                      status="ok"
                      size="sm"
                      showValue={false}
                      className="mt-3"
                    />
                  </div>

                </div>
              </div>

              {/* Evolution CA */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 font-semibold text-foreground">
                  Évolution du CA
                </h3>
                <LineChart
                  data={mockMonthlyCA}
                  xKey="month"
                  lines={[
                    { dataKey: "ca", color: NXT_COLORS.green, name: "CA (€)" },
                  ]}
                  height={200}
                  showGrid
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Profile */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dernière activité : aujourd&apos;hui
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      CATEGORY_COLORS[user.category]
                    )}
                  >
                    {CATEGORY_LABELS[user.category]}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">+4,5%</span> Gagné
                    </p>
                    <p className="mt-1 text-lg font-bold text-green-500">
                      {formatCurrency(ventes.chiffreAffaires)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500">Objectif</span>
                    </p>
                    <p className="mt-1 text-lg font-bold text-red-500">
                      {formatCurrency(120000)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 font-semibold text-foreground">
                  Activité hebdomadaire
                </h3>
                <LineChart
                  data={mockWeeklyActivity}
                  xKey="day"
                  lines={[
                    { dataKey: "contacts", color: NXT_COLORS.green, name: "Contacts" },
                    { dataKey: "visites", color: NXT_COLORS.yellow, name: "Visites" },
                  ]}
                  height={180}
                />
                <div className="mt-3 flex justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      Contacts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-xs text-muted-foreground">
                      Visites
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 font-semibold text-foreground">
                  Performance globale
                </h3>
                <div className="mb-2 text-center">
                  <span className="text-3xl font-bold text-primary">
                    {overallPerformance}%
                  </span>
                  <p className="text-xs text-muted-foreground">
                    de vos objectifs
                  </p>
                </div>
                <ProgressBar
                  value={overallPerformance}
                  status={
                    overallPerformance >= 80
                      ? "ok"
                      : overallPerformance >= 60
                        ? "warning"
                        : "danger"
                  }
                  showValue={false}
                  size="lg"
                />
                <div className="mt-4 space-y-2">
                  {computedRatios.slice(0, 4).map((ratio) => {
                    const config = ratioConfigs[ratio.ratioId as RatioId];
                    return (
                      <div
                        key={ratio.ratioId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground truncate mr-2">
                          {config?.name ?? ratio.ratioId}
                        </span>
                        <span
                          className={cn(
                            "font-medium shrink-0",
                            ratio.status === "ok"
                              ? "text-green-500"
                              : ratio.status === "warning"
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {ratio.percentageOfTarget}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== TAB: FAVORIS ========== */}
      {activeTab === "favoris" && (
        <div className="space-y-6">
          {/* Edit toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {editingFavorites
                ? "Cliquez sur les widgets pour les ajouter ou retirer"
                : "Votre tableau de bord personnalisé"}
            </p>
            <button
              onClick={() => setEditingFavorites(!editingFavorites)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                editingFavorites
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              {editingFavorites ? (
                <>
                  <Star className="h-4 w-4" />
                  Terminer
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Personnaliser
                </>
              )}
            </button>
          </div>

          {/* Editing mode: widget picker */}
          {editingFavorites && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Sélectionnez vos widgets ({favorites.length}/{allWidgets.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {allWidgets.map((w) => {
                  const active = favorites.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleFavorite(w.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                        active
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted"
                      )}
                    >
                      {active ? (
                        <Star className="h-4 w-4 shrink-0 text-primary fill-primary" />
                      ) : (
                        <StarOff className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorite KPIs */}
          {(isVisible("kpi_estimations") ||
            isVisible("kpi_mandats") ||
            isVisible("kpi_compromis") ||
            isVisible("kpi_ca")) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isVisible("kpi_estimations") && (
                <KpiCard
                  title="Estimations réalisées"
                  value={vendeurs.estimationsRealisees}
                  icon={ClipboardCheck}
                  status="ok"
                  onExpand={() => setExpandedKpi(expandedKpi === "estimations" ? null : "estimations")}
                />
              )}
              {isVisible("kpi_mandats") && (
                <KpiCard
                  title="Mandats signés"
                  value={vendeurs.mandatsSignes}
                  icon={FileSignature}
                  status="ok"
                  onExpand={() => setExpandedKpi(expandedKpi === "mandats" ? null : "mandats")}
                />
              )}
              {isVisible("kpi_compromis") && (
                <KpiCard
                  title="Compromis signés"
                  value={acheteurs.compromisSignes}
                  icon={Handshake}
                  status="ok"
                  onExpand={() => setExpandedKpi(expandedKpi === "compromis" ? null : "compromis")}
                />
              )}
              {isVisible("kpi_ca") && (
                <KpiCard
                  title="Chiffre d'affaires"
                  value={formatCurrency(ventes.chiffreAffaires)}
                  icon={DollarSign}
                  status="ok"
                  onExpand={() => setExpandedKpi(expandedKpi === "ca" ? null : "ca")}
                />
              )}
            </div>
          )}

          {/* Favorite widgets grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {isVisible("donut_mandats") && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Répartition des mandats
                  </h3>
                  <DonutChart
                    data={mandatData}
                    centerValue={`${vendeurs.mandatsSignes}`}
                    centerLabel="Mandats"
                    height={220}
                  />
                  <div className="mt-3 flex justify-center gap-4">
                    {mandatData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {d.name}: {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isVisible("chart_evolution") && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Évolution du CA
                  </h3>
                  <LineChart
                    data={mockMonthlyCA}
                    xKey="month"
                    lines={[
                      { dataKey: "ca", color: NXT_COLORS.green, name: "CA (€)" },
                    ]}
                    height={200}
                    showGrid
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {isVisible("stats_ca") && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CA</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(ventes.chiffreAffaires)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {isVisible("stats_exclusivite") && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                        <FileSignature className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Exclusivité
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {exclusiviteRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {isVisible("chart_activite") && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Activité hebdomadaire
                  </h3>
                  <LineChart
                    data={mockWeeklyActivity}
                    xKey="day"
                    lines={[
                      {
                        dataKey: "contacts",
                        color: NXT_COLORS.green,
                        name: "Contacts",
                      },
                      {
                        dataKey: "visites",
                        color: NXT_COLORS.yellow,
                        name: "Visites",
                      },
                    ]}
                    height={180}
                  />
                </div>
              )}

              {isVisible("performance") && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-4 font-semibold text-foreground">
                    Performance globale
                  </h3>
                  <div className="mb-2 text-center">
                    <span className="text-3xl font-bold text-primary">
                      {overallPerformance}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      de vos objectifs
                    </p>
                  </div>
                  <ProgressBar
                    value={overallPerformance}
                    status={
                      overallPerformance >= 80
                        ? "ok"
                        : overallPerformance >= 60
                          ? "warning"
                          : "danger"
                    }
                    showValue={false}
                    size="lg"
                  />
                </div>
              )}
            </div>
          </div>

          {favorites.length === 0 && !editingFavorites && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <StarOff className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucun widget sélectionné. Cliquez sur{" "}
                <strong>Personnaliser</strong> pour composer votre tableau de
                bord.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: CE MOIS ========== */}
      {activeTab === "mois" && (
        <div className="space-y-6">
          {/* Month header */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold capitalize text-foreground">
                  {currentMonthLabel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Jour {currentDay}/{daysInMonth} — {monthProgressPct}% du mois
                  écoulé
                </p>
              </div>
              <div className="w-48">
                <ProgressBar
                  value={monthProgressPct}
                  status="ok"
                  showValue
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* Monthly KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Estimations ce mois"
              value={vendeurs.estimationsRealisees}
              icon={ClipboardCheck}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "estimations" ? null : "estimations")}
            />
            <KpiCard
              title="Mandats ce mois"
              value={vendeurs.mandatsSignes}
              icon={FileSignature}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "mandats" ? null : "mandats")}
            />
            <KpiCard
              title="Compromis ce mois"
              value={acheteurs.compromisSignes}
              icon={Handshake}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "compromis" ? null : "compromis")}
            />
            <KpiCard
              title="CA ce mois"
              value={formatCurrency(ventes.chiffreAffaires)}
              icon={DollarSign}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "ca" ? null : "ca")}
            />
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Monthly numbers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Activité du mois
              </h3>

              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {[
                  {
                    label: "Contacts entrants",
                    value: prospection.contactsEntrants,
                    icon: Phone,
                  },
                  {
                    label: "Contacts totaux",
                    value: prospection.contactsTotaux,
                    icon: Phone,
                  },
                  {
                    label: "RDV Estimation",
                    value: prospection.rdvEstimation,
                    icon: ClipboardCheck,
                  },
                  {
                    label: "Estimations réalisées",
                    value: vendeurs.estimationsRealisees,
                    icon: ClipboardCheck,
                  },
                  {
                    label: "Mandats signés",
                    value: vendeurs.mandatsSignes,
                    icon: FileSignature,
                  },
                  {
                    label: "Visites réalisées",
                    value: acheteurs.nombreVisites,
                    icon: Eye,
                  },
                  {
                    label: "Offres reçues",
                    value: acheteurs.offresRecues,
                    icon: FileText,
                  },
                  {
                    label: "Compromis signés",
                    value: acheteurs.compromisSignes,
                    icon: Handshake,
                  },
                  {
                    label: "Actes signés",
                    value: ventes.actesSignes,
                    icon: DollarSign,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Projections */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Projections fin de mois
              </h3>

              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">CA projeté</p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {formatCurrency(projectedCA)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basé sur le rythme actuel ({formatCurrency(ventes.chiffreAffaires)}{" "}
                  en {currentDay} jours)
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">Actes projetés</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {projectedActes}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Basé sur {ventes.actesSignes} acte(s) en {currentDay} jours
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">
                  Performance globale
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-bold",
                    overallPerformance >= 80
                      ? "text-green-500"
                      : overallPerformance >= 60
                        ? "text-orange-500"
                        : "text-red-500"
                  )}
                >
                  {overallPerformance}%
                </p>
                <ProgressBar
                  value={overallPerformance}
                  status={
                    overallPerformance >= 80
                      ? "ok"
                      : overallPerformance >= 60
                        ? "warning"
                        : "danger"
                  }
                  showValue={false}
                  size="sm"
                  className="mt-2"
                />
              </div>

              {/* Mandats breakdown */}
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Mandats du mois
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exclusifs</span>
                      <span className="font-bold text-green-500">
                        {vendeurs.mandats.filter((m) => m.type === "exclusif").length}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Simples</span>
                      <span className="font-bold text-yellow-500">
                        {vendeurs.mandats.filter((m) => m.type === "simple").length}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {exclusiviteRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">exclusivité</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB: SUIVI CONTACTS ========== */}
      {activeTab === "suivi" && (
        <SuiviContactsPanel removedItems={removedItems} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Suivi Contacts Panel                                               */
/* ------------------------------------------------------------------ */

function SuiviContactsPanel({ removedItems }: { removedItems: RemovedItem[] }) {
  const [filter, setFilter] = useState<"all" | "deale" | "abandonne">("all");

  const infoVente = removedItems.filter((i) => i.type === "info_vente");
  const acheteursChauds = removedItems.filter((i) => i.type === "acheteur_chaud");

  const totalDeale = removedItems.filter((i) => i.reason === "deale").length;
  const totalAbandonne = removedItems.filter((i) => i.reason === "abandonne").length;

  const filterItems = (items: RemovedItem[]) =>
    filter === "all" ? items : items.filter((i) => i.reason === filter);

  const filteredInfoVente = filterItems(infoVente);
  const filteredAcheteurs = filterItems(acheteursChauds);

  if (removedItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <Archive className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun contact traité pour le moment.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supprimez des informations de vente ou des acheteurs chauds depuis{" "}
          <strong>Mes Résultats</strong> pour les retrouver ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total traités</p>
              <p className="text-2xl font-bold text-foreground">
                {removedItems.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dealés</p>
              <p className="text-2xl font-bold text-green-500">{totalDeale}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abandonnés</p>
              <p className="text-2xl font-bold text-red-500">
                {totalAbandonne}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(
          [
            { id: "all", label: "Tous" },
            { id: "deale", label: "Dealés" },
            { id: "abandonne", label: "Abandonnés" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              filter === f.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Informations de vente */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Informations de vente
          </h3>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
            {filteredInfoVente.length}
          </span>
        </div>

        {filteredInfoVente.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Aucune information de vente{" "}
            {filter !== "all"
              ? filter === "deale"
                ? "dealée"
                : "abandonnée"
              : ""}{" "}
            pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredInfoVente.map((item) => (
              <RemovedItemCard key={item.id + item.removedAt} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Acheteurs chauds */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Acheteurs chauds
          </h3>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
            {filteredAcheteurs.length}
          </span>
        </div>

        {filteredAcheteurs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Aucun acheteur chaud{" "}
            {filter !== "all"
              ? filter === "deale"
                ? "dealé"
                : "abandonné"
              : ""}{" "}
            pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredAcheteurs.map((item) => (
              <RemovedItemCard key={item.id + item.removedAt} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RemovedItemCard({ item }: { item: RemovedItem }) {
  const isDeale = item.reason === "deale";
  const date = new Date(item.removedAt);
  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isDeale
          ? "border-green-500/30 bg-green-500/5"
          : "border-red-500/30 bg-red-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{item.nom}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.commentaire}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            isDeale
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-red-500/15 text-red-600 dark:text-red-400"
          )}
        >
          {isDeale ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {isDeale ? "Dealé" : "Abandonné"}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{dateStr}</p>
    </div>
  );
}
