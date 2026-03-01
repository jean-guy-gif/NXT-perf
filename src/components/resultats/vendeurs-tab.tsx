"use client";

import {
  CalendarCheck,
  ClipboardCheck,
  FileSignature,
  RefreshCw,
  TrendingDown,
  Eye,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MandatBlock } from "./mandat-block";
import { FIELD_TOOLTIPS } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

interface VendeursTabProps {
  results: PeriodResults;
}

export function VendeursTab({ results }: VendeursTabProps) {
  const { vendeurs } = results;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="RDV Estimation"
          value={vendeurs.rdvEstimation}
          icon={CalendarCheck}
          status="ok"
          tooltip={FIELD_TOOLTIPS.rdvEstimation}
        />
        <KpiCard
          title="Estimations réalisées"
          value={vendeurs.estimationsRealisees}
          icon={ClipboardCheck}
          status="ok"
          tooltip={FIELD_TOOLTIPS.estimationsRealisees}
        />
        <KpiCard
          title="Mandats signés"
          value={vendeurs.mandatsSignes}
          icon={FileSignature}
          status="ok"
          tooltip={FIELD_TOOLTIPS.mandatsSignes}
        />
      </div>

      {vendeurs.mandats.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">
            Détail des mandats ({vendeurs.mandats.length})
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vendeurs.mandats.map((mandat) => (
              <MandatBlock key={mandat.id} mandat={mandat} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="RDV de suivi"
          value={vendeurs.rdvSuivi}
          icon={Eye}
          status="ok"
          tooltip={FIELD_TOOLTIPS.rdvSuivi}
        />
        <KpiCard
          title="Requalification → exclusif"
          value={vendeurs.requalificationSimpleExclusif}
          icon={RefreshCw}
          status={vendeurs.requalificationSimpleExclusif > 0 ? "ok" : "warning"}
          tooltip={FIELD_TOOLTIPS.requalification}
        />
        <KpiCard
          title="Baisse de prix"
          value={vendeurs.baissePrix}
          icon={TrendingDown}
          status={vendeurs.baissePrix === 0 ? "ok" : "warning"}
          tooltip={FIELD_TOOLTIPS.baissePrix}
        />
      </div>
    </div>
  );
}
