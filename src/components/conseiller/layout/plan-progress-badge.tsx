"use client";

import { useMemo } from "react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { cn } from "@/lib/utils";
import type { Plan30jPayload } from "@/config/coaching";

/**
 * PlanProgressBadge — badge mini-circulaire affiché sur le nav item
 * M'améliorer du sidebar Conseiller (PR3.7 Q4).
 *
 * Affiché UNIQUEMENT si un plan actif existe. Couleur selon avancement :
 *   - 0 à 33 %   → orange
 *   - 34 à 79 %  → violet
 *   - 80 à 100 % → vert
 *
 * 2 variantes :
 *   - `variant="full"` : pill `XX%` à droite du label (sidebar non-collapsée)
 *   - `variant="dot"`  : disque coloré 8×8 px en haut-droit de l'icône
 *                       (sidebar collapsée)
 */
interface Props {
  variant?: "full" | "dot";
  className?: string;
}

function colorForPct(pct: number): { bg: string; text: string } {
  if (pct >= 80) return { bg: "bg-emerald-500", text: "text-white" };
  if (pct >= 34) return { bg: "bg-violet-500", text: "text-white" };
  return { bg: "bg-orange-500", text: "text-white" };
}

export function PlanProgressBadge({ variant = "full", className }: Props) {
  const { getActivePlan, loading } = useImprovementResources();

  const data = useMemo(() => {
    if (loading) return null;
    const active = getActivePlan();
    if (!active) return null;
    const payload = active.payload as unknown as Plan30jPayload;
    const all = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = all.length;
    if (total === 0) return null;
    const done = all.filter((a) => a.done).length;
    return Math.min(100, Math.round((done / total) * 100));
  }, [getActivePlan, loading]);

  if (data === null) return null;

  const c = colorForPct(data);

  if (variant === "dot") {
    return (
      <span
        aria-label={`Plan en cours — ${data}% d'avancement`}
        title={`Plan en cours — ${data}%`}
        className={cn(
          "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--agency-dark,#1A1A2E)]",
          c.bg,
          className
        )}
      />
    );
  }

  return (
    <span
      aria-label={`Plan en cours — ${data}%`}
      title={`Plan en cours — ${data}% d'avancement`}
      className={cn(
        "ml-auto inline-flex shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        c.bg,
        c.text,
        className
      )}
    >
      {data}%
    </span>
  );
}
