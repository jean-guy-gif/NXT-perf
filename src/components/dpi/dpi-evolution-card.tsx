"use client";

import { useState } from "react";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";
import { MiniRadar } from "@/components/dpi/mini-radar";
import { DPIAxisDrawer } from "@/components/dpi/dpi-axis-drawer";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronRight } from "lucide-react";
import { useRatios } from "@/hooks/use-ratios";
import { useResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import type { DPIAxis } from "@/lib/dpi-axes";
import type { Plan30jPayload } from "@/config/coaching";

const SMILEY = {
  happy: { emoji: "\u{1F60A}", label: "En progression", color: "text-green-500", border: "border-green-500/30 bg-green-500/5" },
  neutral: { emoji: "\u{1F610}", label: "Stable", color: "text-orange-500", border: "border-orange-500/30 bg-orange-500/5" },
  sad: { emoji: "\u{1F61F}", label: "En recul", color: "text-red-500", border: "border-red-500/30 bg-red-500/5" },
};

export function DPIEvolutionCard() {
  const {
    initialSnapshot, currentAxes, currentGlobalScore,
    isFirstOfMonth, progression, globalDelta, smiley,
    hasSnapshot, initializeSnapshot, mounted,
  } = useDPIEvolution();

  const [selectedAxisId, setSelectedAxisId] = useState<string | null>(null);
  const { computedRatios, ratioConfigs } = useRatios();
  const results = useResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { getActivePlan } = useImprovementResources();

  const activePlan = getActivePlan();
  const planPayload = activePlan
    ? (activePlan.payload as unknown as Plan30jPayload)
    : null;
  const allActions = planPayload?.weeks.flatMap((w) => w.actions ?? []) ?? [];
  const plan30Total = allActions.length;
  const plan30Done = allActions.filter((a) => a.done).length;
  const hasActivePlan = plan30Total > 0;
  const hasCustomObjectif = !!(agencyObjective?.annualCA && agencyObjective.annualCA > 0);

  const selectedAxis: DPIAxis | null =
    currentAxes.find((a) => a.id === selectedAxisId) ?? null;
  const selectedInitialScore =
    initialSnapshot?.axes.find((a) => a.id === selectedAxisId)?.score ?? null;

  const drawer = (
    <DPIAxisDrawer
      open={selectedAxisId !== null}
      onClose={() => setSelectedAxisId(null)}
      axis={selectedAxis}
      initialScore={selectedInitialScore}
      results={results}
      computedRatios={computedRatios}
      ratioConfigs={ratioConfigs}
      plan30Total={plan30Total}
      plan30Done={plan30Done}
      hasActivePlan={hasActivePlan}
      hasCustomObjectif={hasCustomObjectif}
      agencyAvgActValue={agencyObjective?.avgActValue}
    />
  );

  const axisList = (
    <div className="mt-4 space-y-1.5">
      {currentAxes.map((axis) => {
        const scoreClass =
          axis.score >= 80
            ? "text-emerald-500"
            : axis.score >= 60
            ? "text-amber-500"
            : "text-red-500";
        return (
          <button
            key={axis.id}
            type="button"
            onClick={() => setSelectedAxisId(axis.id)}
            className="flex w-full items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          >
            <span className="text-left text-foreground">{axis.label}</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("font-semibold tabular-nums", scoreClass)}>
                {Math.round(axis.score)}/100
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!mounted || currentAxes.length === 0) return null;

  // Pas de snapshot
  if (!hasSnapshot) {
    return (
      <>
        <div className="rounded-xl border border-agency-primary/30 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-agency-primary/10">
              <span className="text-xl">{"\u{1F3AF}"}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Votre DPI de référence</h3>
              <p className="text-sm text-muted-foreground">Prenez votre photo de performance initiale pour suivre votre évolution</p>
            </div>
          </div>

          <div className="flex justify-center">
            <MiniRadar scores={currentAxes} color="var(--agency-primary, #3375FF)" size={200} showLabels />
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Score actuel : <span className="font-bold text-foreground">{currentGlobalScore}/100</span>
          </p>

          {axisList}

          <button
            onClick={initializeSnapshot}
            className="mt-4 w-full rounded-lg bg-agency-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-agency-primary/90"
          >
            Prendre mon DPI initial maintenant
          </button>
        </div>
        {drawer}
      </>
    );
  }

  // 1er du mois (ou démo) : comparaison
  if (isFirstOfMonth && initialSnapshot) {
    const s = SMILEY[smiley];
    return (
      <>
      <div className="space-y-4">
        <div className={cn("rounded-xl border p-4", s.border)}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{s.emoji}</span>
            <div>
              <p className="text-lg font-bold text-foreground">Bilan du mois — {s.label}</p>
              <p className={cn("text-sm font-semibold", s.color)}>
                Score global : {currentGlobalScore}/100 ({globalDelta >= 0 ? "+" : ""}{globalDelta} pts vs référence)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Référence prise le {new Date(initialSnapshot.date).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-muted-foreground">DPI Référence</p>
            <div className="flex justify-center">
              <MiniRadar scores={initialSnapshot.axes} color="#888" size={200} showLabels />
            </div>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Score : <span className="font-bold">{initialSnapshot.globalScore}/100</span>
            </p>
          </div>
          <div className="rounded-xl border border-agency-primary/30 bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-agency-primary">DPI Actuel</p>
            <div className="flex justify-center">
              <MiniRadar scores={currentAxes} color="var(--agency-primary, #3375FF)" size={200} showLabels />
            </div>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Score : <span className="font-bold text-foreground">{currentGlobalScore}/100</span>
            </p>
            {axisList}
          </div>
        </div>

        {progression && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Progression par axe</p>
            <div className="space-y-2">
              {progression.map((p) => (
                <div key={p.axisId} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{p.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{p.initial}% → {p.current}%</span>
                    {p.delta > 0 ? (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-green-500">
                        <TrendingUp className="h-3 w-3" /> +{p.delta}
                      </span>
                    ) : p.delta < 0 ? (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
                        <TrendingDown className="h-3 w-3" /> {p.delta}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                        <Minus className="h-3 w-3" /> 0
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {drawer}
      </>
    );
  }

  // Hors 1er du mois
  const today = new Date();
  const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysUntil = Math.ceil((nextFirst.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold text-foreground">Mon DPI Actuel</p>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Bilan dans {daysUntil}j
          </div>
        </div>
        <div className="flex justify-center">
          <MiniRadar scores={currentAxes} color="var(--agency-primary, #3375FF)" size={200} showLabels />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Score : <span className="font-bold text-foreground">{currentGlobalScore}/100</span> — Référence : {initialSnapshot?.globalScore ?? 0}/100
        </p>
        {axisList}
      </div>
      {drawer}
    </>
  );
}
