"use client";

import { computeDPIProjections } from "@/lib/dpi-projections";
import type { DPIAxis } from "@/lib/dpi-axes";
import { cn } from "@/lib/utils";
import { TrendingUp, Lock } from "lucide-react";

interface DPIProjectionsCardProps {
  currentAxes: DPIAxis[];
  currentGlobalScore: number;
  caBase?: number;
  activeTools?: string[];
}

export function DPIProjectionsCard({
  currentAxes,
  currentGlobalScore,
  caBase,
  activeTools = [],
}: DPIProjectionsCardProps) {
  const projections = computeDPIProjections(currentAxes, caBase);

  const visibleProjections = projections
    .map((proj) => ({
      ...proj,
      tools: proj.tools.filter((t) => !activeTools.includes(t.id)),
    }))
    .filter((proj) => proj.tools.length > 0);

  if (visibleProjections.length === 0) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center">
        <span className="text-3xl">{"\u{1F3C6}"}</span>
        <p className="mt-2 font-semibold text-foreground">
          Vous utilisez déjà l&apos;écosystème NXT complet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Continuez à piloter votre performance pour maximiser votre progression.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Votre potentiel de progression</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {visibleProjections.map((proj) => (
          <div
            key={proj.palier}
            className={cn(
              "rounded-xl border p-4",
              proj.palier === "3m" ? "border-primary/30 bg-primary/5" :
              proj.palier === "6m" ? "border-indigo-500/30 bg-indigo-500/5" :
              "border-purple-500/30 bg-purple-500/5"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {proj.label}
              </span>
              <span className={cn(
                "text-lg font-bold",
                proj.palier === "3m" ? "text-primary" :
                proj.palier === "6m" ? "text-indigo-500" : "text-purple-500"
              )}>
                {proj.globalScore}/100
              </span>
            </div>

            <div className="mb-3 text-center">
              <span className="text-2xl font-bold text-green-500">+{proj.deltaGlobal} pts</span>
              <p className="text-xs text-muted-foreground mt-0.5">vs score actuel ({currentGlobalScore})</p>
            </div>

            {/* CA additionnel */}
            <div className="mb-3 rounded-lg bg-background/60 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">CA additionnel estimé</p>
              {proj.caAdditionnel.bas > 0 ? (
                <p className="text-sm font-bold text-green-500">
                  +{(proj.caAdditionnel.bas / 1000).toFixed(0)}k\u20AC – +{(proj.caAdditionnel.haut / 1000).toFixed(0)}k\u20AC
                </p>
              ) : (
                <p className="text-sm font-bold text-muted-foreground">&lt; 5k\u20AC</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ROI estimé vs {proj.tools.filter((t) => t.disponible).map((t) => t.prix).join(" + ")}
              </p>
            </div>

            <div className="space-y-1.5">
              {proj.tools.map((tool) => (
                <div
                  key={tool.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs",
                    !tool.disponible ? "bg-muted/50 text-muted-foreground" : "bg-background/50 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {!tool.disponible && <Lock className="h-3 w-3" />}
                    <span className="font-medium">{tool.label}</span>
                    {!tool.disponible && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Bientôt</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">{tool.prix}</span>
                </div>
              ))}
            </div>

            {(() => {
              const maxGain = proj.axes.reduce((best, axis) => {
                const current = currentAxes.find((a) => a.id === axis.id);
                const gain = axis.score - (current?.score ?? 0);
                return gain > best.gain ? { label: axis.label, gain } : best;
              }, { label: "", gain: 0 });
              return maxGain.gain > 0 ? (
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  Axe le + impacté : <span className="font-medium text-foreground">{maxGain.label}</span> (+{maxGain.gain} pts)
                </p>
              ) : null;
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
