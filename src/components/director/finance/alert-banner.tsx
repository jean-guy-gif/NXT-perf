"use client";

import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import type { TrajectoryResult } from "@/lib/finance-trajectory";

interface AlertBannerProps {
  trajectoire: TrajectoryResult;
}

/**
 * Bandeau d'alerte unique en haut de page (PR2i — remplace le score 90/100).
 * Trois états selon ratio Total projeté / Point mort 3 mois :
 * - risque   (ratio < 1)        : ROUGE
 * - vigilance (1 ≤ ratio < 1.2) : ORANGE
 * - saine    (ratio ≥ 1.2)      : VERT discret
 *
 * Ne rend rien si !canCalculate (mode degraded — pas d'alerte sans data).
 */
export function AlertBanner({ trajectoire }: AlertBannerProps) {
  if (!trajectoire.canCalculate) return null;

  const { status, ratioVsPointMort } = trajectoire;
  const ratioFormatted = ratioVsPointMort.toFixed(1).replace(".", ",");

  if (status === "risque") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-500">
            Trajectoire sous le point mort — pousser la prospection
          </p>
          <p className="mt-0.5 text-xs text-red-500/80">
            Vous couvrez {ratioFormatted}× votre point mort sur le trimestre à venir.
          </p>
        </div>
      </div>
    );
  }

  if (status === "vigilance") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-500">
            Trajectoire serrée — vigilance
          </p>
          <p className="mt-0.5 text-xs text-orange-500/80">
            Vous couvrez {ratioFormatted}× votre point mort sur le trimestre à venir.
          </p>
        </div>
      </div>
    );
  }

  // saine
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      <p className="text-sm text-emerald-500">
        Trajectoire saine — {ratioFormatted}× point mort couvert
      </p>
    </div>
  );
}
