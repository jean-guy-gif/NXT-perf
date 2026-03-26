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
  ExternalLink,
  Check,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressBar } from "@/components/charts/progress-bar";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useYTDResults } from "@/hooks/use-ytd-results";
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

const emptyMonthlyData: Array<{ month: string; value: number }> = [];
const emptyCAData: Array<{ month: string; ca: number }> = [];
const emptyActivityData: Array<{ day: string; contacts: number; visites: number }> = [];
import { useAppStore } from "@/stores/app-store";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { cn } from "@/lib/utils";
import type { RatioId } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { generateFormationDiagnostic } from "@/lib/formation";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { useAllResults } from "@/hooks/use-results";
import { DPIEvolutionCard } from "@/components/dpi/dpi-evolution-card";
import { DPIProjectionsCard } from "@/components/dpi/dpi-projections-card";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";
import { initDemoDPISnapshot } from "@/lib/demo-dpi-init";

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

function getKpiChartConfigs(isDemo: boolean): Record<ExpandableKpi, KpiChartConfig> {
  return {
    estimations: {
      title: "Progression des Estimations — Mois par mois",
      data: isDemo ? mockMonthlyEstimations : emptyMonthlyData,
      color: NXT_COLORS.green,
      valueLabel: "Estimations",
    },
    mandats: {
      title: "Progression des Mandats signés — Mois par mois",
      data: isDemo ? mockMonthlyMandats : emptyMonthlyData,
      color: NXT_COLORS.blue,
      valueLabel: "Mandats",
    },
    compromis: {
      title: "Progression des Compromis signés — Mois par mois",
      data: isDemo ? mockMonthlyCompromis : emptyMonthlyData,
      color: NXT_COLORS.orange,
      valueLabel: "Compromis",
    },
    ca: {
      title: "Progression du Chiffre d'affaires — Mois par mois",
      data: isDemo ? mockMonthlyCAAnnuel : emptyMonthlyData,
      color: NXT_COLORS.green,
      valueLabel: "CA (€)",
      isCurrency: true,
    },
  };
}

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
  const ytdResults = useYTDResults();
  const { computedRatios, ratioConfigs } = useRatios();
  const isDemo = useAppStore((s) => s.isDemo);
  const { currentAxes: dpiAxes, currentGlobalScore: dpiScore } = useDPIEvolution();
  const activeTools = useAppStore((s) => s.activeTools);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = usePersistedState<DashboardTab>(
    "nxt-dashboard-tab",
    "overview"
  );
  const [favorites, setFavorites] = usePersistedState<WidgetId[]>(
    "nxt-dashboard-favorites",
    defaultFavorites
  );
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [expandedKpi, setExpandedKpi] = useState<ExpandableKpi | null>(null);

  const diagnostic = user
    ? generateFormationDiagnostic(computedRatios, ratioConfigs, user.id)
    : null;

  const allResultsData = useAllResults();
  const previousResults = useMemo(() => {
    if (!user) return null;
    const userResults = allResultsData
      .filter((r) => r.userId === user.id)
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
    return userResults.length >= 2 ? userResults[1] : null;
  }, [allResultsData, user]);

  const kpiChartConfigs = useMemo(() => getKpiChartConfigs(isDemo), [isDemo]);
  const monthlyCAData = isDemo ? mockMonthlyCA : emptyCAData;
  const weeklyActivityData = isDemo ? mockWeeklyActivity : emptyActivityData;

  const treatedCount = useMemo(() => {
    if (!results) return 0;
    const infoTraites = results.prospection.informationsVente.filter((i) => i.statut !== "en_cours").length;
    const achetTraites = results.acheteurs.acheteursChauds.filter((i) => i.statut !== "en_cours").length;
    return infoTraites + achetTraites;
  }, [results]);

  // Allow navigation via ?tab=suivi (from notifications, etc.)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "suivi" || tab === "favoris" || tab === "mois" || tab === "overview") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Init DPI demo snapshot
  useEffect(() => {
    if (isDemo && user?.id) {
      initDemoDPISnapshot(user.id);
    }
  }, [isDemo, user?.id]);

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

  // ── YTD (year-to-date) data for Vue d'ensemble ──
  const ytd = ytdResults ?? results;
  const ytdVendeurs = ytd.vendeurs;
  const ytdAcheteurs = ytd.acheteurs;
  const ytdVentes = ytd.ventes;

  const ytdMandatData = [
    {
      name: "Exclusifs",
      value: ytdVendeurs.mandats.filter((m) => m.type === "exclusif").length,
      color: NXT_COLORS.green,
    },
    {
      name: "Simples",
      value: ytdVendeurs.mandats.filter((m) => m.type === "simple").length,
      color: NXT_COLORS.yellow,
    },
  ];

  const ytdExclusiviteRate =
    ytdVendeurs.mandats.length > 0
      ? Math.round(
          (ytdVendeurs.mandats.filter((m) => m.type === "exclusif").length /
            ytdVendeurs.mandats.length) *
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
          {treatedCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {treatedCount}
            </span>
          )}
        </button>
      </div>

      {/* ========== RECOMMANDATION BANNER ========== */}
      {diagnostic && diagnostic.recommendations.length > 0 && (
        <RecommandationBanner
          recommendations={diagnostic.recommendations}
          ratioConfigs={ratioConfigs}
          maxItems={2}
          variant="compact"
          scope="conseiller"
        />
      )}

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
          {kpiChartConfigs[expandedKpi].data.length > 0 ? (
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
          ) : (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Aucune donnée historique disponible.
            </p>
          )}
        </div>
      )}

      {/* ========== TAB: VUE D'ENSEMBLE ========== */}
      {activeTab === "overview" && (
        <>
          {/* YTD period label */}
          <p className="text-sm text-muted-foreground">
            Cumul depuis le 1er janvier {new Date().getFullYear()}
          </p>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Estimations réalisées"
              value={ytdVendeurs.estimationsRealisees}
              trend={{ value: 12.5, isPositive: true }}
              icon={ClipboardCheck}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "estimations" ? null : "estimations")}
            />
            <KpiCard
              title="Mandats signés"
              value={ytdVendeurs.mandatsSignes}
              trend={{ value: 8.3, isPositive: true }}
              icon={FileSignature}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "mandats" ? null : "mandats")}
            />
            <KpiCard
              title="Compromis signés"
              value={ytdAcheteurs.compromisSignes}
              trend={{ value: 4.5, isPositive: true }}
              icon={Handshake}
              status="ok"
              onExpand={() => setExpandedKpi(expandedKpi === "compromis" ? null : "compromis")}
            />
            <KpiCard
              title="Chiffre d'affaires"
              value={formatCurrency(ytdVentes.chiffreAffaires)}
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
                    data={ytdMandatData}
                    centerValue={`${ytdVendeurs.mandatsSignes}`}
                    centerLabel="Mandats"
                    height={220}
                  />
                  <div className="mt-3 flex justify-center gap-4">
                    {ytdMandatData.map((d) => (
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
                          CA Cumulé
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(ytdVentes.chiffreAffaires)}
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
                          {ytdExclusiviteRate}%
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={ytdExclusiviteRate}
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
                  data={monthlyCAData}
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
                      <span className="text-green-500">CA cumulé</span>
                    </p>
                    <p className="mt-1 text-lg font-bold text-green-500">
                      {formatCurrency(ytdVentes.chiffreAffaires)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-red-500">Objectif annuel</span>
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
                  data={weeklyActivityData}
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

          {/* ═══ DPI Évolution ═══ */}
          {(user?.role === "conseiller" || isDemo) && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-lg">{"\u{1F3AF}"}</span>
                <h2 className="font-semibold text-foreground">Mon Diagnostic de Performance</h2>
              </div>
              <DPIEvolutionCard />
              {dpiAxes.length > 0 && (
                <DPIProjectionsCard currentAxes={dpiAxes} currentGlobalScore={dpiScore} activeTools={activeTools} />
              )}
            </div>
          )}
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
                    data={monthlyCAData}
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
                    data={weeklyActivityData}
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
            <div className="space-y-1">
              <KpiCard
                title="Estimations ce mois"
                value={vendeurs.estimationsRealisees}
                icon={ClipboardCheck}
                status="ok"
                onExpand={() => setExpandedKpi(expandedKpi === "estimations" ? null : "estimations")}
              />
              {previousResults && (
                <TrendIndicator current={vendeurs.estimationsRealisees} previous={previousResults.vendeurs.estimationsRealisees} />
              )}
            </div>
            <div className="space-y-1">
              <KpiCard
                title="Mandats ce mois"
                value={vendeurs.mandatsSignes}
                icon={FileSignature}
                status="ok"
                onExpand={() => setExpandedKpi(expandedKpi === "mandats" ? null : "mandats")}
              />
              {previousResults && (
                <TrendIndicator current={vendeurs.mandatsSignes} previous={previousResults.vendeurs.mandatsSignes} />
              )}
            </div>
            <div className="space-y-1">
              <KpiCard
                title="Compromis ce mois"
                value={acheteurs.compromisSignes}
                icon={Handshake}
                status="ok"
                onExpand={() => setExpandedKpi(expandedKpi === "compromis" ? null : "compromis")}
              />
              {previousResults && (
                <TrendIndicator current={acheteurs.compromisSignes} previous={previousResults.acheteurs.compromisSignes} />
              )}
            </div>
            <div className="space-y-1">
              <KpiCard
                title="CA ce mois"
                value={formatCurrency(ventes.chiffreAffaires)}
                icon={DollarSign}
                status="ok"
                onExpand={() => setExpandedKpi(expandedKpi === "ca" ? null : "ca")}
              />
              {previousResults && (
                <TrendIndicator current={ventes.chiffreAffaires} previous={previousResults.ventes.chiffreAffaires} />
              )}
            </div>
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
        <SuiviContactsPanel results={results} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Suivi Contacts Panel                                               */
/* ------------------------------------------------------------------ */

function SuiviContactsPanel({ results }: { results: PeriodResults | null }) {
  const updateInfoVenteStatut = useAppStore((s) => s.updateInfoVenteStatut);
  const updateAcheteurChaudStatut = useAppStore((s) => s.updateAcheteurChaudStatut);
  const markInfoVenteProfiled = useAppStore((s) => s.markInfoVenteProfiled);
  const markAcheteurChaudProfiled = useAppStore((s) => s.markAcheteurChaudProfiled);
  const { persistResult } = useSupabaseResults();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const allInfoVente = results?.prospection.informationsVente ?? [];
  const allAcheteurs = results?.acheteurs.acheteursChauds ?? [];

  const activeInfoVente = allInfoVente.filter((i) => i.statut === "en_cours");
  const activeAcheteurs = allAcheteurs.filter((i) => i.statut === "en_cours");
  const totalActifs = activeInfoVente.length + activeAcheteurs.length;
  const totalProfiled = [...allInfoVente, ...allAcheteurs].filter((i) => i.profiled).length;

  const treatedItems = [
    ...allInfoVente.filter((i) => i.statut !== "en_cours").map((i) => ({ ...i, type: "info_vente" as const })),
    ...allAcheteurs.filter((i) => i.statut !== "en_cours").map((i) => ({ ...i, type: "acheteur_chaud" as const })),
  ];
  const totalDeale = treatedItems.filter((i) => i.statut === "deale").length;
  const totalAbandonne = treatedItems.filter((i) => i.statut === "abandonne").length;

  const handleUpdateInfo = (itemId: string, statut: "deale" | "abandonne") => {
    if (results) {
      updateInfoVenteStatut(results.id, itemId, statut);
      setConfirmingId(null);
      // Persist: read fresh result from store after state update
      setTimeout(() => {
        const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
        if (fresh) persistResult(fresh);
      }, 0);
    }
  };

  const handleUpdateAcheteur = (itemId: string, statut: "deale" | "abandonne") => {
    if (results) {
      updateAcheteurChaudStatut(results.id, itemId, statut);
      setConfirmingId(null);
      setTimeout(() => {
        const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
        if (fresh) persistResult(fresh);
      }, 0);
    }
  };

  const handleProfileInfo = (itemId: string) => {
    if (results) {
      markInfoVenteProfiled(results.id, itemId);
      setTimeout(() => {
        const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
        if (fresh) persistResult(fresh);
      }, 0);
      window.open("https://nxt-profiling.fr/profiling", "_blank", "noopener,noreferrer");
    }
  };

  const handleProfileAcheteur = (itemId: string) => {
    if (results) {
      markAcheteurChaudProfiled(results.id, itemId);
      setTimeout(() => {
        const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
        if (fresh) persistResult(fresh);
      }, 0);
      window.open("https://nxt-profiling.fr/profiling", "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold text-blue-500">{totalActifs}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total traités</p>
              <p className="text-2xl font-bold text-foreground">{treatedItems.length}</p>
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
              <p className="text-2xl font-bold text-red-500">{totalAbandonne}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <Check className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profilés</p>
              <p className="text-2xl font-bold text-violet-500">{totalProfiled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contacts actifs : Informations de vente ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Informations de vente en cours
          </h3>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
            {activeInfoVente.length}
          </span>
        </div>

        {activeInfoVente.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Aucune information de vente en cours.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeInfoVente.map((item) => (
              <ActiveContactCard
                key={item.id}
                id={item.id}
                nom={item.nom}
                commentaire={item.commentaire}
                profiled={item.profiled}
                confirmingId={confirmingId}
                setConfirmingId={setConfirmingId}
                onRemove={(reason) => handleUpdateInfo(item.id, reason)}
                onProfile={() => handleProfileInfo(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Contacts actifs : Acheteurs chauds ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Acheteurs chauds en cours
          </h3>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
            {activeAcheteurs.length}
          </span>
        </div>

        {activeAcheteurs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Aucun acheteur chaud en cours.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeAcheteurs.map((item) => (
              <ActiveContactCard
                key={item.id}
                id={item.id}
                nom={item.nom}
                commentaire={item.commentaire}
                profiled={item.profiled}
                confirmingId={confirmingId}
                setConfirmingId={setConfirmingId}
                onRemove={(reason) => handleUpdateAcheteur(item.id, reason)}
                onProfile={() => handleProfileAcheteur(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Historique des contacts traités ── */}
      {treatedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Historique
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {treatedItems.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {treatedItems.map((item) => (
              <TreatedItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveContactCard({
  id,
  nom,
  commentaire,
  profiled,
  confirmingId,
  setConfirmingId,
  onRemove,
  onProfile,
}: {
  id: string;
  nom: string;
  commentaire: string;
  profiled?: boolean;
  confirmingId: string | null;
  setConfirmingId: (id: string | null) => void;
  onRemove: (reason: "deale" | "abandonne") => void;
  onProfile?: () => void;
}) {
  const isConfirming = confirmingId === id;
  const isProfiled = profiled === true;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/50 p-4 transition-colors",
        isConfirming && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{nom}</p>
            {isProfiled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-500">
                <Check className="h-2.5 w-2.5" />
                Profilé
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{commentaire}</p>
        </div>
        {!isConfirming ? (
          <button
            onClick={() => setConfirmingId(id)}
            className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Traiter
          </button>
        ) : (
          <button
            onClick={() => setConfirmingId(null)}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isConfirming && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium text-foreground">
            Quelle est la raison ?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onRemove("deale")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500/15 px-3 py-2.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-500/25 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Dealé
            </button>
            <button
              onClick={() => onRemove("abandonne")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/25 dark:text-red-400"
            >
              <XCircle className="h-4 w-4" />
              Abandonné
            </button>
            {isProfiled ? (
              <a
                href="https://nxt-profiling.fr/profiling"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500/25 px-3 py-2.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-500/35 dark:text-violet-400"
              >
                <Check className="h-4 w-4" />
                Déjà profilé
              </a>
            ) : (
              <button
                onClick={() => onProfile?.()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500/15 px-3 py-2.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-500/25 dark:text-violet-400"
              >
                <ExternalLink className="h-4 w-4" />
                Profiler
              </button>
            )}
          </div>
          {!isProfiled && (
            <p className="mt-2 text-center text-[11px] text-violet-500/70">
              +34% transformation client avec NXT Profiling
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TreatedItemCard({ item }: { item: { nom: string; commentaire: string; statut: string } }) {
  const isDeale = item.statut === "deale";

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
    </div>
  );
}
