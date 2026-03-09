"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  Building2,
  ChevronLeft,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useNetworkData } from "@/hooks/use-network-data";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";

function computeScore(
  user: User,
  allResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>
): number {
  const results = allResults.find((r) => r.userId === user.id);
  if (!results) return 0;
  const ratios = computeAllRatios(results, user.category, ratioConfigs);
  if (ratios.length === 0) return 0;
  return Math.round(
    ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length
  );
}

function perfBg(value: number) {
  if (value >= 100) return "bg-green-500/10 text-green-500";
  if (value >= 80) return "bg-orange-500/10 text-orange-500";
  return "bg-red-500/10 text-red-500";
}

function perfColor(value: number) {
  if (value >= 100) return "text-green-500";
  if (value >= 80) return "text-orange-500";
  return "text-red-500";
}

function AgenceDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const { agencies, networkStats, allResults, ratioConfigs } = useNetworkData();

  const agency = agencies.find((a) => a.institutionId === id);

  if (!agency) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Agence introuvable.</p>
        <button
          onClick={() => router.push("/reseau/dashboard")}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Retour au réseau
        </button>
      </div>
    );
  }

  // All users (agents + managers) for this agency
  const allAgencyUsers = [...agency.agents, ...agency.managers];

  // Compute per-user stats
  const userStats = allAgencyUsers.map((user) => {
    const res = allResults.find((r) => r.userId === user.id);
    const score = computeScore(user, allResults, ratioConfigs);
    return {
      user,
      ca: res?.ventes.chiffreAffaires ?? 0,
      actes: res?.ventes.actesSignes ?? 0,
      mandats: res?.vendeurs.mandats.length ?? 0,
      exclusifs: res?.vendeurs.mandats.filter((m) => m.type === "exclusif").length ?? 0,
      offres: res?.acheteurs.offresRecues ?? 0,
      compromis: res?.acheteurs.compromisSignes ?? 0,
      visites: res?.acheteurs.nombreVisites ?? 0,
      estimations: res?.vendeurs.estimationsRealisees ?? 0,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  // Benchmark: agency vs network averages
  const benchmarks = [
    {
      label: "Score moyen",
      agency: agency.avgPerformance,
      network: networkStats.avgPerformance,
      suffix: "%",
    },
    {
      label: "% Exclusivité",
      agency: agency.avgExclusivite,
      network: networkStats.avgExclusivite,
      suffix: "%",
    },
    {
      label: "CA / agent",
      agency: agency.agentCount > 0 ? Math.round(agency.totalCA / agency.agentCount) : 0,
      network: networkStats.totalAgents > 0 ? Math.round(networkStats.totalCA / networkStats.totalAgents) : 0,
      isCurrency: true,
    },
    {
      label: "Mandats / agent",
      agency: agency.agentCount > 0 ? +(agency.totalMandats / agency.agentCount).toFixed(1) : 0,
      network: networkStats.totalAgents > 0 ? +(networkStats.totalMandats / networkStats.totalAgents).toFixed(1) : 0,
    },
    {
      label: "Offres / agent",
      agency: agency.agentCount > 0 ? +(agency.totalOffres / agency.agentCount).toFixed(1) : 0,
      network: networkStats.totalAgents > 0 ? +(networkStats.totalOffres / networkStats.totalAgents).toFixed(1) : 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/reseau/dashboard")}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{agency.institutionName}</h1>
          <p className="text-sm text-muted-foreground">
            Directeur : {agency.directeurName} · {agency.agentCount} collaborateurs · {agency.managerCount} encadrants
          </p>
        </div>
      </div>

      {/* Alertes */}
      {agency.alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agency.alerts.map((alert, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                alert.severity === "critical"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-amber-500/10 text-amber-500"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {alert.message}
            </span>
          ))}
        </div>
      )}

      {/* KPIs agence */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">CA</span>
          <p className="mt-1 text-lg font-bold">{formatCurrency(agency.totalCA)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Mandats</span>
          <p className="mt-1 text-lg font-bold">{agency.totalMandats}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">% Exclusivité</span>
          <p className="mt-1 text-lg font-bold">{agency.avgExclusivite}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Offres</span>
          <p className="mt-1 text-lg font-bold">{agency.totalOffres}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Compromis</span>
          <p className="mt-1 text-lg font-bold">{agency.totalCompromis}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Actes</span>
          <p className="mt-1 text-lg font-bold">{agency.totalActes}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Score</span>
          <p className={cn("mt-1 text-lg font-bold", perfColor(agency.avgPerformance))}>
            {agency.avgPerformance}%
          </p>
        </div>
      </div>

      {/* Benchmark agence vs réseau */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Benchmark agence vs réseau</h3>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-5 sm:divide-x sm:divide-y-0">
          {benchmarks.map((b) => {
            const diff = b.agency - b.network;
            const isAbove = diff >= 0;
            return (
              <div key={b.label} className="px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{b.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold">
                    {b.isCurrency ? formatCurrency(b.agency) : `${b.agency}${b.suffix ?? ""}`}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    isAbove ? "text-green-500" : "text-red-500"
                  )}>
                    {isAbove ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    vs {b.isCurrency ? formatCurrency(b.network) : `${b.network}${b.suffix ?? ""}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collaborateurs */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Collaborateurs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Collaborateur</th>
                <th className="px-4 py-2">Catégorie</th>
                <th className="hidden px-4 py-2 text-right sm:table-cell">CA</th>
                <th className="hidden px-4 py-2 text-right sm:table-cell">Mandats</th>
                <th className="hidden px-4 py-2 text-right md:table-cell">Offres</th>
                <th className="hidden px-4 py-2 text-right md:table-cell">Compromis</th>
                <th className="hidden px-4 py-2 text-right md:table-cell">Actes</th>
                <th className="px-4 py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((us) => {
                const roleLabel =
                  us.user.role === "directeur" ? "DIR" :
                  us.user.role === "manager" ? "MGR" : null;
                return (
                  <tr key={us.user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {roleLabel && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/15 text-violet-400">
                            {roleLabel}
                          </span>
                        )}
                        <span className="font-medium">{us.user.firstName} {us.user.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {CATEGORY_LABELS[us.user.category] ?? us.user.category}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right sm:table-cell font-medium">
                      {formatCurrency(us.ca)}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right sm:table-cell">{us.mandats}</td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">{us.offres}</td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">{us.compromis}</td>
                    <td className="hidden px-4 py-2.5 text-right md:table-cell">{us.actes}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", perfBg(us.score))}>
                        {us.score}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AgenceDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">Chargement...</div>}>
      <AgenceDetailContent />
    </Suspense>
  );
}
