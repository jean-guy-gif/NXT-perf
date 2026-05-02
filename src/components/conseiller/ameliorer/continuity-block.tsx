"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, ListTodo, Sparkles } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { PLAN_30J_DURATION_DAYS } from "@/config/coaching";
import type { Plan30jPayload } from "@/config/coaching";

/**
 * ContinuityBlock — bloc dynamique sous le levier recommandé sur
 * /conseiller/ameliorer (PR3.7.6 spec section 2).
 *
 * 3 cas :
 *   1. Plan ACTIF        → "Continuer mon plan (J+X/30) · Y%" → Reprendre
 *   2. Plan TERMINÉ récent → "Ton analyse est prête" → Voir mon debrief IA
 *      (lien direct vers /coaching-debrief?planId=…&readonly=1)
 *   3. AUCUN plan        → composant retourne null
 *
 * "Plan terminé récent" = plan archivé dans les 30 derniers jours
 * (on ne propose pas le debrief sur des archives très anciennes).
 */
export function ContinuityBlock() {
  const { getActivePlan, archivedPlans, loading } = useImprovementResources();

  const activePlan = loading ? null : getActivePlan();

  const lastArchived = useMemo(() => {
    if (loading || activePlan) return null;
    if (!archivedPlans || archivedPlans.length === 0) return null;
    // Trouver le dernier plan archivé dans les 30 derniers jours
    const recents = archivedPlans
      .filter((p) => {
        if (!p.archived_at) return false;
        const ts = new Date(p.archived_at).getTime();
        const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        return ageDays <= 30;
      })
      .sort(
        (a, b) =>
          new Date(b.archived_at!).getTime() -
          new Date(a.archived_at!).getTime()
      );
    return recents[0] ?? null;
  }, [activePlan, archivedPlans, loading]);

  // ─── CAS 1 : Plan actif ──────────────────────────────────────────
  if (activePlan) {
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const startedAt = new Date(activePlan.created_at);
    const elapsed = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil(
          (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    );

    return (
      <section
        aria-label="Continuité du plan"
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ListTodo className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Continuer mon plan (J+{elapsed}/{PLAN_30J_DURATION_DAYS})
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {done}/{total} actions cochées · {pct}% d'avancement
              </p>
            </div>
          </div>
          <Link
            href="/conseiller/ameliorer"
            scroll={true}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reprendre mon plan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {pct > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </section>
    );
  }

  // ─── CAS 2 : Plan terminé récent ────────────────────────────────
  if (lastArchived) {
    return (
      <section
        aria-label="Debrief disponible"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Ton analyse est prête
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Découvre ce que tu as gagné et ce que tu peux améliorer.
              </p>
            </div>
          </div>
          <Link
            href={`/coaching-debrief?planId=${encodeURIComponent(lastArchived.id)}&readonly=1`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Voir mon debrief IA
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  // ─── CAS 3 : Aucun plan ─────────────────────────────────────────
  return null;
}
