"use client";

import { computeDPIProjections } from "@/lib/dpi-projections";
import type { DPIAxis } from "@/lib/dpi-axes";
import { cn } from "@/lib/utils";
import { TrendingUp, Lock } from "lucide-react";

interface DPIProjectionsCardProps {
  currentAxes: DPIAxis[];
  currentGlobalScore: number;
}

export function DPIProjectionsCard({ currentAxes, currentGlobalScore }: DPIProjectionsCardProps) {
  const projections = computeDPIProjections(currentAxes);
  if (!projections.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Votre potentiel de progression</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {projections.map((proj) => (
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
