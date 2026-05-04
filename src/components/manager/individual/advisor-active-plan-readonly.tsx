"use client";

import { useMemo } from "react";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import { PLAN_30J_DURATION_DAYS } from "@/config/coaching";
import type { Plan30jPayload } from "@/config/coaching";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  /** Prénom (ou prénom + nom) du conseiller observé. */
  displayName: string;
}

/**
 * AdvisorActivePlanReadOnly (Chantier C).
 *
 * Mirror read-only de `ActivePlanCard` côté Conseiller, destiné à la vue
 * Manager → zoom Conseiller. Diffère sur trois points :
 *   1. Texte adapté Q3 ("Plan de {prénom} en cours" vs "Mon plan en cours")
 *   2. Breakdown actions par statut (Faites / Non faites en V1) — l'absence
 *      de `expected_date` / `week_start_date` dans `Plan30jPayload` ne permet
 *      pas de distinguer "Ratées" / "Oubliées" sans inventer de la donnée.
 *   3. Pas de CTA "Reprendre" (read-only strict — le manager ne pilote pas le
 *      plan, il l'observe pour préparer un coaching).
 *
 * Hooks override-aware : `useImprovementResources` lit l'AdvisorOverride
 * (PR3.8.5) → renvoie automatiquement le plan du conseiller observé.
 */
export function AdvisorActivePlanReadOnly({ displayName }: Props) {
  const { getActivePlan, loading } = useImprovementResources();
  const activePlan = loading ? null : getActivePlan();

  const data = useMemo(() => {
    if (!activePlan) return null;
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    const notDone = total - done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const startedAt = new Date(activePlan.created_at);
    const elapsedDays = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)),
      ),
    );

    const ratioId = payload.pain_ratio_id as ExpertiseRatioId;
    const expertise = RATIO_EXPERTISE[ratioId];
    const lever = expertise?.label ?? "Plan ciblé";

    return { lever, total, done, notDone, pct, elapsedDays };
  }, [activePlan]);

  if (!data) return null;

  const { lever, total, done, notDone, pct, elapsedDays } = data;

  return (
    <section
      aria-label={`Plan en cours de ${displayName}`}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <ListTodo className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Plan de {displayName} en cours
          </p>
          <h3 className="mt-0.5 truncate text-base font-bold text-foreground">
            {lever}
          </h3>
        </div>
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
          <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">
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

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Détail
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {done} faite{done > 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <Circle className="h-3.5 w-3.5" />
          {notDone} non faite{notDone > 1 ? "s" : ""}
        </span>
      </div>
    </section>
  );
}
