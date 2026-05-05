"use client";

import { useEffect } from "react";
import { CheckCircle2, Circle, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyTeamPlan } from "@/hooks/team/use-my-team-plan";
import {
  TEAM_PLAN_DURATION_DAYS,
  computeTeamPlanDay,
} from "@/lib/manager/team-plan";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * TeamPlanDetailDrawer — chantier d.2.
 *
 * Drawer slide-in droite (max-w-md, Q2) ouvert au click du
 * `<TeamPlanBanner>`. Affiche les 3 actions équipe avec checkboxes
 * cochables. Le toggle est optimistic + rollback automatique via
 * `useMyTeamPlan.toggleAction`.
 *
 * Pattern visuel inspiré d'`ActionObjectiveDrawer` (chantier B). Couleur
 * indigo cohérente avec le banner.
 */
export function TeamPlanDetailDrawer({ open, onClose }: Props) {
  const { activePlan, myProgress, toggleAction } = useMyTeamPlan();

  // Body scroll lock + Esc to close
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !activePlan) return null;

  const { payload } = activePlan;
  const total = payload.actions.length;
  const done = myProgress.size;
  const elapsedDays = computeTeamPlanDay(activePlan.created_at);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Plan équipe : ${payload.lever_label}`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                Plan équipe
              </p>
              <h2 className="mt-0.5 text-base font-bold text-foreground">
                {payload.lever_label}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                J+{elapsedDays}/{TEAM_PLAN_DURATION_DAYS} · {done}/{total}{" "}
                actions cochées
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body — 3 actions cochables */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Cochez les actions que vous avez réalisées pour cette équipe.
          </p>
          <ul className="space-y-2">
            {payload.actions.map((action) => {
              const isDone = myProgress.has(action.id);
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => toggleAction(action.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      isDone
                        ? "border-indigo-500/30 bg-indigo-500/5"
                        : "border-border bg-background hover:border-indigo-500/30 hover:bg-indigo-500/5",
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2
                          className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                          aria-label="Action faite"
                        />
                      ) : (
                        <Circle
                          className="h-5 w-5 text-muted-foreground/60"
                          aria-label="Action à faire"
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm leading-relaxed",
                        isDone
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {action.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer compteur */}
        <footer className="border-t border-border bg-muted/30 px-5 py-3">
          <p className="text-xs font-medium text-foreground">
            {done}/{total} actions cochées
          </p>
        </footer>
      </aside>
    </>
  );
}
