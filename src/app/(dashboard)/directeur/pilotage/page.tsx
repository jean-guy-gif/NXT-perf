"use client";

import { useState, useMemo } from "react";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import type { AgencyOverviewItem, PilotPeriod } from "@/hooks/use-agency-gps";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore } from "@/stores/app-store";
import { GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import { generateFormationDiagnostic } from "@/lib/formation";
import { computeAllRatios } from "@/lib/ratios";
import { RecommandationBanner } from "@/components/dashboard/recommandation-banner";
import type { FormationArea } from "@/types/formation";
import { getGlobalScore, globalScoreToHumanScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { AlertesPrioritaires } from "@/components/dashboard/alertes-prioritaires";

const themes: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

function isCATheme(t: GPSTheme) {
  return t === "ca_compromis" || t === "ca_acte";
}

function fmt(value: number, theme: GPSTheme) {
  if (isCATheme(theme)) return formatCurrency(value);
  if (theme === "exclusivite") return `${value} %`;
  return formatNumber(value);
}

function fmtOverview(item: AgencyOverviewItem) {
  if (item.isCA) return formatCurrency(item.realise);
  if (item.isPercent) return `${item.realise} %`;
  return formatNumber(item.realise);
}

function fmtOverviewObj(item: AgencyOverviewItem) {
  if (item.isCA) return formatCurrency(item.objectif);
  if (item.isPercent) return `${item.objectif} %`;
  return formatNumber(item.objectif);
}

export default function PilotageAgencePage() {
  const { theme, setTheme, period, setPeriod, monthCount, agencyGPS, agencyOverview, teamDetails, agencyObjective } = useAgencyGPS();
  const { allConseillers, allResults, ratioConfigs } = useDirectorData();
  const periodLabel = period === "annee" ? `cumul ${monthCount} mois` : "ce mois";
  const periodObjLabel = period === "annee" ? `objectif ${monthCount} mois` : "objectif mensuel";
  const setAgencyObjective = useAppStore(s => s.setAgencyObjective);
  const [showSaisie, setShowSaisie] = useState(!agencyObjective);
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 0);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 0);

  const agencyRecommendations = useMemo(() => {
    const areaCount: Record<string, { count: number; area: FormationArea; label: string; totalGap: number; names: string[] }> = {};

    for (const user of allConseillers) {
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
  }, [allConseillers, allResults, ratioConfigs]);

  const agencyScore = useMemo(() => {
    let totalScore = 0;
    let count = 0;
    for (const c of allConseillers) {
      const res = allResults.find((r) => r.userId === c.id);
      if (!res) continue;
      const ratios = computeAllRatios(res, c.category, ratioConfigs);
      const score = getGlobalScore(ratios);
      totalScore += score.score;
      count++;
    }
    if (count === 0) return null;
    const avg = Math.round(totalScore / count);
    return getGlobalScore(
      allConseillers.flatMap((c) => {
        const res = allResults.find((r) => r.userId === c.id);
        return res ? computeAllRatios(res, c.category, ratioConfigs) : [];
      })
    );
  }, [allConseillers, allResults, ratioConfigs]);

  const agencyAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: "danger" | "warning" | "info"; title: string; detail: string; conseillerName?: string; link?: string }> = [];
    let criticalCount = 0;

    for (const c of allConseillers) {
      const res = allResults.find((r) => r.userId === c.id);
      if (!res) continue;

      if (res.prospection.contactsTotaux === 0) {
        alerts.push({
          id: `no-contacts-${c.id}`,
          type: "danger",
          title: "Aucun contact ce mois",
          detail: "Pas de prospection enregistrée",
          conseillerName: `${c.firstName} ${c.lastName}`,
          link: "/directeur/performance",
        });
      }

      const ratios = computeAllRatios(res, c.category, ratioConfigs);
      const score = getGlobalScore(ratios);
      if (score.level === "critique") {
        criticalCount++;
        alerts.push({
          id: `critique-${c.id}`,
          type: "danger",
          title: "Performance critique",
          detail: `Score : ${score.score}%`,
          conseillerName: `${c.firstName} ${c.lastName}`,
          link: "/directeur/performance",
        });
      }
    }

    if (allConseillers.length > 0 && criticalCount > allConseillers.length / 2) {
      alerts.unshift({
        id: "agency-majority-critical",
        type: "danger",
        title: "Plus de 50% des conseillers en zone critique",
        detail: `${criticalCount}/${allConseillers.length} conseillers — situation préoccupante`,
        link: "/directeur/performance",
      });
    }

    return alerts;
  }, [allConseillers, allResults, ratioConfigs]);

  function handleSave() {
    if (annualCA > 0 && avgActValue > 0) {
      setAgencyObjective({ annualCA, avgActValue });
      setShowSaisie(false);
    }
  }

  const gps = agencyGPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pilotage Agence</h1>
            <p className="text-sm text-muted-foreground">GPS de performance agence — données mensuelles</p>
          </div>
        </div>
        {agencyScore && (
          <ScoreBadge score={globalScoreToHumanScore(agencyScore)} size="md" />
        )}
      </div>

      {/* ── Agency Recommendations ── */}
      {agencyRecommendations.length > 0 && (
        <RecommandationBanner
          recommendations={agencyRecommendations}
          ratioConfigs={ratioConfigs}
          maxItems={3}
          variant="compact"
          scope="directeur"
        />
      )}

      {/* ── Priority Alerts ── */}
      <AlertesPrioritaires alerts={agencyAlerts} maxItems={5} />

      {/* ── Vue d'ensemble ── */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Vue d'ensemble agence <span className="font-normal text-muted-foreground">— {periodLabel}</span></h3>
          <div className="flex rounded-lg border border-border text-xs">
            <button onClick={() => setPeriod("mois")} className={cn("rounded-l-lg px-3 py-1 font-medium transition-colors", period === "mois" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>Mois</button>
            <button onClick={() => setPeriod("annee")} className={cn("rounded-r-lg px-3 py-1 font-medium transition-colors", period === "annee" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>Année</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-5 lg:grid-cols-9">
          {agencyOverview.map(item => (
            <button
              key={item.theme}
              onClick={() => setTheme(item.theme)}
              className={cn(
                "flex flex-col gap-1 bg-card px-3 py-3 text-left transition-colors hover:bg-muted/50",
                theme === item.theme && "ring-2 ring-inset ring-primary"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</span>
              <span className="text-lg font-bold">{fmtOverview(item)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">obj. {fmtOverviewObj(item)}</span>
                <span className={cn(
                  "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  item.status === "ok" ? "bg-green-500/10 text-green-500" :
                  item.status === "warning" ? "bg-orange-500/10 text-orange-500" :
                  "bg-red-500/10 text-red-500"
                )}>
                  {item.pct}%
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Saisie objectif (collapsible) */}
      <div className="rounded-lg border border-border bg-card">
        <button
          onClick={() => setShowSaisie(!showSaisie)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span>Objectif CA agence {agencyObjective ? `— ${formatCurrency(agencyObjective.annualCA)}/an` : "(non défini)"}</span>
          {showSaisie ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSaisie && (
          <div className="border-t border-border px-4 py-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">CA annuel agence</label>
                <input
                  type="number"
                  value={annualCA || ""}
                  onChange={e => setAnnualCA(Number(e.target.value))}
                  placeholder="500000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Valeur moyenne d'un acte</label>
                <input
                  type="number"
                  value={avgActValue || ""}
                  onChange={e => setAvgActValue(Number(e.target.value))}
                  placeholder="8000"
                  className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSave}
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Enregistrer
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Si non renseigné, l'objectif agence = somme des objectifs individuels par catégorie.
            </p>
          </div>
        )}
      </div>

      {/* Theme selector */}
      <div className="flex flex-wrap gap-2">
        {themes.map(t => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              theme === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {GPS_THEME_LABELS[t]}
          </button>
        ))}
      </div>

      {/* GPS Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">{GPS_THEME_LABELS[theme]}</h2>
          <span className="text-xs text-muted-foreground">— {periodLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{periodObjLabel}</p>
            <p className="text-xl font-bold">{fmt(gps.objectif, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Réalisé {periodLabel}</p>
            <p className="text-xl font-bold">{fmt(gps.realise, theme)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Écart</p>
            <p className={cn("text-xl font-bold", gps.ecart >= 0 ? "text-green-500" : "text-red-500")}>
              {gps.ecart >= 0 ? "+" : ""}{fmt(gps.ecart, theme)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projection annuelle</p>
            <p className="text-xl font-bold">{fmt(gps.projection, theme)}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            value={gps.avancement}
            label="Avancement"
            status={gps.avancement >= 100 ? "ok" : gps.avancement >= 80 ? "warning" : "danger"}
            size="lg"
          />
        </div>
      </div>

      {/* Team detail table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Détail par équipe <span className="font-normal text-muted-foreground">— {GPS_THEME_LABELS[theme]}, {periodLabel}</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Équipe</th>
                <th className="px-4 py-2 text-right">Objectif</th>
                <th className="px-4 py-2 text-right">Réalisé</th>
                <th className="px-4 py-2 text-right">Écart</th>
                <th className="px-4 py-2 text-right">%</th>
                <th className="px-4 py-2 text-right">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {teamDetails.map(td => (
                <tr key={td.teamId} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{td.teamName}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.objectif, theme)}</td>
                  <td className="px-4 py-2 text-right">{fmt(td.realise, theme)}</td>
                  <td className={cn("px-4 py-2 text-right", td.ecart >= 0 ? "text-green-500" : "text-red-500")}>
                    {td.ecart >= 0 ? "+" : ""}{fmt(td.ecart, theme)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      td.status === "ok" ? "bg-green-500/10 text-green-500" :
                      td.status === "warning" ? "bg-orange-500/10 text-orange-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {td.pct}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <TrendIndicator current={td.realise} previous={td.objectif} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
