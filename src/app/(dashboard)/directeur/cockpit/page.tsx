"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  FileCheck,
  FileSignature,
  Gauge,
  Building2,
  Users,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ClipboardCheck,
  Calendar,
  Phone,
  Flame,
  ExternalLink,
} from "lucide-react";
import type { ContactStatut } from "@/types/results";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS, NXT_COLORS } from "@/lib/constants";
import { useDirectorData } from "@/hooks/use-director-data";
import { computeAllRatios } from "@/lib/ratios";
import { mockMonthlyCA } from "@/data/mock-results";
import type { RatioId } from "@/types/ratios";
import { cn } from "@/lib/utils";

/* ────── Types ────── */
type Tab = "globale" | "equipe" | "conseiller";

const tabs: { key: Tab; label: string }[] = [
  { key: "globale", label: "Vue globale" },
  { key: "equipe", label: "Par équipe" },
  { key: "conseiller", label: "Par conseiller" },
];

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

/* ────── Clickable badge with popover ────── */
type StatutGroupData = {
  en_cours: { count: number; noms: string[] };
  deale: { count: number; noms: string[] };
  abandonne: { count: number; noms: string[] };
  profile: { count: number; noms: string[] };
  total: number;
};

const STATUT_STYLES = {
  en_cours: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  deale: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  abandonne: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  profile: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30" },
} as const;

