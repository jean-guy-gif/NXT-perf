"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Network,
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  Trophy,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useNetworkData } from "@/hooks/use-network-data";
import type { AgencyAggregate } from "@/hooks/use-network-data";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

type SortKey = "ca" | "mandats" | "exclusivite" | "offres" | "performance" | "actes";

export default function ReseauDashboardPage() {
  const router = useRouter();
  const { agencies, networkStats, topAgents, topManagers } = useNetworkData();
  const [sortKey, setSortKey] = useState<SortKey>("performance");
  const [sortDesc, setSortDesc] = useState(true);

  const alertAgencies = agencies.filter((a) => a.alerts.length > 0);

  const sortedAgencies = [...agencies].sort((a, b) => {
    const getValue = (agency: AgencyAggregate) => {
      switch (sortKey) {
        case "ca": return agency.totalCA;
        case "mandats": return agency.totalMandats;
        case "exclusivite": return agency.avgExclusivite;
        case "offres": return agency.totalOffres;
        case "performance": return agency.avgPerformance;
        case "actes": return agency.totalActes;
      }
    };
    const diff = getValue(a) - getValue(b);
    return sortDesc ? -diff : diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function perfColor(value: number) {
    if (value >= 100) return "text-green-500";
    if (value >= 80) return "text-orange-500";
    return "text-red-500";
  }

  function perfBg(value: number) {
    if (value >= 100) return "bg-green-500/10 text-green-500";
    if (value >= 80) return "bg-orange-500/10 text-orange-500";
    return "bg-red-500/10 text-red-500";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord Réseau</h1>
          <p className="text-sm text-muted-foreground">
            Vision consolidée de la performance multi-agences
          </p>
        </div>
      </div>

      {/* KPIs consolidés */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard
          label="Chiffre d'affaires"
          value={formatCurrency(networkStats.totalCA)}
          accent
        />
        <KpiCard
          label="Agences"
          value={formatNumber(networkStats.agencyCount)}
          icon={<Building2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Collaborateurs"
          value={formatNumber(networkStats.totalAgents)}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Mandats"
          value={formatNumber(networkStats.totalMandats)}
        />
        <KpiCard
          label="Compromis"
          value={formatNumber(networkStats.totalCompromis)}
        />
        <KpiCard
          label="Actes"
          value={formatNumber(networkStats.totalActes)}
        />
        <KpiCard
          label="% Exclusivité"
          value={`${networkStats.avgExclusivite} %`}
        />
        <KpiCard
          label="Score moyen"
          value={`${networkStats.avgPerformance} %`}
          className={perfColor(networkStats.avgPerformance)}
        />
      </div>

      {/* Agences en alerte */}
      {alertAgencies.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Agences à suivre en priorité</h3>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
              {alertAgencies.length}
            </span>
          </div>
          <div className="divide-y divide-border">
            {alertAgencies.map((agency) => (
              <button
                key={agency.institutionId}
                onClick={() => router.push(`/reseau/agence?id=${agency.institutionId}`)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{agency.institutionName}</p>
                  <p className="text-xs text-muted-foreground">
                    Directeur : {agency.directeurName} · {agency.agentCount} collaborateurs
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {agency.alerts.map((alert, i) => (
                      <span
                        key={i}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          alert.severity === "critical"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-amber-500/10 text-amber-500"
                        )}
                      >
                        {alert.message}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn("text-lg font-bold", perfColor(agency.avgPerformance))}>
                    {agency.avgPerformance}%
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Classement des agences */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Classement des agences</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Agence</th>
                <th className="px-4 py-2">Directeur</th>
                <th className="hidden px-4 py-2 text-right sm:table-cell">Collab.</th>
                <SortHeader label="CA" sortKey="ca" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <SortHeader label="Mandats" sortKey="mandats" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <SortHeader label="Exclu." sortKey="exclusivite" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <SortHeader label="Offres" sortKey="offres" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <SortHeader label="Actes" sortKey="actes" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <SortHeader label="Score" sortKey="performance" current={sortKey} desc={sortDesc} onSort={handleSort} />
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedAgencies.map((agency, idx) => (
                <tr
                  key={agency.institutionId}
                  onClick={() => router.push(`/reseau/agence?id=${agency.institutionId}`)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{agency.institutionName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{agency.directeurName}</td>
                  <td className="hidden px-4 py-3 text-right sm:table-cell">{agency.agentCount}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(agency.totalCA)}</td>
                  <td className="px-4 py-3 text-right">{agency.totalMandats}</td>
                  <td className="px-4 py-3 text-right">{agency.avgExclusivite}%</td>
                  <td className="px-4 py-3 text-right">{agency.totalOffres}</td>
                  <td className="px-4 py-3 text-right">{agency.totalActes}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", perfBg(agency.avgPerformance))}>
                      {agency.avgPerformance}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top performers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top agents */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Top conseillers réseau</h3>
          </div>
          <div className="divide-y divide-border">
            {topAgents.map((p, i) => (
              <div key={p.user.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                  i === 0 ? "bg-amber-500/20 text-amber-500" :
                  i === 1 ? "bg-slate-400/20 text-slate-400" :
                  i === 2 ? "bg-orange-600/20 text-orange-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.user.firstName} {p.user.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">{p.institutionName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold", perfColor(p.score))}>{p.score}%</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(p.ca)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top managers */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Top managers réseau</h3>
          </div>
          <div className="divide-y divide-border">
            {topManagers.map((p, i) => (
              <div key={p.user.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                  i === 0 ? "bg-amber-500/20 text-amber-500" :
                  i === 1 ? "bg-slate-400/20 text-slate-400" :
                  i === 2 ? "bg-orange-600/20 text-orange-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.user.firstName} {p.user.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">{p.institutionName} · {p.role === "directeur" ? "Directeur" : "Manager"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold", perfColor(p.score))}>{p.score}%</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(p.ca)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
  label,
  value,
  icon,
  accent,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card px-3 py-3",
      accent && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className={cn("mt-1 text-lg font-bold", className)}>{value}</p>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  desc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  desc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = current === sortKey;
  return (
    <th className="hidden px-4 py-2 text-right sm:table-cell">
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs transition-colors",
          isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {isActive && (
          desc
            ? <ArrowDownRight className="h-3 w-3" />
            : <ArrowUpRight className="h-3 w-3" />
        )}
      </button>
    </th>
  );
}
