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
  Phone,
  Flame,
  ExternalLink,
} from "lucide-react";
import type { ContactStatut } from "@/types/results";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DPITeamView } from "@/components/dpi/dpi-team-view";
import { ProgressBar } from "@/components/charts/progress-bar";
import { formatCurrency } from "@/lib/formatters";
import { mockTeamStats } from "@/data/mock-team";
import { mockMonthlyCA } from "@/data/mock-results";
import { useAllResults } from "@/hooks/use-results";
import type { TeamAlert } from "@/types/team";
import { computeAllRatios } from "@/lib/ratios";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS, NXT_COLORS } from "@/lib/constants";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { generateFormationDiagnostic } from "@/lib/formation";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
import type { FormationArea } from "@/types/formation";
import { getGlobalScore, globalScoreToHumanScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { AlertesPrioritaires } from "@/components/dashboard/alertes-prioritaires";
import { ProductionChain } from "@/components/dashboard/production-chain";

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
      <td className="py-2.5 pr-4 text-foreground">Équipe</td>
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
  const isDemo = useAppStore((s) => s.isDemo);
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const conseillers = users.filter((u) => {
    if (u.role !== "conseiller") return false;
    if (!currentUser) return false;
    if (isDemo) return u.teamId === currentUser.teamId;
    return u.managerId === currentUser.id;
  });

  /* ── Period state ── */
  const [periodMode, setPeriodMode] = usePersistedState<PeriodMode>(
    "nxt-manager-cockpit-period",
    "mois"
  );
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

  /* ── Contact & buyer tracking per advisor ── */
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

    const perAdvisor = conseillers.map((user) => {
      return {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        // Listes informationsVente / acheteursChauds retirées du modèle socle
        contacts: empty,
        acheteurs: empty,
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
  }, [conseillers, allResults]);

  // Popover state: "contacts-userId-statut" or "acheteurs-userId-statut"
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // Monthly evolution data (team-wide)
  const teamMonthlyCA = isDemo
    ? mockMonthlyCA.map((d) => ({ ...d, ca: d.ca * conseillers.length }))
    : [];

  // Alerts: use mock in demo, generate from real data otherwise
  const alerts: TeamAlert[] = useMemo(() => {
    if (isDemo) return mockTeamStats.alerts;
    const generated: TeamAlert[] = [];
    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const dangerRatios = ratios.filter((r) => r.status === "danger");
      for (const r of dangerRatios) {
        generated.push({
          id: `${user.id}-${r.ratioId}`,
          type: "danger",
          message: `${user.firstName} ${user.lastName} : ratio "${r.ratioId}" en danger (${r.percentageOfTarget}% de l'objectif)`,
          relatedUserId: user.id,
          relatedRatioId: r.ratioId,
        });
      }
    }
    return generated;
  }, [isDemo, conseillers, allResults, ratioConfigs]);

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

  const teamRecommendations = useMemo(() => {
    const areaCount: Record<string, { count: number; area: FormationArea; label: string; totalGap: number; names: string[] }> = {};

    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;
      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const diag = generateFormationDiagnostic(ratios, ratioConfigs, user.id);

      for (const rec of diag.recommendations.filter((r) => r.priority <= 2)) {
        if (!areaCount[rec.area]) {
          areaCount[rec.area] = { count: 0, area: rec.area, label: rec.label, totalGap: 0, names: [] };
        }
        areaCount[rec.area].count++;
        areaCount[rec.area].totalGap += rec.gapPercentage;
        areaCount[rec.area].names.push(`${user.firstName} ${user.lastName}`);
      }
    }

    return Object.values(areaCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((item) => ({
        area: item.area,
        label: `${item.count} ${item.label.toLowerCase()}`,
        priority: (item.count >= 3 ? 1 : 2) as 1 | 2 | 3,
        currentRatio: 0,
        targetRatio: 0,
        gapPercentage: Math.round(item.totalGap / item.count),
        description: `${item.count} conseiller(s) en difficulté : ${item.names.join(", ")}`,
      }));
  }, [conseillers, allResults, ratioConfigs]);

  const priorityAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: "danger" | "warning" | "info"; title: string; detail: string; conseillerName?: string; link?: string }> = [];

    for (const user of conseillers) {
      const results = allResults.find((r) => r.userId === user.id);
      if (!results) continue;

      if (results.prospection.contactsTotaux === 0) {
        alerts.push({
          id: `no-contacts-${user.id}`,
          type: "danger",
          title: "Aucun contact ce mois",
          detail: "Pas de prospection enregistrée — vérifiez la saisie",
          conseillerName: `${user.firstName} ${user.lastName}`,
          link: "/manager/gps",
        });
      }

      const ratios = computeAllRatios(results, user.category, ratioConfigs);
      const score = getGlobalScore(ratios);
      const dangerCount = ratios.filter((r) => r.status === "danger").length;

      if (score.level === "critique") {
        alerts.push({
          id: `critique-${user.id}`,
          type: "danger",
          title: "Performance critique",
          detail: `Score global : ${score.score}% — intervention urgente`,
          conseillerName: `${user.firstName} ${user.lastName}`,
          link: "/manager/gps",
        });
      } else if (dangerCount >= 3) {
        alerts.push({
          id: `multi-danger-${user.id}`,
          type: "warning",
          title: `${dangerCount} ratios en danger`,
          detail: "Plusieurs axes de progression à traiter",
          conseillerName: `${user.firstName} ${user.lastName}`,
          link: "/manager/gps",
        });
      }
    }

    return alerts;
  }, [conseillers, allResults, ratioConfigs]);

  if (conseillers.length === 0 && !isDemo) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Cockpit Manager</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
            <Users className="h-8 w-8 text-primary/50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Votre équipe est vide pour l'instant</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
            Partagez votre code équipe pour inviter vos conseillers. Ils verront leur dashboard et vous verrez leurs résultats ici.
          </p>
          <a href="/parametres/equipe" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Gérer mon équipe
          </a>
        </div>
      </div>
    );
  }

  const [gpsView, setGpsView] = usePersistedState<"equipe" | "individuel">(
    "nxt-manager-gps-view", "equipe"
  );
  const [selectedUserId, setSelectedUserId] = useState(conseillers[0]?.id ?? "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Mon Tableau de Bord
          </h1>
          <p className="text-sm text-muted-foreground">
            Performance de votre équipe
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            {teamData.advisorCount} conseillers
          </span>
        </div>
      </div>

      {/* GPS Pilotage toggle */}
      <div className="space-y-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button type="button" onClick={() => setGpsView("equipe")}
            className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", gpsView === "equipe" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            Équipe
          </button>
          <button type="button" onClick={() => setGpsView("individuel")}
            className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", gpsView === "individuel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            Par collaborateur
          </button>
        </div>

        {gpsView === "equipe" && (
          <ProductionChain scope="team" teamId={currentUser?.teamId ?? undefined} />
        )}

        {gpsView === "individuel" && (
          <div className="space-y-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {conseillers.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
            {selectedUserId && <ProductionChain scope="individual" userId={selectedUserId} />}
          </div>
        )}
      </div>

      {/* ── Team Recommendations ── */}
      {teamRecommendations.length > 0 && (
        <RecommandationBanner
          recommendations={teamRecommendations}
          ratioConfigs={ratioConfigs}
          maxItems={3}
          variant="compact"
          scope="manager"
        />
      )}

      {/* ── Priority Alerts ── */}
      <AlertesPrioritaires alerts={priorityAlerts} maxItems={5} />

      {/* ── Period Selector ── */}
      <div className="rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-1)]">
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
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-[14px] border p-4 shadow-[var(--shadow-1)]",
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
        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-1)]">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution CA Équipe (mensuel)
          </h3>
          <LineChart
            data={teamMonthlyCA}
            xKey="month"
            lines={[
              { dataKey: "ca", color: NXT_COLORS.green, name: "CA Équipe (€)" },
            ]}
            height={220}
            showGrid
          />
        </div>

        <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-1)]">
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

      {/* Team Summary Grid */}
      <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-1)]">
        <h3 className="mb-4 font-semibold text-foreground">
          Résumé de l&apos;équipe
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Conseillers actifs</p>
            <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {teamData.advisorCount}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">CA moyen/conseiller</p>
            <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {formatCurrency(
                teamData.advisorCount > 0
                  ? Math.round(teamData.totalCA / teamData.advisorCount)
                  : 0
              )}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Mandats totaux</p>
            <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
              {teamData.totalMandats}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Actes moyen/conseiller
            </p>
            <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
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
            const userGlobalScore = getGlobalScore(ratios);
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
                <ScoreBadge score={globalScoreToHumanScore(userGlobalScore)} />
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

      {/* ── Suivi des contacts (informations vente) ── */}
      <div className="flex flex-col rounded-[14px] border border-border bg-card overflow-hidden shadow-[var(--shadow-1)]">
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
                section="contacts-equipe"
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Suivi des acheteurs chauds ── */}
      <div className="flex flex-col rounded-[14px] border border-border bg-card overflow-hidden shadow-[var(--shadow-1)]">
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
                section="acheteurs-equipe"
                openPopover={openPopover}
                setOpenPopover={setOpenPopover}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* DPI Équipe */}
      <div className="rounded-[14px] border border-border bg-card p-5 shadow-[var(--shadow-1)]">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
          <span className="text-lg">{"\u{1F3AF}"}</span>
          DPI de l&apos;équipe
        </h3>
        <DPITeamView />
      </div>
    </div>
  );
}
