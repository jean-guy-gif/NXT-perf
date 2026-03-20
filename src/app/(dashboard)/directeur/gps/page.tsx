"use client";

import { useState } from "react";
import { Compass, Save, CheckCircle, Pencil } from "lucide-react";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import type { AgencyOverviewItem } from "@/hooks/use-agency-gps";
import { useRatios } from "@/hooks/use-ratios";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { GPS_THEME_LABELS } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { ProgressBar } from "@/components/charts/progress-bar";
import { getHumanScore } from "@/lib/scoring";
import { formatBenchmark } from "@/data/mock-benchmark";
import { cn } from "@/lib/utils";
import type { RatioId } from "@/types/ratios";

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

const statusConfig = {
  ok: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/25" },
  warning: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  danger: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/25" },
};

export default function DirecteurGPSPage() {
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const { agencyOverview, agencyObjective } = useAgencyGPS();
  const setAgencyObjective = useAppStore((s) => s.setAgencyObjective);

  const [editing, setEditing] = useState(!agencyObjective);
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 0);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 0);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (annualCA > 0 && avgActValue > 0) {
      setAgencyObjective({ annualCA, avgActValue });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Compass className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">GPS Agence</h1>
          <p className="text-sm text-muted-foreground">
            Objectif agence, GPS personnel et suivi des thèmes
          </p>
        </div>
      </div>

      {/* ═══ Saisie objectif agence ═══ */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Objectif CA agence</h2>
          {agencyObjective && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Objectif CA annuel agence (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={annualCA || ""}
                  onChange={(e) => setAnnualCA(Number(e.target.value))}
                  placeholder="500000"
                  className="h-12 w-full rounded-lg border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Valeur moyenne par acte (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={avgActValue || ""}
                  onChange={(e) => setAvgActValue(Number(e.target.value))}
                  placeholder="8000"
                  className="h-12 w-full rounded-lg border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              className={cn(
                "mt-4 flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all",
                saved
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enregistré !
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        ) : (
          agencyObjective && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">CA annuel</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(agencyObjective.annualCA)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  soit {formatCurrency(Math.round(agencyObjective.annualCA / 12))}/mois
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Valeur moy. par acte</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(agencyObjective.avgActValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  soit {Math.round(agencyObjective.annualCA / agencyObjective.avgActValue)} actes/an
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* ═══ GPS personnel directeur (7 ratios) ═══ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mon GPS personnel</h2>
          {user && (
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", CATEGORY_COLORS[user.category])}>
              {CATEGORY_LABELS[user.category]}
            </span>
          )}
        </div>

        {computedRatios.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune donnée de performance personnelle. Saisissez vos résultats pour voir votre GPS.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {computedRatios.map((ratio) => {
              const config = ratioConfigs[ratio.ratioId as RatioId];
              if (!config) return null;
              const sc = statusConfig[ratio.status];
              const score = getHumanScore(ratio);
              const benchLabel = formatBenchmark(ratio.ratioId as RatioId);

              return (
                <div key={ratio.ratioId} className={cn("rounded-xl border bg-card p-5", sc.border)}>
                  <p className="text-sm font-semibold text-foreground">{config.name}</p>
                  <p className={cn("mt-2 text-3xl font-bold", sc.color)}>
                    {config.isPercentage ? `${Math.round(ratio.value)}%` : ratio.value.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">{config.unit}</p>

                  <span className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium", score.bgColor, score.color)}>
                    {score.label}
                  </span>

                  <ProgressBar
                    value={ratio.percentageOfTarget}
                    status={ratio.status}
                    showValue={false}
                    size="sm"
                    className="mt-3"
                  />
                  {benchLabel && (
                    <p className="text-xs text-muted-foreground mt-1">{benchLabel}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">
                      Objectif {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {config.isPercentage
                        ? `${ratio.thresholdForCategory}%`
                        : `${ratio.thresholdForCategory} ${config.unit}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Objectifs agence (9 thèmes) ═══ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Objectifs agence — Vue d'ensemble</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agencyOverview.map((item) => {
            const pct = item.pct;
            const status = pct >= 100 ? "ok" : pct >= 80 ? "warning" : "danger";
            const sc = statusConfig[status];
            return (
              <div key={item.theme} className={cn("rounded-xl border bg-card p-4", sc.border)}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{GPS_THEME_LABELS[item.theme]}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sc.bg, sc.color)}>
                    {pct}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Réalisé</p>
                    <p className="font-semibold">{fmtOverview(item)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Objectif</p>
                    <p className="font-semibold">{fmtOverviewObj(item)}</p>
                  </div>
                </div>
                <ProgressBar value={pct} status={status} showValue={false} size="sm" className="mt-2" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
