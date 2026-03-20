"use client";

import { useMemo } from "react";
import { Compass, Users } from "lucide-react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import { getHumanScore } from "@/lib/scoring";
import { formatBenchmark, MARKET_BENCHMARKS } from "@/data/mock-benchmark";
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_OBJECTIVES, NXT_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { User as UserType } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ratioIds: RatioId[] = [
  "contacts_rdv",
  "estimations_mandats",
  "pct_mandats_exclusifs",
  "visites_offre",
  "offres_compromis",
  "mandats_simples_vente",
  "mandats_exclusifs_vente",
];

const statusConfig = {
  ok: { color: "text-green-500", border: "border-green-500/25" },
  warning: { color: "text-orange-500", border: "border-orange-500/25" },
  danger: { color: "text-red-500", border: "border-red-500/25" },
};

interface ProducerRatio {
  userId: string;
  name: string;
  teamName: string;
  category: string;
  ratios: ComputedRatio[];
}

function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  return {
    id: "agency-aggregate",
    userId: "agency",
    periodType: "month",
    periodStart: results[0].periodStart,
    periodEnd: results[0].periodEnd,
    prospection: {
      contactsEntrants: results.reduce((s, r) => s + r.prospection.contactsEntrants, 0),
      contactsTotaux: results.reduce((s, r) => s + r.prospection.contactsTotaux, 0),
      rdvEstimation: results.reduce((s, r) => s + r.prospection.rdvEstimation, 0),
      informationsVente: results.flatMap((r) => r.prospection.informationsVente),
    },
    vendeurs: {
      rdvEstimation: results.reduce((s, r) => s + r.vendeurs.rdvEstimation, 0),
      estimationsRealisees: results.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0),
      mandatsSignes: results.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: results.reduce((s, r) => s + r.vendeurs.rdvSuivi, 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + r.vendeurs.requalificationSimpleExclusif, 0),
      baissePrix: results.reduce((s, r) => s + r.vendeurs.baissePrix, 0),
    },
    acheteurs: {
      acheteursChauds: results.flatMap((r) => r.acheteurs.acheteursChauds),
      acheteursSortisVisite: results.reduce((s, r) => s + r.acheteurs.acheteursSortisVisite, 0),
      nombreVisites: results.reduce((s, r) => s + r.acheteurs.nombreVisites, 0),
      offresRecues: results.reduce((s, r) => s + r.acheteurs.offresRecues, 0),
      compromisSignes: results.reduce((s, r) => s + r.acheteurs.compromisSignes, 0),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + r.ventes.actesSignes, 0),
      chiffreAffaires: results.reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
      delaiMoyenVente: results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.ventes.delaiMoyenVente, 0) / results.length)
        : 0,
    },
    createdAt: results[0].createdAt,
    updatedAt: results[0].updatedAt,
  };
}

