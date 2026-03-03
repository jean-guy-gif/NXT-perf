"use client";

import { use, useState, useCallback, useEffect } from "react";
import { redirect } from "next/navigation";
import { useCoachTargetData } from "@/hooks/use-coach-target-data";
import { TargetHeader } from "@/components/coach/target-header";
import { PlanActionRow } from "@/components/coach/plan-action-row";
import { generateCoachPlan } from "@/lib/coach";
import { coachRepo } from "@/lib/coach-repo";
import { cn } from "@/lib/utils";
import type { CoachTargetType, CoachPlanAction, CoachPlanWeek, CoachPlanStatus } from "@/types/coach";
import { CalendarDays, Plus, Sparkles } from "lucide-react";

/* ────── Valid target types ────── */
const VALID_TYPES: CoachTargetType[] = ["AGENT", "MANAGER", "INSTITUTION"];

/* ────── Status badge config ────── */
const PLAN_STATUS_CONFIG: Record<
  CoachPlanStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Brouillon",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  VALIDATED: {
    label: "Validé",
    className: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  ACTIVE: {
    label: "Actif",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  COMPLETED: {
    label: "Terminé",
    className: "bg-muted text-muted-foreground border-muted",
  },
  CANCELLED: {
    label: "Annulé",
    className: "bg-red-500/10 text-red-500 border-red-500/30",
  },
};

