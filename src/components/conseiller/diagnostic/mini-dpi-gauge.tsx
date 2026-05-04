"use client";

import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";
import { cn } from "@/lib/utils";

interface Props {
  /**
   * Chantier C — Si fourni, libellé adapté Manager ("DPI synthétique de
   * {prénom}") + carte rendue non-cliquable (le manager n'a pas accès à
   * /conseiller/progression). Optionnel, backward-compatible.
   */
  displayName?: string;
}

/**
 * MiniDpiGauge — score DPI global compact, cliquable vers /conseiller/progression
 * pour le détail spider. Composant historique restauré depuis PR3.3 (commit
 * ff48da2). Renommé de `MiniDPISynthese` à `MiniDpiGauge` pour aligner sur
 * la convention de nommage demandée en PR3.7.
 */
export function MiniDpiGauge({ displayName }: Props = {}) {
  const { currentGlobalScore, currentAxes, mounted } = useDPIEvolution();

  if (!mounted || currentAxes.length === 0) return null;

  const tone =
    currentGlobalScore >= 80
      ? "text-emerald-500"
      : currentGlobalScore >= 60
        ? "text-orange-500"
        : "text-red-500";

  const title = displayName
    ? `DPI synthétique de ${displayName}`
    : "Mon DPI synthétique";
  const subtitle = displayName
    ? "Score global de performance, lecture seule"
    : "Voir le détail dans Ma progression";

  const body = (
    <>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Gauge className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-0.5">
            <span className={cn("text-3xl font-bold tabular-nums", tone)}>
              {currentGlobalScore}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {!displayName && (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  // Manager (zoom Conseiller) : carte non-cliquable, /conseiller/progression
  // n'est pas accessible côté Manager (Q3=γ, hors V1).
  if (displayName) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
        {body}
      </div>
    );
  }

  return (
    <Link
      href="/conseiller/progression"
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      {body}
    </Link>
  );
}