export default function DirecteurGPSPage() {
  const { user } = useUser();
  const { teams, allConseillers, allManagers, allResults, ratioConfigs } = useDirectorData();
  const agencyObjective = useAppStore((s) => s.agencyObjective);

  // All producers: directeur (if producing) + managers + conseillers
  const allProducers = useMemo(() => {
    const producers: UserType[] = [...allConseillers];
    for (const m of allManagers) {
      if (!producers.some((p) => p.id === m.id)) producers.push(m);
    }
    if (user && !producers.some((p) => p.id === user.id)) {
      const hasResults = allResults.some((r) => r.userId === user.id);
      if (hasResults) producers.push(user);
    }
    return producers;
  }, [user, allConseillers, allManagers, allResults]);

  const producerCount = allProducers.length;

  // Agency-wide aggregated ratios
  const agencyRatios = useMemo(() => {
    const producerResults = allResults.filter((r) =>
      allProducers.some((p) => p.id === r.userId)
    );
    const agg = aggregateResults(producerResults);
    if (!agg) return [];
    return computeAllRatios(agg, "confirme", ratioConfigs);
  }, [allProducers, allResults, ratioConfigs]);

  // Per-producer ratios grouped by team
  const producersByTeam = useMemo(() => {
    const teamMap = new Map<string, { teamName: string; producers: ProducerRatio[] }>();

    for (const team of teams) {
      const teamProducers: ProducerRatio[] = [];

      // Manager of this team
      const manager = allManagers.find((m) => m.id === team.managerId);
      if (manager) {
        const mgrResult = allResults.find((r) => r.userId === manager.id);
        if (mgrResult) {
          teamProducers.push({
            userId: manager.id,
            name: `${manager.firstName} ${manager.lastName}`,
            teamName: team.teamName,
            category: manager.category,
            ratios: computeAllRatios(mgrResult, manager.category, ratioConfigs),
          });
        }
      }

      // Conseillers of this team
      for (const agent of team.agents) {
        const res = allResults.find((r) => r.userId === agent.id);
        if (!res) continue;
        teamProducers.push({
          userId: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          teamName: team.teamName,
          category: agent.category,
          ratios: computeAllRatios(res, agent.category, ratioConfigs),
        });
      }

      if (teamProducers.length > 0) {
        teamMap.set(team.teamId, { teamName: team.teamName, producers: teamProducers });
      }
    }

    // Directeur (if producing and not already included)
    if (user) {
      const dirResult = allResults.find((r) => r.userId === user.id);
      const alreadyIncluded = Array.from(teamMap.values()).some((t) =>
        t.producers.some((p) => p.userId === user.id)
      );
      if (dirResult && !alreadyIncluded) {
        const existing = teamMap.get("directeur") ?? { teamName: "Direction", producers: [] };
        existing.producers.push({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          teamName: "Direction",
          category: user.category,
          ratios: computeAllRatios(dirResult, user.category, ratioConfigs),
        });
        teamMap.set("directeur", existing);
      }
    }

    return Array.from(teamMap.values());
  }, [user, teams, allManagers, allResults, ratioConfigs]);

  // Agency CA
  const agencyCA = useMemo(
    () => allResults
      .filter((r) => allProducers.some((p) => p.id === r.userId))
      .reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
    [allProducers, allResults]
  );

  // Alignment chart data (4 themes only)
  const alignmentData = useMemo(() => {
    const alignThemes = [
      { key: "mandats", label: "Mandats", objKey: "mandats" as const, isCA: false },
      { key: "offres", label: "Offres", objKey: "offres" as const, isCA: false },
      { key: "actes", label: "Actes", objKey: "actes" as const, isCA: false },
      { key: "ca", label: "CA", objKey: "ca" as const, isCA: true },
    ];

    return alignThemes.map((t) => {
      const conseillerObj = allConseillers.reduce(
        (sum, c) => sum + (CATEGORY_OBJECTIVES[c.category]?.[t.objKey] ?? 0), 0
      );
      const managerObj = allManagers.reduce(
        (sum, m) => sum + (CATEGORY_OBJECTIVES[m.category]?.[t.objKey] ?? 0), 0
      );

      let agenceObj: number | null;
      if (t.isCA && agencyObjective) {
        agenceObj = Math.round(agencyObjective.annualCA / 12);
      } else {
        // Sum of all producers' objectives
        agenceObj = allProducers.reduce(
          (sum, p) => sum + (CATEGORY_OBJECTIVES[p.category]?.[t.objKey] ?? 0), 0
        );
      }

      const totalIndividual = conseillerObj + managerObj;
      const gap = agenceObj !== null ? Math.abs(agenceObj - totalIndividual) : 0;
      const ratio = totalIndividual > 0 && agenceObj !== null ? agenceObj / totalIndividual : 1;

      let status: "aligned" | "warning" | "danger";
      if (ratio >= 0.9 && ratio <= 1.1) status = "aligned";
      else if (ratio >= 0.8 && ratio <= 1.2) status = "warning";
      else status = "danger";

      return {
        ...t,
        conseillerObj,
        managerObj,
        agenceObj,
        gap,
        status,
        ratio,
      };
    });
  }, [allConseillers, allManagers, allProducers, agencyObjective]);

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">GPS Agence</h1>
            <p className="text-sm text-muted-foreground">
              Performance globale agence — tous producteurs confondus
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {producerCount} producteur{producerCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ═══ Agency-wide 7 ratio cards ═══ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ratios agence — Performance agrégée</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agencyRatios.map((ratio) => {
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
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Detail by team ═══ */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Détail par équipe et par collaborateur</h2>

        {ratioIds.map((ratioId) => {
          const config = ratioConfigs[ratioId];
          if (!config) return null;
          const agencyRatio = agencyRatios.find((r) => r.ratioId === ratioId);
          const agencySc = agencyRatio ? statusConfig[agencyRatio.status] : statusConfig.warning;
          const benchmark = MARKET_BENCHMARKS[ratioId];

          return (
            <div key={ratioId} className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div>
                  <h3 className="text-sm font-semibold">{config.name}</h3>
                  {agencyRatio && (
                    <p className={cn("text-xs font-medium", agencySc.color)}>
                      Agence : {config.isPercentage ? `${Math.round(agencyRatio.value)}%` : agencyRatio.value.toFixed(1)} {config.unit}
                      <span className="text-muted-foreground ml-2">({agencyRatio.percentageOfTarget}% de l'objectif)</span>
                    </p>
                  )}
                </div>
                {benchmark && (
                  <span className="text-xs text-muted-foreground">{formatBenchmark(ratioId)}</span>
                )}
              </div>

              <div className="divide-y divide-border">
                {producersByTeam.map((team) => (
                  <div key={team.teamName}>
                    <div className="bg-muted/30 px-5 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{team.teamName}</p>
                    </div>
                    {team.producers.map((producer) => {
                      const pRatio = producer.ratios.find((r) => r.ratioId === ratioId);
                      if (!pRatio) return null;
                      const pSc = statusConfig[pRatio.status];

                      return (
                        <div key={producer.userId} className="flex items-center gap-3 px-5 py-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {producer.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{producer.name}</p>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[producer.category as keyof typeof CATEGORY_COLORS])}>
                                {CATEGORY_LABELS[producer.category as keyof typeof CATEGORY_LABELS]}
                              </span>
                            </div>
                          </div>
                          <div className="w-20">
                            <ProgressBar value={pRatio.percentageOfTarget} status={pRatio.status} showValue={false} size="sm" />
                          </div>
                          <span className={cn("text-sm font-bold w-16 text-right", pSc.color)}>
                            {config.isPercentage ? `${Math.round(pRatio.value)}%` : pRatio.value.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Alignment chart ═══ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Alignement des objectifs</h2>
          <p className="text-xs text-muted-foreground">Comparaison des objectifs mensuels entre les niveaux</p>
        </div>

        <div style={{ width: "100%", height: "clamp(220px, 30vh, 360px)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={alignmentData.map((d) => ({
                theme: d.label,
                Conseillers: d.conseillerObj,
                Managers: d.managerObj,
                Agence: d.agenceObj ?? 0,
              }))}
              barGap={2}
            >
              <XAxis
                dataKey="theme"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card, #0F1F46)",
                  border: "1px solid var(--border, #1a2d5a)",
                  borderRadius: "8px",
                  color: "var(--foreground, white)",
                  fontSize: "12px",
                }}
                formatter={(value) => {
                  if (typeof value === "number" && value >= 1000) return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="Conseillers" fill={NXT_COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Managers" fill={NXT_COLORS.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Agence" fill={NXT_COLORS.violet} radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {alignmentData.map((d) => {
            const totalIndiv = d.conseillerObj + d.managerObj;
            const fmtVal = d.isCA ? formatCurrency(d.gap) : String(d.gap);
            let text: string;
            let colorClass: string;

            if (d.status === "aligned") {
              text = `${d.label} — Aligné`;
              colorClass = "text-green-500";
            } else if (d.agenceObj !== null && d.agenceObj > totalIndiv) {
              text = `${d.label} — Écart${d.status === "danger" ? " important" : ""} de ${fmtVal} : objectif agence supérieur`;
              colorClass = d.status === "danger" ? "text-red-500" : "text-orange-500";
            } else {
              text = `${d.label} — Écart${d.status === "danger" ? " important" : ""} de ${fmtVal} : cumul individuel supérieur`;
              colorClass = d.status === "danger" ? "text-red-500" : "text-orange-500";
            }

            return (
              <p key={d.key} className={cn("text-xs font-medium", colorClass)}>
                {text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