/* ────── Main Page ────── */
export default function PlanEditorPage({
  params,
}: {
  params: Promise<{ targetType: string; targetId: string }>;
}) {
  const { targetType, targetId } = use(params);

  // Validate
  if (!VALID_TYPES.includes(targetType as CoachTargetType)) {
    redirect("/coach/dashboard");
  }

  const validType = targetType as CoachTargetType;
  const data = useCoachTargetData(validType, targetId);
  const { activePlan, weakKpis, assignment } = data;

  if (!assignment) {
    redirect("/coach/dashboard");
  }

  // Local editing state
  const [title, setTitle] = useState(activePlan?.title ?? "");
  const [objective, setObjective] = useState(activePlan?.objective ?? "");
  const [weeks, setWeeks] = useState<CoachPlanWeek[]>(
    activePlan?.weeks ?? []
  );

  // Sync local state when activePlan changes (e.g. after generation)
  useEffect(() => {
    if (activePlan) {
      setTitle(activePlan.title);
      setObjective(activePlan.objective);
      setWeeks(activePlan.weeks);
    }
  }, [activePlan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isReadOnly = activePlan?.status === "COMPLETED" || activePlan?.status === "CANCELLED";

  // Persist helper
  const save = useCallback(
    (
      newTitle: string,
      newObjective: string,
      newWeeks: CoachPlanWeek[]
    ) => {
      if (!activePlan) return;
      coachRepo.updatePlan(activePlan.id, {
        title: newTitle,
        objective: newObjective,
        weeks: newWeeks,
      });
    },
    [activePlan]
  );

  // Field change handlers
  const handleTitleChange = (val: string) => {
    setTitle(val);
    save(val, objective, weeks);
  };

  const handleObjectiveChange = (val: string) => {
    setObjective(val);
    save(title, val, weeks);
  };

  const handleWeekFocusChange = (weekIdx: number, focus: string) => {
    const next = weeks.map((w, i) =>
      i === weekIdx ? { ...w, focus } : w
    );
    setWeeks(next);
    save(title, objective, next);
  };

  const handleActionChange = (
    weekIdx: number,
    actionId: string,
    updated: CoachPlanAction
  ) => {
    const next = weeks.map((w, i) =>
      i === weekIdx
        ? {
            ...w,
            actions: w.actions.map((a) =>
              a.id === actionId ? updated : a
            ),
          }
        : w
    );
    setWeeks(next);
    save(title, objective, next);
  };

  const handleActionRemove = (weekIdx: number, actionId: string) => {
    const next = weeks.map((w, i) =>
      i === weekIdx
        ? { ...w, actions: w.actions.filter((a) => a.id !== actionId) }
        : w
    );
    setWeeks(next);
    save(title, objective, next);
  };

  const handleAddAction = (weekIdx: number) => {
    const week = weeks[weekIdx];
    if (week.actions.length >= 6) return;

    const newAction: CoachPlanAction = {
      id:
        "pa-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 6),
      label: "",
      frequency: "",
      channel: "",
      proof: "",
      linkedKpi: null,
      done: false,
    };

    const next = weeks.map((w, i) =>
      i === weekIdx
        ? { ...w, actions: [...w.actions, newAction] }
        : w
    );
    setWeeks(next);
    save(title, objective, next);
  };

  // Generate plan
  const handleGenerate = () => {
    if (!assignment) return;
    const plan = generateCoachPlan(weakKpis, assignment.id);
    coachRepo.createPlan(plan);
    // Local state will sync via useEffect on activePlan change
    setTitle(plan.title);
    setObjective(plan.objective);
    setWeeks(plan.weeks);
  };

  // Status actions
  const handleValidate = () => {
    if (activePlan) coachRepo.validatePlan(activePlan.id);
  };

  const handleRevertToDraft = () => {
    if (activePlan) coachRepo.revertToDraft(activePlan.id);
  };

  const handleComplete = () => {
    if (activePlan) coachRepo.completePlan(activePlan.id);
  };

  const backHref = `/coach/targets/${targetType}/${targetId}`;

  return (
    <div className="space-y-6 pb-24">
      <TargetHeader
        targetType={validType}
        targetName="Plan 30 jours"
        backHref={backHref}
      />

      {/* No active plan → empty state */}
      {!activePlan ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-12">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Aucun plan actif pour cette cible
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Générer un plan
          </button>
        </div>
      ) : (
        <>
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border",
                PLAN_STATUS_CONFIG[activePlan.status].className
              )}
            >
              {PLAN_STATUS_CONFIG[activePlan.status].label}
            </span>
            <span className="text-xs text-muted-foreground">
              Début : {activePlan.startDate}
            </span>
          </div>

          {/* Title */}
          {isReadOnly ? (
            <h2 className="text-lg font-semibold">{title}</h2>
          ) : (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Titre du plan"
              className="w-full text-lg font-semibold rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}

          {/* Objective */}
          {isReadOnly ? (
            <p className="text-sm text-muted-foreground">{objective}</p>
          ) : (
            <input
              type="text"
              value={objective}
              onChange={(e) => handleObjectiveChange(e.target.value)}
              placeholder="Objectif du plan"
              className="w-full text-sm rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}

          {/* 4 Weeks */}
          <div className="space-y-6">
            {weeks.map((week, weekIdx) => (
              <div
                key={week.weekNumber}
                className="rounded-xl border bg-card p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Semaine {week.weekNumber}
                  </h3>
                </div>

                {/* Focus */}
                {isReadOnly ? (
                  <p className="text-sm text-muted-foreground">
                    Focus : {week.focus}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={week.focus}
                    onChange={(e) =>
                      handleWeekFocusChange(weekIdx, e.target.value)
                    }
                    placeholder="Focus de la semaine"
                    className="w-full text-sm rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {week.actions.map((action) => (
                    <PlanActionRow
                      key={action.id}
                      action={action}
                      onChange={(updated) =>
                        handleActionChange(weekIdx, action.id, updated)
                      }
                      onRemove={() =>
                        handleActionRemove(weekIdx, action.id)
                      }
                      readOnly={isReadOnly}
                    />
                  ))}
                </div>

                {/* Add action button */}
                {!isReadOnly && week.actions.length < 6 && (
                  <button
                    onClick={() => handleAddAction(weekIdx)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter une action
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer buttons */}
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-4">
            <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
              {activePlan.status === "DRAFT" && (
                <button
                  onClick={handleValidate}
                  className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Valider le plan
                </button>
              )}
              {activePlan.status === "VALIDATED" && (
                <>
                  <button
                    onClick={handleRevertToDraft}
                    className="rounded-md border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Repasser en brouillon
                  </button>
                  <button
                    onClick={handleComplete}
                    className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Terminer le plan
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
