"use client";

import type { LucideIcon } from "lucide-react";

/* ────── Props ────── */
interface ScopeKpiGridProps {
  kpis: Array<{ label: string; value: string; icon: LucideIcon }>;
}

/* ────── Component ────── */
export function ScopeKpiGrid({ kpis }: ScopeKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
