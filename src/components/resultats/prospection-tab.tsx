"use client";

import { Phone, CalendarCheck } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface ProspectionTabProps {
  results: PeriodResults;
}

export function ProspectionTab({ results }: ProspectionTabProps) {
  const { prospection } = results;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Contacts totaux"
          value={prospection.contactsTotaux}
          icon={Phone}
          status="ok"
          tooltip={FIELD_TOOLTIPS.contactsTotaux}
        />
        <KpiCard
          title="RDV Estimation"
          value={prospection.rdvEstimation}
          icon={CalendarCheck}
          status="ok"
          tooltip={FIELD_TOOLTIPS.rdvEstimation}
        />
      </div>
    </div>
  );
}
