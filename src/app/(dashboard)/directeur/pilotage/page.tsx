"use client";

import { useMemo, useState } from "react";
import { Compass, ChevronDown, ChevronUp } from "lucide-react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { computeAllRatios } from "@/lib/ratios";
import { getGlobalScore, globalScoreToHumanScore } from "@/lib/scoring";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { ProductionChain } from "@/components/dashboard/production-chain";
import { useDirecteurScope } from "@/hooks/use-directeur-scope";
import type { ComputedRatio } from "@/types/ratios";

export default function PilotageAgencePage() {
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const { allConseillers, allResults, ratioConfigs } = useDirectorData();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  function resolveTeamLabel(teamId: string): string {
    const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
    if (fromInfos) return fromInfos;
    const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
    return manager ? `Équipe de ${manager.firstName}` : "équipe";
  }

  // Saisie objectif CA (uniquement pertinent en scope agence)
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const setAgencyObjective = useAppStore((s) => s.setAgencyObjective);
  const [showSaisie, setShowSaisie] = useState(!agencyObjective);
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 0);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 0);

  function handleSave() {
    if (annualCA > 0 && avgActValue > 0) {
      setAgencyObjective({ annualCA, avgActValue });
      setShowSaisie(false);
    }
  }

  // Score scope-aware : recalculé en filtrant `allConseillers` selon le scope
  const scopedScore = useMemo(() => {
    let pool: typeof allConseillers;
    if (scope === "conseiller" && scopeId) {
      pool = allConseillers.filter((c) => c.id === scopeId);
    } else if (scope === "equipe" && scopeId) {
      pool = allConseillers.filter((c) => c.teamId === scopeId);
    } else {
      pool = allConseillers;
    }
    if (pool.length === 0) return null;
    const ratios: ComputedRatio[] = pool.flatMap((c) => {
      const res = allResults.find((r) => r.userId === c.id);
      return res ? computeAllRatios(res, c.category, ratioConfigs) : [];
    });
    if (ratios.length === 0) return null;
    return getGlobalScore(ratios);
  }, [scope, scopeId, allConseillers, allResults, ratioConfigs]);

  // Titre + sous-titre dynamiques selon scope
  const { title, subtitle } = useMemo(() => {
    if (scope === "conseiller" && scopeId) {
      const c = users.find((u) => u.id === scopeId);
      const baseName = c
        ? `${c.firstName} ${c.lastName}`
        : null;
      const ctxSuffix = teamContext ? ` (${resolveTeamLabel(teamContext)})` : "";
      return {
        title: baseName
          ? `Pilotage Conseiller — ${baseName}${ctxSuffix}`
          : "Pilotage Conseiller",
        subtitle: "GPS de performance conseiller — données mensuelles",
      };
    }
    if (scope === "equipe" && scopeId) {
      return {
        title: `Pilotage Équipe — ${resolveTeamLabel(scopeId)}`,
        subtitle: "GPS de performance équipe — données mensuelles",
      };
    }
    return {
      title: "Pilotage Agence",
      subtitle: "GPS de performance agence — données mensuelles",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, teamContext, users, teamInfos]);

  // Mapping vers props ProductionChain (déjà scope-aware)
  const chainProps =
    scope === "conseiller" && scopeId
      ? ({ scope: "individual" as const, userId: scopeId })
      : scope === "equipe" && scopeId
        ? ({ scope: "team" as const, teamId: scopeId })
        : ({ scope: "agency" as const });

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {scopedScore && (
            <ScoreBadge score={globalScoreToHumanScore(scopedScore)} size="md" />
          )}
        </div>
      </div>

      {/* ═══ Production Chain (scope-aware) ═══ */}
      <ProductionChain {...chainProps} />

      {/* ═══ Saisie objectif CA — uniquement en scope agence ═══ */}
      {scope === "agence" && (
        <div className="rounded-lg border border-border bg-card">
          <button
            onClick={() => setShowSaisie(!showSaisie)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
          >
            <span>
              Objectif CA agence{" "}
              {agencyObjective
                ? `— ${formatCurrency(agencyObjective.annualCA)}/an`
                : "(non défini)"}
            </span>
            {showSaisie ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showSaisie && (
            <div className="border-t border-border px-4 py-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    CA annuel agence
                  </label>
                  <input
                    type="number"
                    value={annualCA || ""}
                    onChange={(e) => setAnnualCA(Number(e.target.value))}
                    placeholder="500000"
                    className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Valeur moyenne d&apos;un acte
                  </label>
                  <input
                    type="number"
                    value={avgActValue || ""}
                    onChange={(e) => setAvgActValue(Number(e.target.value))}
                    placeholder="8000"
                    className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSave}
                    className={cn(
                      "rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Si non renseigné, l&apos;objectif agence = somme des objectifs individuels par catégorie.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
