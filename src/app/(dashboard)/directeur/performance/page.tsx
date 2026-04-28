"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Gauge, Users } from "lucide-react";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { cn } from "@/lib/utils";
import { useDirecteurScope, type ScopeType } from "@/hooks/use-directeur-scope";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore } from "@/stores/app-store";
import { aggregateResults } from "@/lib/aggregate-results";
import { computeAllRatios } from "@/lib/ratios";
import { ManagerRatioCard } from "@/components/manager/performance/manager-ratio-card";
import { ManagerRatioDrillDown } from "@/components/manager/performance/manager-ratio-drill-down";
import { ConseillerPerformanceView } from "@/components/manager/performance/conseiller-performance-view";
import type { PeriodResults } from "@/types/results";
import type { RatioId } from "@/types/ratios";
import type { User } from "@/types/user";

type ViewMode = "chiffres" | "pourcentages";

export default function DirecteurPerformancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const { allConseillers, allResults, ratioConfigs } = useDirectorData();
  const currentUser = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const isDemo = useAppStore((s) => s.isDemo);

  const [viewMode, setViewMode] = useState<ViewMode>("chiffres");
  const [drillRatioId, setDrillRatioId] = useState<RatioId | null>(null);

  // Pool de conseillers selon le scope (pattern PR2d).
  const pool: User[] = useMemo(() => {
    const base = currentUser?.institutionId
      ? allConseillers.filter((c) => c.institutionId === currentUser.institutionId)
      : allConseillers;
    if (scope === "conseiller" && scopeId) {
      return base.filter((c) => c.id === scopeId);
    }
    if (scope === "equipe" && scopeId) {
      return base.filter((c) => c.teamId === scopeId);
    }
    return base;
  }, [scope, scopeId, allConseillers, currentUser?.institutionId]);

  // Map userId → résultat le plus récent (équivalent local de useTeamResults
  // côté Manager — on prend le dernier periodStart par user).
  const perConseillerResults = useMemo<Map<string, PeriodResults | null>>(() => {
    const map = new Map<string, PeriodResults | null>();
    for (const c of pool) {
      const sorted = allResults
        .filter((r) => r.userId === c.id)
        .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      map.set(c.id, sorted[0] ?? null);
    }
    return map;
  }, [pool, allResults]);

  // Agrégat équipe / agence sur le pool concaténé.
  const aggregatedResults = useMemo<PeriodResults | null>(() => {
    const list: PeriodResults[] = [];
    for (const c of pool) {
      const r = perConseillerResults.get(c.id);
      if (r) list.push(r);
    }
    return aggregateResults(list);
  }, [pool, perConseillerResults]);

  // Ratios collectifs avec category "confirme" (référence équipe — cohérent Manager).
  const teamRatios = useMemo(() => {
    if (!aggregatedResults) return [];
    return computeAllRatios(aggregatedResults, "confirme", ratioConfigs);
  }, [aggregatedResults, ratioConfigs]);

  function resolveTeamLabel(teamId: string): string {
    const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
    if (fromInfos) return fromInfos;
    const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
    return manager ? `Équipe de ${manager.firstName}` : "équipe";
  }

  const { title, subtitle } = useMemo(() => {
    if (scope === "conseiller" && scopeId) {
      const c = users.find((u) => u.id === scopeId);
      const baseName = c ? `${c.firstName} ${c.lastName}` : null;
      const ctxSuffix = teamContext ? ` (${resolveTeamLabel(teamContext)})` : "";
      return {
        title: baseName
          ? `Ratios de Transformation — ${baseName}${ctxSuffix}`
          : "Ratios de Transformation",
        subtitle:
          "Suivez les ratios de transformation du conseiller et identifiez les axes de progrès.",
      };
    }
    if (scope === "equipe" && scopeId) {
      return {
        title: `Ratios de Transformation — ${resolveTeamLabel(scopeId)}`,
        subtitle:
          "Suivez les ratios de transformation de l'équipe et identifiez les axes de progrès.",
      };
    }
    return {
      title: "Mes Ratios de Transformation",
      subtitle:
        "Suivez les ratios de transformation de l'agence et identifiez les axes de progrès.",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, teamContext, users, teamInfos]);

  // URL builder local — cohérent avec le ScopeSelector PR2c-bis.
  function buildScopeUrl(
    nextScope: ScopeType,
    nextScopeId: string | null,
    teamCtx: string | null,
  ): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", nextScope);
    if (nextScopeId) params.set("id", nextScopeId);
    else params.delete("id");
    if (nextScope === "conseiller" && teamCtx) params.set("team", teamCtx);
    else params.delete("team");
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  // Drill-down "Discuter avec X" :
  // - depuis scope=equipe : preserve teamContext (= scopeId courant)
  // - depuis scope=agence : prend l'équipe parente du conseiller cliqué
  function handleDiscuterAvec(conseillerId: string) {
    const c = pool.find((u) => u.id === conseillerId);
    const teamForUrl = teamContext ?? c?.teamId ?? null;
    setDrillRatioId(null);
    router.push(buildScopeUrl("conseiller", conseillerId, teamForUrl), {
      scroll: false,
    });
  }

  // Empty state agence/équipe vide (prod réel uniquement).
  if (scope !== "conseiller" && pool.length === 0 && !isDemo) {
    const emptyTitle =
      scope === "equipe"
        ? "Cette équipe n'a pas encore de conseillers"
        : "Votre agence n'a pas encore de conseillers";
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            {emptyTitle}
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Les ratios s&apos;afficheront dès que des conseillers auront saisi leurs données.
          </p>
        </div>
      </section>
    );
  }

  const selectedConfig = drillRatioId ? ratioConfigs[drillRatioId] : null;
  const selectedRatio = drillRatioId
    ? teamRatios.find((r) => r.ratioId === drillRatioId) ?? null
    : null;

  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Gauge className="h-3.5 w-3.5" />
          Performance
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
      </header>

      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
        {/* Toggle Chiffres / Pourcentages */}
        <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setViewMode("chiffres")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              viewMode === "chiffres"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chiffres
          </button>
          <button
            type="button"
            onClick={() => setViewMode("pourcentages")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              viewMode === "pourcentages"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pourcentages
          </button>
        </div>

        {/* Dispatch selon scope */}
        {scope === "conseiller" && scopeId ? (
          <ConseillerPerformanceView userId={scopeId} viewMode={viewMode} />
        ) : !aggregatedResults || teamRatios.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune donnée disponible pour{" "}
              {scope === "equipe" ? "cette équipe" : "l'agence"}.
            </p>
          </div>
        ) : (
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
                    thresholdLabel="Confirmé (référence)"
                    onSelect={() =>
                      setDrillRatioId(ratio.ratioId as RatioId)
                    }
                  />
                );
              })}
            </div>

            <Tooltip
              id="manager-ratio-tooltip"
              place="top"
              className="!max-w-xs !rounded-lg !text-xs !leading-relaxed"
            />

            {drillRatioId && selectedConfig && selectedRatio && (
              <ManagerRatioDrillDown
                ratioId={drillRatioId}
                config={selectedConfig}
                aggregateRatio={selectedRatio}
                conseillers={pool}
                perConseillerResults={perConseillerResults}
                ratioConfigs={ratioConfigs}
                onClose={() => setDrillRatioId(null)}
                onDiscuterAvec={handleDiscuterAvec}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
