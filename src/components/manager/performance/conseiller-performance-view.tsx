"use client";

import { useState, useMemo } from "react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { useAppStore } from "@/stores/app-store";
import { useResults } from "@/hooks/use-results";
import { computeAllRatios } from "@/lib/ratios";
import { CATEGORY_LABELS } from "@/lib/constants";
import { RatioDrillDownModal } from "@/components/dashboard/ratio-drill-down-modal";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { RatioId } from "@/types/ratios";
import type { User } from "@/types/user";
import { ManagerRatioCard } from "./manager-ratio-card";

interface ConseillerPerformanceViewProps {
  userId: string;
  viewMode: "chiffres" | "pourcentages";
}

export function ConseillerPerformanceView({
  userId,
  viewMode,
}: ConseillerPerformanceViewProps) {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);
  const results = useResults(userId);

  const [selectedRatioId, setSelectedRatioId] = useState<RatioId | null>(null);
  const [expandedRatio, setExpandedRatio] = useState<RatioId | null>(null);

  const conseiller: User | null = useMemo(
    () => users.find((u) => u.id === userId) ?? null,
    [users, userId],
  );

  // Calcul ratios avec la category du conseiller (pas du manager)
  const computedRatios = useMemo(() => {
    if (!results || !conseiller) return [];
    return computeAllRatios(results, conseiller.category, ratioConfigs);
  }, [results, conseiller, ratioConfigs]);

  if (!conseiller || !results || computedRatios.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune donnée disponible pour ce conseiller.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {computedRatios.map((ratio) => {
          const config = ratioConfigs[ratio.ratioId as RatioId];
          if (!config) return null;

          const isWeakRatio =
            ratio.status === "warning" || ratio.status === "danger";
          const isExpanded = expandedRatio === ratio.ratioId;

          // Improve section (mode individual uniquement) — affiché si warning/danger
          const improveSection = isWeakRatio ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedRatio(isExpanded ? null : (ratio.ratioId as RatioId));
                }}
                className="mt-3 w-full text-left text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {isExpanded ? "Fermer ✕" : "Améliorer ce ratio →"}
              </button>
              {isExpanded && (
                <div
                  className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-3 text-xs text-muted-foreground">
                    Le {config.name.split("→")[0].trim().toLowerCase()} de{" "}
                    {conseiller.firstName} est à{" "}
                    {Math.round(ratio.percentageOfTarget)}% de l&apos;objectif{" "}
                    {CATEGORY_LABELS[conseiller.category]}.
                  </p>
                  <ImprovementCatalogue
                    gap={100 - ratio.percentageOfTarget}
                    ratioName={config.name.split("→")[0].trim().toLowerCase()}
                    ratioId={
                      RATIO_ID_TO_EXPERTISE_ID[ratio.ratioId as RatioId] ?? undefined
                    }
                  />
                </div>
              )}
            </>
          ) : null;

          return (
            <ManagerRatioCard
              key={ratio.ratioId}
              ratio={ratio}
              config={config}
              viewMode={viewMode}
              isTeamMode={false}
              thresholdLabel={CATEGORY_LABELS[conseiller.category]}
              onSelect={() => setSelectedRatioId(ratio.ratioId as RatioId)}
              improveSection={improveSection}
            />
          );
        })}
      </div>

      <Tooltip
        id="manager-ratio-tooltip"
        place="top"
        className="!max-w-xs !rounded-lg !text-xs !leading-relaxed"
      />

      {selectedRatioId && results && (
        <RatioDrillDownModal
          ratioId={selectedRatioId}
          computedRatio={computedRatios.find((r) => r.ratioId === selectedRatioId)!}
          ratioConfig={ratioConfigs[selectedRatioId]}
          results={results}
          onClose={() => setSelectedRatioId(null)}
        />
      )}
    </>
  );
}
