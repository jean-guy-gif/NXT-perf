"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import { useMyTeamPlan } from "@/hooks/team/use-my-team-plan";
import {
  TEAM_PLAN_DURATION_DAYS,
  computeTeamPlanDay,
} from "@/lib/manager/team-plan";
import { TeamPlanDetailDrawer } from "@/components/conseiller/layout/team-plan-detail-drawer";

/**
 * TeamPlanBanner — chantier d.2.
 *
 * Bandeau persistant indigo affiché sous `<PersistentPlanBanner>` perso
 * dans le layout `/conseiller/*`. Visible uniquement si le conseiller est
 * dans une équipe ET qu'un team plan est actif pour cette équipe.
 *
 * Cas où le banner est caché :
 *   - Conseiller solo (teamId vide)
 *   - Pas de team plan actif pour la team
 *   - Mode démo (pas de DB consommée)
 *
 * Click banner → ouvre `<TeamPlanDetailDrawer>` (max-w-md, 3 actions
 * cochables).
 *
 * Couleur indigo (Q1) — distincte du primary du PersistentPlanBanner perso
 * pour permettre au conseiller de distinguer en un coup d'œil son
 * engagement personnel vs l'engagement collectif équipe.
 */
export function TeamPlanBanner() {
  const { activePlan, myProgress, loading } = useMyTeamPlan();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const data = useMemo(() => {
    if (!activePlan) return null;
    const total = activePlan.payload.actions.length;
    const done = myProgress.size;
    const elapsedDays = computeTeamPlanDay(activePlan.created_at);
    return {
      lever: activePlan.payload.lever_label,
      total,
      done,
      elapsedDays,
    };
  }, [activePlan, myProgress]);

  // Tant que le hook charge, on ne montre rien (pas de flash UI).
  if (loading || !data) return null;

  const { lever, total, done, elapsedDays } = data;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-left transition-colors hover:bg-indigo-500/10"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Plan équipe · {lever}
              </p>
              <p className="text-xs text-muted-foreground">
                J+{elapsedDays}/{TEAM_PLAN_DURATION_DAYS} ·{" "}
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {done}/{total} actions
                </span>
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
            Voir le plan
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      <TeamPlanDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
