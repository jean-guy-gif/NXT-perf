"use client";

import {
  Phone,
  PhoneIncoming,
  CalendarCheck,
  Info,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DynamicInfoFields } from "./dynamic-info-fields";
import { useAppStore } from "@/stores/app-store";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";
import type { RemovalReason } from "@/stores/app-store";

interface ProspectionTabProps {
  results: PeriodResults;
}

export function ProspectionTab({ results }: ProspectionTabProps) {
  const removeInfoVente = useAppStore((s) => s.removeInfoVente);
  const { prospection } = results;

  const handleRemove = (itemId: string, reason: RemovalReason) => {
    removeInfoVente(results.id, itemId, reason);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Contacts entrants"
          value={prospection.contactsEntrants}
          icon={PhoneIncoming}
          status="ok"
          tooltip={FIELD_TOOLTIPS.contactsEntrants}
        />
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
        <KpiCard
          title="Infos de vente"
          value={prospection.informationsVente.length}
          icon={Info}
          status="ok"
          tooltip={FIELD_TOOLTIPS.infosVente}
        />
      </div>

      <DynamicInfoFields
        items={prospection.informationsVente}
        label="Informations de vente obtenues"
        onRemove={handleRemove}
      />
    </div>
  );
}
