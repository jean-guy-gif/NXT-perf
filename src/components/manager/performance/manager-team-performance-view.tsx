"use client";

import { useState, useMemo } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useAppStore } from "@/stores/app-store";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { computeAllRatios } from "@/lib/ratios";
import { aggregateResults } from "@/lib/aggregate-results";
import type { PeriodResults } from "@/types/results";
import type { RatioId } from "@/types/ratios";
import { ManagerRatioCard } from "./manager-ratio-card";
import { ManagerRatioDrillDown } from "./manager-ratio-drill-down";

interface ManagerTeamPerformanceViewProps {
  viewMode: "chiffres" | "pourcentages";
}

export function ManagerTeamPerformanceView({
  viewMode,
}: ManagerTeamPerformanceViewProps) {
  const { conseillers, perConseillerResults } = useTeamResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { setScope, selectConseiller } = useManagerScope();
  const [selectedRatioId, setSelectedRatioId] = useState<RatioId | null>(null);

  // Pool concaténé : aggregate des results des conseillers
  const aggregatedResults = useMemo<PeriodResults | null>(() => {
    const list = conseillers
      .map((c) => perConseillerResults.get(c.id))
      .filter((r): r is PeriodResults => r !== null && r !== undefined);
    return aggregateResults(list);
  }, [conseillers, perConseillerResults]);

  // Ratios calculés sur le pool concaténé avec category "confirme" (référence équipe — D2)
  const teamRatios = useMemo(() => {
    if (!aggregatedResults) return [];
    return computeAllRatios(aggregatedResults, "confirme", ratioConfigs);
  }, [aggregatedResults, ratioConfigs]);

  const selectedConfig = selectedRatioId ? ratioConfigs[selectedRatioId] : null;
  const selectedRatio = selectedRatioId
    ? teamRatios.find((r) => r.ratioId === selectedRatioId) ?? null
    : null;

  const handleDiscuterAvec = (conseillerId: string) => {
    setScope("individual");
    selectConseiller(conseillerId);
    setSelectedRatioId(null);
  };

  if (!aggregatedResults || teamRatios.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune donnée disponible pour l&apos;équipe.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {teamRatios.map((ratio) => {
          const config = ratioConfigs[ratio.ratioId as RatioId];
          if (!config) return null;
          return (
            <ManagerRatioCard
              key={ratio.ratioId}
              ratio={ratio}
              config={config}
              viewMode={viewMode}
              isTeamMode={true}
              thresholdLabel="Confirmé (référence équipe)"
              onSelect={() => setSelectedRatioId(ratio.ratioId as RatioId)}
            />
          );
        })}
      </div>

      <Tooltip
        id="manager-ratio-tooltip"
        place="top"
        className="!max-w-xs !rounded-lg !text-xs !leading-relaxed"
      />

      {selectedRatioId && selectedConfig && selectedRatio && (
        <ManagerRatioDrillDown
          ratioId={selectedRatioId}
          config={selectedConfig}
          aggregateRatio={selectedRatio}
          conseillers={conseillers}
          perConseillerResults={perConseillerResults}
          ratioConfigs={ratioConfigs}
          onClose={() => setSelectedRatioId(null)}
          onDiscuterAvec={handleDiscuterAvec}
        />
      )}
    </>
  );
}
