"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2, ListTodo, ArrowRight } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { PLAN_30J_DURATION_DAYS } from "@/config/coaching";
import type { Plan30jPayload } from "@/config/coaching";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

/**
 * ActivePlanCard — variante détaillée de PersistentPlanBanner,
 * affichée UNIQUEMENT en haut de Mon Diagnostic, AVANT le verdict (PR3.7 Q7=A).
 *
 * Différences avec le banner du layout :
 *   - Format carte (pas linéaire), plus visible.
 *   - Affichage de la barre de progression (pct).
 *   - CTA "Reprendre mon plan" en bouton plein.
 *
 * Le banner du layout reste visible en parallèle (Q7 décision A) sur toutes
 * les pages /conseiller/* — l'ActivePlanCard est un renforcement local sur
 * Mon Diagnostic.
 */
export function ActivePlanCard() {
  const { getActivePlan, loading } = useImprovementResources();
  const activePlan = loading ? null : getActivePlan();

  const data = useMemo(() => {
    if (!activePlan) return null;
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const startedAt = new Date(activePlan.created_at);
    const elapsedDays = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil(
          (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    );

    const ratioId = payload.pain_ratio_id as ExpertiseRatioId;
    const expertise = RATIO_EXPERTISE[ratioId];
    const lever = expertise?.label ?? "Plan ciblé";

    return { lever, total, done, pct, elapsedDays };
  }, [activePlan]);

  if (!data) return null;

  const { lever, total, done, pct, elapsedDays } = data;

  return (
    <section
      aria-label="Mon plan en cours"
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <ListTodo className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Mon plan en cours
            </p>
            <h3 className="mt-0.5 truncate text-base font-bold text-foreground">
              {lever}
            </h3>
          </div>
        </div>
        <Link
          href="/conseiller/ameliorer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reprendre
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Avancement</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
            J+{elapsedDays}/{PLAN_30J_DURATION_DAYS}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Actions</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-base font-bold tabular-nums text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {done}/{total}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Progression</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
            {pct}%
          </p>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