function ClickableBadge({
  count,
  noms,
  statut,
  popoverKey,
  openPopover,
  setOpenPopover,
}: {
  count: number;
  noms: string[];
  statut: "en_cours" | "deale" | "abandonne" | "profile";
  popoverKey: string;
  openPopover: string | null;
  setOpenPopover: (key: string | null) => void;
}) {
  const style = STATUT_STYLES[statut];
  const isOpen = openPopover === popoverKey;

  if (count === 0) {
    return (
      <span className={cn("inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold", style.bg, style.text)}>
        0
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpenPopover(isOpen ? null : popoverKey)}
        className={cn(
          "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold cursor-pointer transition-all",
          style.bg, style.text,
          "hover:ring-2 hover:ring-offset-1 hover:ring-current/30",
          isOpen && "ring-2 ring-offset-1 ring-current/30"
        )}
      >
        {count}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(null)} />
          <div className={cn(
            "absolute z-50 mt-1 left-1/2 -translate-x-1/2 min-w-[180px] rounded-lg border bg-card p-2 shadow-lg",
            style.border
          )}>
            {noms.map((nom, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-2 py-1">
                <span className="whitespace-nowrap text-xs text-foreground">{nom}</span>
                <a
                  href="https://nxt-profiling.fr/profiling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded p-0.5 text-violet-500 transition-colors hover:bg-violet-500/15"
                  title="Profiler ce client"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
            <p className="mt-1 border-t border-border/50 pt-1 text-center text-[10px] text-violet-500/70">
              +34% avec NXT Profiling
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function TrackingRow({
  id,
  name,
  data,
  section,
  openPopover,
  setOpenPopover,
}: {
  id: string;
  name: string;
  data: StatutGroupData;
  section: string;
  openPopover: string | null;
  setOpenPopover: (key: string | null) => void;
}) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2.5 pr-4 font-medium text-foreground max-w-[140px]">
        <span className="block truncate" title={name}>{name}</span>
      </td>
      {(["en_cours", "deale", "abandonne", "profile"] as const).map((statut) => (
        <td key={statut} className="py-2.5 px-4 text-center">
          <ClickableBadge
            count={data[statut].count}
            noms={data[statut].noms}
            statut={statut}
            popoverKey={`${section}-${id}-${statut}`}
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          />
        </td>
      ))}
      <td className="py-2.5 pl-4 text-center font-semibold text-foreground">{data.total}</td>
    </tr>
  );
}

function TrackingTotalRow({
  data,
  section,
  openPopover,
  setOpenPopover,
}: {
  data: StatutGroupData;
  section: string;
  openPopover: string | null;
  setOpenPopover: (key: string | null) => void;
}) {
  return (
    <tr className="bg-muted/30 font-semibold">
      <td className="py-2.5 pr-4 text-foreground">Agence</td>
      {(["en_cours", "deale", "abandonne", "profile"] as const).map((statut) => (
        <td key={statut} className="py-2.5 px-4 text-center">
          <ClickableBadge
            count={data[statut].count}
            noms={data[statut].noms}
            statut={statut}
            popoverKey={`${section}-${statut}`}
            openPopover={openPopover}
            setOpenPopover={setOpenPopover}
          />
        </td>
      ))}
      <td className="py-2.5 pl-4 text-center text-foreground">{data.total}</td>
    </tr>
  );
}

/* ────── Main Page ────── */
export default function CockpitAgencePage() {
  const [activeTab, setActiveTab] = useState<Tab>("globale");
  const router = useRouter();
  const { teams, allConseillers, orgStats, allResults, ratioConfigs } =
    useDirectorData();

  /* ── Period state ── */
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mois");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);

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

  /* ── Compute agency-wide data ── */
  const agencyData = useMemo(() => {
    let totalCA = 0;
    let totalActes = 0;
    let totalMandats = 0;
    let totalExclusifs = 0;
    let totalEstimations = 0;
    let totalPerformance = 0;
    let totalCompromisCA = 0;
    let advisorCount = 0;

    for (const user of allConseillers) {
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
  }, [allConseillers, allResults, ratioConfigs, periodMultiplier]);

  /* ── Compute per-team data for equipe tab ── */
  const teamDataMap = useMemo(() => {
    const map = new Map<string, {
      totalCA: number;
      totalActes: number;
      totalMandats: number;
      totalEstimations: number;
      totalCompromisCA: number;
      avgExclusivite: number;
      avgPerformance: number;
    }>();

    for (const team of teams) {
      let totalCA = 0;
      let totalActes = 0;
      let totalMandats = 0;
      let totalExclusifs = 0;
      let totalEstimations = 0;
      let totalCompromisCA = 0;
      let totalPerformance = 0;
      let count = 0;

      for (const agent of team.agents) {
        const results = allResults.find((r) => r.userId === agent.id);
        if (!results) continue;
        count++;
        totalCA += results.ventes.chiffreAffaires;
        totalActes += results.ventes.actesSignes;
        totalMandats += results.vendeurs.mandats.length;
        totalExclusifs += results.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
        totalEstimations += results.vendeurs.estimationsRealisees;
        totalCompromisCA += results.acheteurs.compromisSignes * (results.ventes.actesSignes > 0 ? results.ventes.chiffreAffaires / results.ventes.actesSignes : 8000);
        const ratios = computeAllRatios(results, agent.category, ratioConfigs);
        if (ratios.length > 0) {
          totalPerformance += ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length;
        }
      }

      const avgExclusivite = totalMandats > 0 ? Math.round((totalExclusifs / totalMandats) * 100) : 0;
      const avgPerformance = count > 0 ? Math.round(totalPerformance / count) : 0;

      map.set(team.teamId, {
        totalCA: Math.round(totalCA * periodMultiplier),
        totalActes: Math.round(totalActes * periodMultiplier),
        totalMandats: Math.round(totalMandats * periodMultiplier),
        totalEstimations: Math.round(totalEstimations * periodMultiplier),
        totalCompromisCA: Math.round(totalCompromisCA * periodMultiplier),
        avgExclusivite,
        avgPerformance,
      });
    }

    return map;
  }, [teams, allResults, ratioConfigs, periodMultiplier]);

  /* ── Alerts ── */
  const alerts = useMemo(() => {
    const generated: { id: string; type: "danger" | "warning"; message: string }[] = [];
    for (const user of allConseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const dangerRatios = ratios.filter((r) => r.status === "danger");
      for (const r of dangerRatios) {
        const team = teams.find((t) => t.teamId === user.teamId);
        generated.push({
          id: `${user.id}-${r.ratioId}`,
          type: "danger",
          message: `${user.firstName} ${user.lastName}${team ? ` (${team.teamName})` : ""} : ratio "${ratioConfigs[r.ratioId as RatioId].name}" en danger (${r.percentageOfTarget}% de l'objectif)`,
        });
      }
    }
    return generated;
  }, [allConseillers, allResults, ratioConfigs, teams]);

  /* ── Contact & buyer tracking ── */
  const trackingData = useMemo(() => {
    const groupByStatut = (items: { nom: string; statut: ContactStatut; profiled?: boolean }[]): StatutGroupData => ({
      en_cours: {
        count: items.filter((i) => i.statut === "en_cours").length,
        noms: items.filter((i) => i.statut === "en_cours").map((i) => i.nom),
      },
      deale: {
        count: items.filter((i) => i.statut === "deale").length,
        noms: items.filter((i) => i.statut === "deale").map((i) => i.nom),
      },
      abandonne: {
        count: items.filter((i) => i.statut === "abandonne").length,
        noms: items.filter((i) => i.statut === "abandonne").map((i) => i.nom),
      },
      profile: {
        count: items.filter((i) => i.profiled).length,
        noms: items.filter((i) => i.profiled).map((i) => i.nom),
      },
      total: items.length,
    });

    const empty: StatutGroupData = {
      en_cours: { count: 0, noms: [] },
      deale: { count: 0, noms: [] },
      abandonne: { count: 0, noms: [] },
      profile: { count: 0, noms: [] },
      total: 0,
    };

    const perAdvisor = allConseillers.map((user) => {
      const results = allResults.find((r) => r.userId === user.id);
      const team = teams.find((t) => t.teamId === user.teamId);
      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        teamName: team?.teamName ?? "",
        contacts: results ? groupByStatut(results.prospection.informationsVente) : empty,
        acheteurs: results ? groupByStatut(results.acheteurs.acheteursChauds) : empty,
      };
    });

    const mergeTotals = (key: "contacts" | "acheteurs"): StatutGroupData => ({
      en_cours: {
        count: perAdvisor.reduce((s, a) => s + a[key].en_cours.count, 0),
        noms: perAdvisor.flatMap((a) => a[key].en_cours.noms),
      },
      deale: {
        count: perAdvisor.reduce((s, a) => s + a[key].deale.count, 0),
        noms: perAdvisor.flatMap((a) => a[key].deale.noms),
      },
      abandonne: {
        count: perAdvisor.reduce((s, a) => s + a[key].abandonne.count, 0),
        noms: perAdvisor.flatMap((a) => a[key].abandonne.noms),
      },
      profile: {
        count: perAdvisor.reduce((s, a) => s + a[key].profile.count, 0),
        noms: perAdvisor.flatMap((a) => a[key].profile.noms),
      },
      total: perAdvisor.reduce((s, a) => s + a[key].total, 0),
    });

    return { perAdvisor, totals: { contacts: mergeTotals("contacts"), acheteurs: mergeTotals("acheteurs") } };
  }, [allConseillers, allResults, teams]);

  /* ── Per-advisor performance for bar chart ── */
  const advisorPerfData = allConseillers.map((user) => {
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

  /* ── Monthly CA evolution (agency-wide) ── */
  const agencyMonthlyCA = mockMonthlyCA.map((d) => ({
    ...d,
    ca: d.ca * allConseillers.length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Cockpit Agence
            </h1>
            <p className="text-sm text-muted-foreground">
              Vue synthétique de la performance de l&apos;agence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {orgStats.teamCount} équipes
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground">
              {orgStats.totalAgents} conseillers
            </span>
          </div>
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

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 rounded-lg bg-muted p-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════ VUE GLOBALE ═══════════════════ */}
      {activeTab === "globale" && (
        <>
          {/* 6 KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Estimations"
              value={agencyData.totalEstimations}
              icon={ClipboardCheck}
              status="ok"
            />
            <KpiCard
              title="Mandats"
              value={agencyData.totalMandats}
              icon={FileSignature}
              status="ok"
            />
            <KpiCard
              title="% Exclusivité"
              value={`${agencyData.avgExclusivite}%`}
              icon={FileSignature}
              status={agencyData.avgExclusivite >= 50 ? "ok" : "warning"}
            />
            <KpiCard
              title="CA Compromis"
              value={formatCurrency(agencyData.totalCompromisCA)}
              icon={DollarSign}
              status="ok"
            />
            <KpiCard
              title="CA Acte Authentique"
              value={formatCurrency(agencyData.totalCA)}
              icon={FileCheck}
              status="ok"
            />
            <KpiCard
              title="Performance agence"
              value={`${agencyData.avgPerformance}%`}
              icon={Gauge}
              status={
                agencyData.avgPerformance >= 80
                  ? "ok"
                  : agencyData.avgPerformance >= 60
                    ? "warning"
                    : "danger"
              }
            />
          </div>

          {/* Alerts - max 3 */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Alertes prioritaires
              </h2>
              {alerts.slice(0, 3).map((alert) => (
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
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Évolution CA Agence (mensuel)
              </h3>
              <LineChart
                data={agencyMonthlyCA}
                xKey="month"
                lines={[
                  { dataKey: "ca", color: NXT_COLORS.green, name: "CA Agence (€)" },
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
                    color: NXT_COLORS.green,
                    name: "Performance (%)",
                  },
                ]}
                height={220}
              />
            </div>
          </div>

          {/* Team summary cards */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Résumé par équipe
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <div
                  key={team.teamId}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">
                      {team.teamName}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {team.agentCount} conseillers
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manager : {team.managerName}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">CA</p>
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(team.totalCA)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mandats</p>
                      <p className="text-sm font-bold text-foreground">
                        {team.totalMandats}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Performance
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold",
                          team.avgPerformance >= 80
                            ? "text-green-500"
                            : team.avgPerformance >= 60
                              ? "text-orange-500"
                              : "text-red-500"
                        )}
                      >
                        {team.avgPerformance} %
                      </span>
                    </div>
                    <ProgressBar
                      value={team.avgPerformance}
                      showValue={false}
                      size="sm"
                      status={
                        team.avgPerformance >= 80
                          ? "ok"
                          : team.avgPerformance >= 60
                            ? "warning"
                            : "danger"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agency Summary Grid */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold text-foreground">
              Résumé de l&apos;agence
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Conseillers actifs</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {agencyData.advisorCount}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">CA moyen/conseiller</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatCurrency(
                    agencyData.advisorCount > 0
                      ? Math.round(agencyData.totalCA / agencyData.advisorCount)
                      : 0
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Mandats totaux</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {agencyData.totalMandats}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Mandats moy./conseiller/mois</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {periodMode === "semaine"
                    ? "N/A"
                    : agencyData.advisorCount > 0
                      ? (agencyData.totalMandats / agencyData.advisorCount / periodMultiplier).toFixed(1)
                      : "0"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Actes moyen/conseiller
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {agencyData.advisorCount > 0
                    ? (agencyData.totalActes / agencyData.advisorCount).toFixed(1)
                    : "0"}
                </p>
              </div>
            </div>

            {/* Quick advisor list */}
            <div className="mt-4 space-y-2">
              {allConseillers.map((user) => {
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
                const team = teams.find((t) => t.teamId === user.teamId);
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
                      <p className="text-xs text-muted-foreground truncate">
                        {team?.teamName}
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

          {/* ── Suivi des contacts ── */}
          <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
            <div className="shrink-0 px-5 pt-5 pb-3">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Phone className="h-4 w-4 text-primary" />
                Suivi des contacts
              </h3>
            </div>
            <div className="min-h-0 overflow-x-auto overflow-y-auto px-5 pb-6" style={{ maxHeight: "clamp(260px, 45vh, 520px)", scrollPaddingBottom: "24px" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Conseiller</th>
                    <th className="pb-3 px-4 text-center font-medium text-blue-500">En cours</th>
                    <th className="pb-3 px-4 text-center font-medium text-green-500">Dealés</th>
                    <th className="pb-3 px-4 text-center font-medium text-red-500">Abandonnés</th>
                    <th className="pb-3 px-4 text-center font-medium text-violet-500">Profilés</th>
                    <th className="pb-3 pl-4 text-center font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.perAdvisor.map((advisor) => (
                    <TrackingRow
                      key={advisor.userId}
                      id={advisor.userId}
                      name={advisor.name}
                      data={advisor.contacts}
                      section="contacts"
                      openPopover={openPopover}
                      setOpenPopover={setOpenPopover}
                    />
                  ))}
                  <TrackingTotalRow
                    data={trackingData.totals.contacts}
                    section="contacts-agence"
                    openPopover={openPopover}
                    setOpenPopover={setOpenPopover}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Suivi des acheteurs chauds ── */}
          <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
            <div className="shrink-0 px-5 pt-5 pb-3">
              <h3 className="flex items-center gap-2 font-semibold text-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                Suivi des acheteurs chauds
              </h3>
            </div>
            <div className="min-h-0 overflow-x-auto overflow-y-auto px-5 pb-6" style={{ maxHeight: "clamp(260px, 45vh, 520px)", scrollPaddingBottom: "24px" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Conseiller</th>
                    <th className="pb-3 px-4 text-center font-medium text-blue-500">En cours</th>
                    <th className="pb-3 px-4 text-center font-medium text-green-500">Dealés</th>
                    <th className="pb-3 px-4 text-center font-medium text-red-500">Abandonnés</th>
                    <th className="pb-3 px-4 text-center font-medium text-violet-500">Profilés</th>
                    <th className="pb-3 pl-4 text-center font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingData.perAdvisor.map((advisor) => (
                    <TrackingRow
                      key={advisor.userId}
                      id={advisor.userId}
                      name={advisor.name}
                      data={advisor.acheteurs}
                      section="acheteurs"
                      openPopover={openPopover}
                      setOpenPopover={setOpenPopover}
                    />
                  ))}
                  <TrackingTotalRow
                    data={trackingData.totals.acheteurs}
                    section="acheteurs-agence"
                    openPopover={openPopover}
                    setOpenPopover={setOpenPopover}
                  />
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

      {/* ═══════════════════ PAR ÉQUIPE ═══════════════════ */}
      {activeTab === "equipe" && (
        <div className="space-y-6">
          {teams.map((team) => {
            const td = teamDataMap.get(team.teamId);
            return (
              <div
                key={team.teamId}
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Manager : {team.managerName}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {team.agentCount} conseillers
                  </span>
                </div>

                {/* Team KPIs */}
                {td && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Estimations</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{td.totalEstimations}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Mandats</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{td.totalMandats}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">% Exclusivité</p>
                      <p className={cn(
                        "mt-1 text-lg font-bold",
                        td.avgExclusivite >= 50 ? "text-foreground" : "text-orange-500"
                      )}>{td.avgExclusivite}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">CA Compromis</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(td.totalCompromisCA)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">CA Acte Auth.</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(td.totalCA)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Performance</p>
                      <p className={cn(
                        "mt-1 text-lg font-bold",
                        td.avgPerformance >= 80
                          ? "text-green-500"
                          : td.avgPerformance >= 60
                            ? "text-orange-500"
                            : "text-red-500"
                      )}>{td.avgPerformance}%</p>
                    </div>
                  </div>
                )}

                {/* Agent list */}
                <div className="space-y-2">
                  {team.agents.map((agent) => {
                    const results = allResults.find(
                      (r) => r.userId === agent.id
                    );
                    const ratios = results
                      ? computeAllRatios(results, agent.category, ratioConfigs)
                      : [];
                    const avgPerf =
                      ratios.length > 0
                        ? Math.round(
                            ratios.reduce(
                              (s, r) => s + r.percentageOfTarget,
                              0
                            ) / ratios.length
                          )
                        : 0;
                    const ca = results?.ventes.chiffreAffaires ?? 0;

                    return (
                      <div
                        key={agent.id}
                        onClick={() => router.push(`/directeur/conseiller/${agent.id}?period=${periodMode}`)}
                        className="flex items-center gap-3 rounded-lg bg-muted/30 p-2 cursor-pointer transition-colors hover:bg-muted/60"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {agent.firstName[0]}
                          {agent.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {agent.firstName} {agent.lastName}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            CATEGORY_COLORS[agent.category]
                          )}
                        >
                          {CATEGORY_LABELS[agent.category]}
                        </span>
                        <span className="text-sm font-medium text-foreground w-20 text-right">
                          {formatCurrency(ca)}
                        </span>
                        <div className="w-20">
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
            );
          })}
        </div>
      )}

      {/* ═══════════════════ PAR CONSEILLER ═══════════════════ */}
      {activeTab === "conseiller" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Conseiller
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Équipe
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                    Catégorie
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    CA
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actes
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...allConseillers]
                  .map((agent) => {
                    const results = allResults.find(
                      (r) => r.userId === agent.id
                    );
                    const ratios = results
                      ? computeAllRatios(
                          results,
                          agent.category,
                          ratioConfigs
                        )
                      : [];
                    const avgPerf =
                      ratios.length > 0
                        ? Math.round(
                            ratios.reduce(
                              (s, r) => s + r.percentageOfTarget,
                              0
                            ) / ratios.length
                          )
                        : 0;
                    const ca = results?.ventes.chiffreAffaires ?? 0;
                    const actes = results?.ventes.actesSignes ?? 0;
                    const team = teams.find(
                      (t) => t.teamId === agent.teamId
                    );
                    return { agent, ca, actes, avgPerf, teamName: team?.teamName ?? "" };
                  })
                  .sort((a, b) => b.ca - a.ca)
                  .map(({ agent, ca, actes, avgPerf, teamName }) => (
                    <tr
                      key={agent.id}
                      onClick={() => router.push(`/directeur/conseiller/${agent.id}?period=${periodMode}`)}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {agent.firstName[0]}
                            {agent.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {agent.firstName} {agent.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {teamName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            CATEGORY_COLORS[agent.category]
                          )}
                        >
                          {CATEGORY_LABELS[agent.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-foreground">
                        {formatCurrency(ca)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {actes}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            avgPerf >= 80
                              ? "text-green-500"
                              : avgPerf >= 60
                                ? "text-orange-500"
                                : "text-red-500"
                          )}
                        >
                          {avgPerf} %
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
