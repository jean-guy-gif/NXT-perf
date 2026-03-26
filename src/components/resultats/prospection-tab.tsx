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
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface ProspectionTabProps {
  results: PeriodResults;
}

export function ProspectionTab({ results }: ProspectionTabProps) {
  const updateInfoVenteStatut = useAppStore((s) => s.updateInfoVenteStatut);
  const markInfoVenteProfiled = useAppStore((s) => s.markInfoVenteProfiled);
  const { persistResult } = useSupabaseResults();
  const { prospection } = results;

  const handleRemove = (itemId: string, reason: "deale" | "abandonne") => {
    updateInfoVenteStatut(results.id, itemId, reason);
    setTimeout(() => {
      const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
      if (fresh) persistResult(fresh);
    }, 0);
  };

  const handleProfile = (itemId: string) => {
    markInfoVenteProfiled(results.id, itemId);
    setTimeout(() => {
      const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
      if (fresh) persistResult(fresh);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        items={prospection.informationsVente.filter((i) => i.statut === "en_cours")}
        label="Informations de vente obtenues"
        onRemove={handleRemove}
        onProfile={handleProfile}
      />
    </div>
  );
}
