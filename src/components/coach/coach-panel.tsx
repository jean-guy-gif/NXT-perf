"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { ComputedRatio } from "@/types/ratios";
import type { CoachAction } from "@/types/coach";
import { CoachPlanEditor } from "./coach-plan-editor";
import { cn } from "@/lib/utils";
import {
  ListTodo,
  CalendarDays,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

/* ────── Props ────── */
interface CoachPanelProps {
  assignmentId: string;
  userId: string;
  ratios: ComputedRatio[];
}

/* ────── Inline add-action form ────── */
function AddActionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, dueDate: string | null) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, dueDate || null);
    setTitle("");
    setDueDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border bg-muted/50 p-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'action…"
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        autoFocus
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ────── Action item ────── */
function ActionItem({
  action,
  onToggle,
}: {
  action: CoachAction;
  onToggle: () => void;
}) {
  const isDone = action.status === "DONE";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        isDone
          ? "bg-muted/30 border-muted"
          : "bg-card hover:shadow-sm"
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          isDone
            ? "bg-green-500/20 border-green-500/40 text-green-500"
            : "border-muted-foreground/30 hover:border-primary/50"
        )}
      >
        {isDone && <Check className="h-3 w-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            isDone && "line-through text-muted-foreground"
          )}
        >
          {action.title}
        </p>
        {action.dueDate && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Échéance : {action.dueDate}
          </p>
        )}
      </div>
    </div>
  );
}

/* ────── Main CoachPanel ────── */
export function CoachPanel({ assignmentId, userId, ratios }: CoachPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  const coachActions = useAppStore((s) => s.coachActions);
  const coachPlans = useAppStore((s) => s.coachPlans);
  const addCoachAction = useAppStore((s) => s.addCoachAction);
  const toggleCoachAction = useAppStore((s) => s.toggleCoachAction);
  const completeCoachPlan = useAppStore((s) => s.completeCoachPlan);

  // Filter actions for this assignment
  const allActions = coachActions.filter(
    (a) => a.coachAssignmentId === assignmentId
  );
  const todoActions = allActions.filter((a) => a.status === "TODO").slice(0, 3);
  const doneActions = allActions.filter((a) => a.status === "DONE");

  // Active plan for this assignment
  const activePlan = coachPlans.find(
    (p) => p.coachAssignmentId === assignmentId && p.status === "ACTIVE"
  );

  const handleAddAction = (title: string, dueDate: string | null) => {
    const newAction: CoachAction = {
      id: "cact-" + Date.now(),
      coachAssignmentId: assignmentId,
      title,
      status: "TODO",
      dueDate,
      createdAt: new Date().toISOString(),
    };
    addCoachAction(newAction);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* ═══ Section: Actions ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Actions</h3>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </button>
          )}
        </div>

        <div className="space-y-2">
          {/* Active actions (TODO) */}
          {todoActions.length === 0 && !showAddForm && (
            <p className="text-xs text-muted-foreground py-2">
              Aucune action en cours
            </p>
          )}
          {todoActions.map((action) => (
            <ActionItem
              key={action.id}
              action={action}
              onToggle={() => toggleCoachAction(action.id)}
            />
          ))}

          {/* Add form */}
          {showAddForm && (
            <AddActionForm
              onAdd={handleAddAction}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* Completed actions (collapsed) */}
          {doneActions.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                {showDone ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {doneActions.length} action{doneActions.length > 1 ? "s" : ""} terminée{doneActions.length > 1 ? "s" : ""}
              </button>
              {showDone && (
                <div className="mt-2 space-y-2">
                  {doneActions.map((action) => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      onToggle={() => toggleCoachAction(action.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Divider ═══ */}
      <div className="border-t" />

      {/* ═══ Section: Plan 30 jours ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Plan 30 jours</h3>
        </div>

        {activePlan ? (
          <div className="space-y-3">
            {/* 4-week timeline */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activePlan.weeks.map((week) => (
                <div
                  key={week.weekNumber}
                  className="rounded-lg border bg-card p-3 space-y-1.5"
                >
                  <p className="text-xs text-muted-foreground">
                    Semaine {week.weekNumber}
                  </p>
                  <p className="text-sm font-semibold">{week.focus}</p>
                  <ul className="space-y-0.5">
                    {week.actions.map((action, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Complete plan button */}
            <button
              onClick={() => completeCoachPlan(activePlan.id)}
              className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-500 hover:bg-green-500/20 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terminer le plan
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-6">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucun plan actif
            </p>
            <button
              onClick={() => setShowPlanEditor(true)}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Générer un plan
            </button>
          </div>
        )}
      </div>

      {/* ═══ Plan Editor Modal ═══ */}
      {showPlanEditor && (
        <CoachPlanEditor
          ratios={ratios}
          assignmentId={assignmentId}
          onClose={() => setShowPlanEditor(false)}
        />
      )}
    </div>
  );
}
