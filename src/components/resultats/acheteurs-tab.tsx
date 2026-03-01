"use client";

import {
  Flame,
  UserCheck,
  Eye,
  FileText,
  Handshake,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DynamicInfoFields } from "./dynamic-info-fields";
import { useAppStore } from "@/stores/app-store";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";
import type { RemovalReason } from "@/stores/app-store";

interface AcheteursTabProps {
  results: PeriodResults;
}

export function AcheteursTab({ results }: AcheteursTabProps) {
  const removeAcheteurChaud = useAppStore((s) => s.removeAcheteurChaud);
  const { acheteurs } = results;

  const handleRemove = (itemId: string, reason: RemovalReason) => {
    removeAcheteurChaud(results.id, itemId, reason);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Acheteurs chauds"
          value={acheteurs.acheteursChauds.length}
          icon={Flame}
          status="ok"
          tooltip={FIELD_TOOLTIPS.acheteursChauds}
        />
        <KpiCard
          title="Sortis en visite"
          value={acheteurs.acheteursSortisVisite}
          icon={UserCheck}
          status="ok"
          tooltip={FIELD_TOOLTIPS.acheteursSortisVisite}
        />
        <KpiCard
          title="Nombre de visites"
          value={acheteurs.nombreVisites}
          icon={Eye}
          status="ok"
          tooltip={FIELD_TOOLTIPS.nombreVisites}
        />
        <KpiCard
          title="Offres reçues"
          value={acheteurs.offresRecues}
          icon={FileText}
          status="ok"
          tooltip={FIELD_TOOLTIPS.offresRecues}
        />
        <KpiCard
          title="Compromis signés"
          value={acheteurs.compromisSignes}
          icon={Handshake}
          status="ok"
          tooltip={FIELD_TOOLTIPS.compromisSignes}
        />
      </div>

      <DynamicInfoFields
        items={acheteurs.acheteursChauds}
        label="Détail acheteurs chauds"
        onRemove={handleRemove}
      />
    </div>
  );
}
