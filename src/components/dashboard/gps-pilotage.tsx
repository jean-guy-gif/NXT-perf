"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useUser } from "@/hooks/use-user";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import { ProgressBar } from "@/components/charts/progress-bar";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";

// ── Metrics config ──────────────────────────────────────────────────────────

interface MetricConfig {
  key: string;
  label: string;
  shortLabel: string;
  getValue: (r: PeriodResults) => number;
  getObjectif: (cat: UserCategory) => number;
  unit?: string;
  isPercentage?: boolean;
}

const METRICS: MetricConfig[] = [
  {
    key: "estimations", label: "Estimations", shortLabel: "Estim.",
    getValue: (r) => r.vendeurs.estimationsRealisees,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].estimations,
  },
  {
    key: "mandats", label: "Mandats", shortLabel: "Mandats",
    getValue: (r) => r.vendeurs.mandatsSignes,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].mandats,
  },
  {
    key: "exclusivite", label: "% Exclusivité", shortLabel: "% Exclu.",
    getValue: (r) => {
      const total = r.vendeurs.mandats.length;
      if (total === 0) return 0;
      const exclu = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
      return Math.round((exclu / total) * 100);
    },
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].exclusivite,
    unit: "%", isPercentage: true,
  },
  {
    key: "visites", label: "Visites", shortLabel: "Visites",
    getValue: (r) => r.acheteurs.nombreVisites,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].visites,
  },
  {
    key: "offres", label: "Offres", shortLabel: "Offres",
    getValue: (r) => r.acheteurs.offresRecues,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].offres,
  },
  {
    key: "compromis", label: "Compromis", shortLabel: "Comp.",
    getValue: (r) => r.acheteurs.compromisSignes,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].compromis,
  },
  {
    key: "actes", label: "Actes", shortLabel: "Actes",
    getValue: (r) => r.ventes.actesSignes,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].actes,
  },
  {
    key: "ca", label: "CA Encaissé", shortLabel: "CA",
    getValue: (r) => r.ventes.chiffreAffaires,
    getObjectif: (cat) => CATEGORY_OBJECTIVES[cat].ca,
    unit: "€",
  },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface GpsPilotageProps {
  scope: "individual" | "team" | "agency";
  userId?: string;
  teamId?: string;
  agencyId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  const base = results[0];
  return {
    ...base,
    prospection: {
      ...base.prospection,
      contactsEntrants: results.reduce((s, r) => s + r.prospection.contactsEntrants, 0),
      contactsTotaux: results.reduce((s, r) => s + r.prospection.contactsTotaux, 0),
      rdvEstimation: results.reduce((s, r) => s + r.prospection.rdvEstimation, 0),
    },
    vendeurs: {
      ...base.vendeurs,
      estimationsRealisees: results.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0),
      mandatsSignes: results.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: results.reduce((s, r) => s + r.vendeurs.rdvSuivi, 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + r.vendeurs.requalificationSimpleExclusif, 0),
      baissePrix: results.reduce((s, r) => s + r.vendeurs.baissePrix, 0),
    },
    acheteurs: {
      ...base.acheteurs,
      nombreVisites: results.reduce((s, r) => s + r.acheteurs.nombreVisites, 0),
      offresRecues: results.reduce((s, r) => s + r.acheteurs.offresRecues, 0),
      compromisSignes: results.reduce((s, r) => s + r.acheteurs.compromisSignes, 0),
      acheteursSortisVisite: results.reduce((s, r) => s + r.acheteurs.acheteursSortisVisite, 0),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + r.ventes.actesSignes, 0),
      chiffreAffaires: results.reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
      delaiMoyenVente: 0,
    },
  };
}

function formatValue(val: number, unit?: string): string {
  if (unit === "€") return val.toLocaleString("fr-FR") + " €";
  if (unit === "%") return val + "%";
  return String(val);
}

// ── Component ───────────────────────────────────────────────────────────────

