"use client";

import { useMemo } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { calculateCumulativeROI } from "@/lib/roi-calculator";
import { getAvgCommissionEur } from "@/lib/get-avg-commission";
import { RoiCompteurCard } from "@/components/conseiller/progression/roi-compteur-card";
import { RoiBreakdownCard } from "@/components/conseiller/progression/roi-breakdown-card";
import { CaEvolutionChart } from "@/components/conseiller/progression/ca-evolution-chart";
import { PlansHistoryCard } from "@/components/conseiller/progression/plans-history-card";
import { DpiMonthlyCard } from "@/components/conseiller/progression/dpi-monthly-card";
import { ObjectivesProgressCard } from "@/components/conseiller/progression/objectives-progress-card";

export default function ConseillerProgressionPage() {
  const { user } = useUser();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { allPlans } = useImprovementResources();

  const roiSummary = useMemo(() => {
    const myHistory = user
      ? allResults.filter((r) => r.userId === user.id)
      : [];
    const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
    return calculateCumulativeROI(allPlans, avg);
  }, [user, allResults, agencyObjective, allPlans]);

  return (
    <div className="space-y-6 pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LineChartIcon className="h-3.5 w-3.5" />
          Ma progression
        </div>
        <h1 className="text-3xl font-bold text-foreground">Ma progression</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Votre ROI cumulé, l'origine de vos gains, votre courbe vs marché et
          votre DPI mensuel.
        </p>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4">
        {/* Bloc 1 — ROI vedette */}
        <RoiCompteurCard summary={roiSummary} />

        {/* Bloc 2 — Décomposition gain */}
        <RoiBreakdownCard summary={roiSummary} />

        {/* Bloc 3 — Courbe CA vs marché */}
        <CaEvolutionChart />

        {/* Bloc 4 — Historique plans 30j */}
        <PlansHistoryCard plans={allPlans} />

        {/* Bloc 5 — DPI mensuel */}
        <DpiMonthlyCard />

        {/* Bloc 6 — Objectifs */}
        <ObjectivesProgressCard />
      </div>
    </div>
  );
}
