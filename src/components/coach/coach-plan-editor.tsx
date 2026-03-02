"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { generateCoachPlanWeeks } from "@/lib/coach";
import type { ComputedRatio } from "@/types/ratios";
import type { CoachPlanWeek } from "@/types/coach";
import { X, CalendarDays } from "lucide-react";

/* ────── Props ────── */
interface CoachPlanEditorProps {
  ratios: ComputedRatio[];
  assignmentId: string;
  onClose: () => void;
}

/* ────── Editable week state ────── */
interface EditableWeek {
  weekNumber: 1 | 2 | 3 | 4;
  focus: string;
  actionsText: string; // one action per line
}

function toEditable(weeks: CoachPlanWeek[]): EditableWeek[] {
  return weeks.map((w) => ({
    weekNumber: w.weekNumber,
    focus: w.focus,
    actionsText: w.actions.join("\n"),
  }));
}

function fromEditable(weeks: EditableWeek[]): CoachPlanWeek[] {
  return weeks.map((w) => ({
    weekNumber: w.weekNumber,
    focus: w.focus,
    actions: w.actionsText
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean),
  }));
}

/* ────── Main component ────── */
export function CoachPlanEditor({
  ratios,
  assignmentId,
  onClose,
}: CoachPlanEditorProps) {
  const createCoachPlan = useAppStore((s) => s.createCoachPlan);

  // Auto-generate initial weeks from ratios
  const initialWeeks = useMemo(() => generateCoachPlanWeeks(ratios), [ratios]);
  const [weeks, setWeeks] = useState<EditableWeek[]>(() =>
    toEditable(initialWeeks)
  );

  const updateWeek = (index: number, field: keyof EditableWeek, value: string) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    );
  };

  const handleValidate = () => {
    const planId = "cplan-" + Date.now();
    const today = new Date().toISOString().slice(0, 10);

    createCoachPlan({
      id: planId,
      coachAssignmentId: assignmentId,
      startDate: today,
      status: "ACTIVE",
      weeks: fromEditable(weeks),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Nouveau plan 30 jours</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Week cards */}
        <div className="space-y-4 p-5">
          {weeks.map((week, index) => (
            <div
              key={week.weekNumber}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Semaine {week.weekNumber}
              </p>

              {/* Focus */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Focus
                </label>
                <input
                  type="text"
                  value={week.focus}
                  onChange={(e) => updateWeek(index, "focus", e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Actions */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Actions (une par ligne)
                </label>
                <textarea
                  value={week.actionsText}
                  onChange={(e) =>
                    updateWeek(index, "actionsText", e.target.value)
                  }
                  rows={3}
                  className="w-full resize-y rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer buttons */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Valider le plan
          </button>
        </div>
      </div>
    </div>
  );
}
