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
        />
        <KpiCard
          title="Estimations réalisées"
          value={vendeurs.estimationsRealisees}
          icon={ClipboardCheck}
          status="ok"
        />
        <KpiCard
          title="Mandats signés"
          value={vendeurs.mandatsSignes}
          icon={FileSignature}
          status="ok"
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
        />
        <KpiCard
          title="Requalification → exclusif"
          value={vendeurs.requalificationSimpleExclusif}
          icon={RefreshCw}
          status={vendeurs.requalificationSimpleExclusif > 0 ? "ok" : "warning"}
        />
        <KpiCard
          title="Baisse de prix"
          value={vendeurs.baissePrix}
          icon={TrendingDown}
          status={vendeurs.baissePrix === 0 ? "ok" : "warning"}
        />
      </div>
    </div>
  );
}
