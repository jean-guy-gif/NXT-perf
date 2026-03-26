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
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface AcheteursTabProps {
  results: PeriodResults;
}

export function AcheteursTab({ results }: AcheteursTabProps) {
  const updateAcheteurChaudStatut = useAppStore((s) => s.updateAcheteurChaudStatut);
  const markAcheteurChaudProfiled = useAppStore((s) => s.markAcheteurChaudProfiled);
  const { persistResult } = useSupabaseResults();
  const { acheteurs } = results;

  const handleRemove = (itemId: string, reason: "deale" | "abandonne") => {
    updateAcheteurChaudStatut(results.id, itemId, reason);
    setTimeout(() => {
      const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
      if (fresh) persistResult(fresh);
    }, 0);
  };

  const handleProfile = (itemId: string) => {
    markAcheteurChaudProfiled(results.id, itemId);
    setTimeout(() => {
      const fresh = useAppStore.getState().results.find((r) => r.id === results.id);
      if (fresh) persistResult(fresh);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
        items={acheteurs.acheteursChauds.filter((i) => i.statut === "en_cours")}
        label="Détail acheteurs chauds"
        onRemove={handleRemove}
        onProfile={handleProfile}
      />
    </div>
  );
}
