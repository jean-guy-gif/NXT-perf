"use client";

import { FileCheck, DollarSign } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/charts/line-chart";
import { formatCurrency } from "@/lib/formatters";
import { mockMonthlyCA } from "@/data/mock-results";
import { NXT_COLORS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface VentesTabProps {
  results: PeriodResults;
}

export function VentesTab({ results }: VentesTabProps) {
  const { ventes } = results;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Actes signés"
          value={ventes.actesSignes}
          icon={FileCheck}
          status="ok"
        />
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(ventes.chiffreAffaires)}
          icon={DollarSign}
          status="ok"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold text-foreground">
          Évolution du chiffre d&apos;affaires
        </h3>
        <LineChart
          data={mockMonthlyCA}
          xKey="month"
          lines={[
            { dataKey: "ca", color: NXT_COLORS.green, name: "CA (€)" },
          ]}
          height={250}
          showGrid
        />
      </div>
    </div>
  );
}
