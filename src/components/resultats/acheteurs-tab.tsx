"use client";

import { UserCheck, Eye, FileText, Handshake, Banknote } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface AcheteursTabProps {
  results: PeriodResults;
}

export function AcheteursTab({ results }: AcheteursTabProps) {
  const { acheteurs } = results;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <KpiCard
          title="CA compromis"
          value={acheteurs.chiffreAffairesCompromis}
          icon={Banknote}
          status="ok"
          tooltip={FIELD_TOOLTIPS.chiffreAffairesCompromis}
        />
      </div>
    </div>
  );
}