export function GpsPilotage({ scope, userId, teamId }: GpsPilotageProps) {
  const [activeMetric, setActiveMetric] = useState("estimations");
  const { category } = useUser();
  const allResults = useAllResults();
  const individualResult = useResults(userId);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  // Compute the aggregated result based on scope
  const scopedResult = useMemo((): PeriodResults | null => {
    if (scope === "individual") return individualResult;

    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      const teamUsers = users.filter((u) => {
        if (u.role !== "conseiller") return false;
        if (isDemo) return u.teamId === tid;
        return u.managerId === currentUser?.id;
      });
      const teamResults = teamUsers
        .map((u) => allResults.find((r) => r.userId === u.id))
        .filter(Boolean) as PeriodResults[];
      return aggregateResults(teamResults);
    }

    if (scope === "agency") {
      const orgId = currentUser?.institutionId;
      const agencyUsers = users.filter((u) =>
        (u.role === "conseiller" || u.role === "manager") && u.institutionId === orgId
      );
      const agencyResults = agencyUsers
        .map((u) => allResults.find((r) => r.userId === u.id))
        .filter(Boolean) as PeriodResults[];
      return aggregateResults(agencyResults);
    }

    return null;
  }, [scope, userId, teamId, individualResult, allResults, users, currentUser, isDemo]);

  // Multiplier for team/agency objectives
  const headcount = useMemo(() => {
    if (scope === "individual") return 1;
    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      return users.filter((u) => u.role === "conseiller" && (isDemo ? u.teamId === tid : u.managerId === currentUser?.id)).length || 1;
    }
    const orgId = currentUser?.institutionId;
    return users.filter((u) => (u.role === "conseiller" || u.role === "manager") && u.institutionId === orgId).length || 1;
  }, [scope, teamId, users, currentUser, isDemo]);

  const active = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];

  if (!scopedResult) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Aucune donnée disponible pour cette période.
      </div>
    );
  }

  const realise = active.getValue(scopedResult);
  const objectif = active.isPercentage
    ? active.getObjectif(category)
    : active.getObjectif(category) * headcount;
  const ecart = realise - objectif;
  const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
  const projectionAnnuelle = realise * 12;

  return (
    <div className="space-y-4">
      {/* Metric tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActiveMetric(m.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeMetric === m.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.shortLabel}
          </button>
        ))}
      </div>

      {/* Active metric detail */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{active.label}</h3>
          {scope !== "individual" && (
            <span className="text-xs text-muted-foreground">{headcount} collaborateur{headcount > 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Objectif mois</p>
            <p className="text-lg font-bold text-foreground">{formatValue(objectif, active.unit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Réalisé</p>
            <p className="text-lg font-bold text-foreground">{formatValue(realise, active.unit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Écart</p>
            <p className={cn("text-lg font-bold", ecart >= 0 ? "text-green-500" : "text-red-500")}>
              {ecart >= 0 ? "+" : ""}{formatValue(ecart, active.unit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projection annuelle</p>
            <p className="text-lg font-bold text-foreground">
              {active.isPercentage ? formatValue(realise, "%") : formatValue(projectionAnnuelle, active.unit)}
            </p>
          </div>
        </div>

        <ProgressBar value={pct} max={100} />
        <p className="text-xs text-muted-foreground text-center">{pct}% de l'objectif atteint</p>
      </div>

      {/* Overview table — all metrics */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-3 py-2">Métrique</th>
              <th className="px-3 py-2 text-right">Objectif</th>
              <th className="px-3 py-2 text-right">Réalisé</th>
              <th className="px-3 py-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const r = m.getValue(scopedResult);
              const o = m.isPercentage ? m.getObjectif(category) : m.getObjectif(category) * headcount;
              const p = o > 0 ? Math.round((r / o) * 100) : 0;
              return (
                <tr
                  key={m.key}
                  onClick={() => setActiveMetric(m.key)}
                  className={cn(
                    "border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-muted/50",
                    activeMetric === m.key && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-2 font-medium text-foreground">{m.label}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatValue(o, m.unit)}</td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">{formatValue(r, m.unit)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn(
                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      p >= 100 ? "bg-green-500/10 text-green-500" :
                      p >= 70 ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {p}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
