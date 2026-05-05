"use client";

import { useMemo } from "react";
import { CheckCircle2, Circle, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamGPS } from "@/hooks/use-team-gps";
import { useTeamPlanProgress } from "@/hooks/team/use-team-plan-progress";
import type { TeamPlanAction } from "@/lib/manager/team-plan";

interface Props {
  planResourceId: string;
  /** 3 actions équipe — issues de `activePlan.payload.actions` (livré d.1). */
  actions: TeamPlanAction[];
}

/**
 * Helpers internes — extraction d'initiales + palette de couleurs déterministe
 * par index (pas de hash random, ordre stable côté store).
 */
function extractInitials(firstName?: string, lastName?: string): string {
  const f = (firstName ?? "").trim().charAt(0).toUpperCase();
  const l = (lastName ?? "").trim().charAt(0).toUpperCase();
  return f + l || f || "?";
}

const COLOR_PALETTE = [
  "bg-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "bg-violet-200 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  "bg-sky-200 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
];

/**
 * TeamPlanProgressMatrix — chantier d.3.
 *
 * Matrice action × conseiller affichée sous le `<TeamActionPlan>` quand un
 * team plan est actif. Vue lecture seule pour le manager (le manager
 * observe, ne coche pas — chaque conseiller gère ses propres cochages
 * via `<TeamPlanDetailDrawer>` chantier d.2).
 *
 * Décisions :
 *   - Q1 header : "Action 1/2/3" + tooltip natif `title=` avec le label
 *     complet (l'info est déjà visible dans la liste actions du parent)
 *   - Q2 cochage : `CheckCircle2 emerald-500` (convention "fait")
 *   - Q3 compteur global : footer "X / N actions cochées sur l'équipe"
 *   - Q4 layout : `<table>` HTML natif (sticky CSS + a11y gratuite)
 *   - Q5 empty state : cadre + message "Aucun conseiller dans votre équipe"
 *   - Q6 refresh : bouton manuel (pas de realtime V1)
 */
export function TeamPlanProgressMatrix({ planResourceId, actions }: Props) {
  const { teamConseillers } = useTeamGPS();
  const { progressByUser, loading, refresh } =
    useTeamPlanProgress(planResourceId);

  const globalDoneCount = useMemo(() => {
    let total = 0;
    for (const c of teamConseillers) {
      const set = progressByUser.get(c.id);
      if (!set) continue;
      // On compte uniquement les actions qui sont DANS le payload courant
      // (au cas où un conseiller a coché des actions d'un plan archivé).
      for (const a of actions) {
        if (set.has(a.id)) total++;
      }
    }
    return total;
  }, [teamConseillers, progressByUser, actions]);

  const totalCells = teamConseillers.length * actions.length;

  return (
    <section className="mt-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
      <header className="flex items-center justify-between gap-3 border-b border-indigo-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            Suivi de l&apos;équipe
          </h4>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Rafraîchir"
          title="Rafraîchir les cochages"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </header>

      {teamConseillers.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun conseiller dans votre équipe.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-20 border-b border-border bg-card px-3 py-2 text-left font-semibold text-foreground"
                  >
                    Conseiller
                  </th>
                  {actions.map((action, idx) => (
                    <th
                      key={action.id}
                      scope="col"
                      title={action.label}
                      className="min-w-[90px] border-b border-border px-3 py-2 text-center font-semibold text-foreground"
                    >
                      Action {idx + 1}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="border-b border-border px-3 py-2 text-center font-semibold text-foreground"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamConseillers.map((u, idx) => {
                  const userSet = progressByUser.get(u.id) ?? new Set<string>();
                  const doneCount = actions.filter((a) =>
                    userSet.has(a.id),
                  ).length;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-indigo-500/5"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-border bg-card px-3 py-2 text-left font-normal"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              COLOR_PALETTE[idx % COLOR_PALETTE.length],
                            )}
                            aria-hidden
                          >
                            {extractInitials(u.firstName, u.lastName)}
                          </span>
                          <span className="truncate text-foreground">
                            {u.firstName} {u.lastName}
                          </span>
                        </div>
                      </th>
                      {actions.map((action) => {
                        const isDone = userSet.has(action.id);
                        return (
                          <td
                            key={action.id}
                            className="border-b border-border px-3 py-2 text-center"
                          >
                            {isDone ? (
                              <CheckCircle2
                                className="mx-auto h-5 w-5 text-emerald-500"
                                aria-label="Action faite"
                              />
                            ) : (
                              <Circle
                                className="mx-auto h-5 w-5 text-muted-foreground/40"
                                aria-label="Action non faite"
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="border-b border-border px-3 py-2 text-center font-semibold tabular-nums text-foreground">
                        {doneCount}/{actions.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-indigo-500/20 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {globalDoneCount}
            </span>{" "}
            / {totalCells} actions cochées sur l&apos;équipe
          </footer>
        </>
      )}
    </section>
  );
}
