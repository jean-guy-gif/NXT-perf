"use client";

import { FileCheck, DollarSign } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/charts";
import { formatCurrency } from "@/lib/formatters";
import { mockMonthlyCA } from "@/data/mock-results";
import { NXT_COLORS, FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface VentesTabProps {
  results: PeriodResults;
}

export function VentesTab({ results }: VentesTabProps) {
  const { ventes } = results;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <KpiCard
          title="Actes signés"
          value={ventes.actesSignes}
          icon={FileCheck}
          status="ok"
          tooltip={FIELD_TOOLTIPS.actesSignes}
        />
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(ventes.chiffreAffaires)}
          icon={DollarSign}
          status="ok"
          tooltip={FIELD_TOOLTIPS.chiffreAffaires}
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
