"use client";

import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";
import { cn } from "@/lib/utils";

/**
 * MiniDpiGauge — score DPI global compact, cliquable vers /conseiller/progression
 * pour le détail spider. Composant historique restauré depuis PR3.3 (commit
 * ff48da2). Renommé de `MiniDPISynthese` à `MiniDpiGauge` pour aligner sur
 * la convention de nommage demandée en PR3.7.
 */
export function MiniDpiGauge() {
  const { currentGlobalScore, currentAxes, mounted } = useDPIEvolution();

  if (!mounted || currentAxes.length === 0) return null;

  const tone =
    currentGlobalScore >= 80
      ? "text-emerald-500"
      : currentGlobalScore >= 60
        ? "text-orange-500"
        : "text-red-500";

  return (
    <Link
      href="/conseiller/progression"
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Gauge className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mon DPI synthétique
          </p>
          <p className="mt-0.5">
            <span className={cn("text-3xl font-bold tabular-nums", tone)}>
              {currentGlobalScore}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Voir le détail dans Ma progression
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
