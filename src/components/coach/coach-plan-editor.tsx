"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { generateCoachPlan } from "@/lib/coach";
import type { ComputedRatio, RatioId } from "@/types/ratios";
import type { CoachPlanAction, CoachPlanWeek } from "@/types/coach";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import { X, CalendarDays, Plus, Trash2 } from "lucide-react";

/* ────── Constants ────── */
const CHANNEL_OPTIONS = [
  "téléphone",
  "terrain",
  "email",
  "visio",
  "bureau",
  "mixte",
] as const;

const ALL_RATIO_IDS: RatioId[] = [
  "contacts_rdv",
  "rdv_mandats",
  "pct_mandats_exclusifs",
  "acheteurs_visites",
  "visites_offre",
  "offres_compromis",
  "compromis_actes",
  "honoraires_moyens",
];

const MAX_ACTIONS_PER_WEEK = 6;

/* ────── Props ────── */
interface CoachPlanEditorProps {
  ratios: ComputedRatio[];
  assignmentId: string;
  onClose: () => void;
}

/* ────── Helpers ────── */
function createEmptyAction(weekNum: number, actionIdx: number): CoachPlanAction {
  return {
    id: `pa-new-${Date.now()}-${weekNum}-${actionIdx}`,
    label: "",
    frequency: "hebdomadaire",
    channel: "mixte",
    proof: "",
    linkedKpi: null,
    done: false,
  };
}

/* ────── Main component ────── */
export function CoachPlanEditor({
  ratios,
  assignmentId,
  onClose,
}: CoachPlanEditorProps) {
  const createCoachPlan = useAppStore((s) => s.createCoachPlan);

  // Auto-generate initial plan from ratios
  const initialPlan = useMemo(
    () => generateCoachPlan(ratios, assignmentId),
    [ratios, assignmentId]
  );

  const [title, setTitle] = useState(initialPlan.title);
  const [objective, setObjective] = useState(initialPlan.objective);
  const [weeks, setWeeks] = useState<CoachPlanWeek[]>(initialPlan.weeks);

  /* ── Week-level updates ── */
  const updateWeekFocus = (weekIdx: number, focus: string) => {
    setWeeks((prev) =>
      prev.map((w, i) => (i === weekIdx ? { ...w, focus } : w))
    );
  };

  /* ── Action-level updates ── */
  const updateAction = (
    weekIdx: number,
    actionIdx: number,
    field: keyof CoachPlanAction,
    value: string | boolean | null
  ) => {
    setWeeks((prev) =>
      prev.map((w, wi) =>
        wi === weekIdx
          ? {
              ...w,
              actions: w.actions.map((a, ai) =>
                ai === actionIdx ? { ...a, [field]: value } : a
              ),
            }
          : w
      )
    );
  };

  const addAction = (weekIdx: number) => {
    setWeeks((prev) =>
      prev.map((w, wi) => {
        if (wi !== weekIdx || w.actions.length >= MAX_ACTIONS_PER_WEEK) return w;
        return {
          ...w,
          actions: [
            ...w.actions,
            createEmptyAction(w.weekNumber, w.actions.length),
          ],
        };
      })
    );
  };

  const removeAction = (weekIdx: number, actionIdx: number) => {
    setWeeks((prev) =>
      prev.map((w, wi) => {
        if (wi !== weekIdx || w.actions.length <= 1) return w;
        return {
          ...w,
          actions: w.actions.filter((_, ai) => ai !== actionIdx),
        };
      })
    );
  };

  /* ── Save ── */
  const handleValidate = () => {
    // Filter out actions with empty labels
    const cleanedWeeks = weeks.map((w) => ({
      ...w,
      actions: w.actions.filter((a) => a.label.trim() !== ""),
    }));

    createCoachPlan({
      ...initialPlan,
      title: title.trim() || initialPlan.title,
      objective: objective.trim() || initialPlan.objective,
      status: "DRAFT",
      weeks: cleanedWeeks,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border bg-background shadow-xl">
        {/* ═══ Sticky Header ═══ */}
        <div className="flex items-center justify-between border-b bg-background px-5 py-4 shrink-0">
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

        {/* ═══ Scrollable Content ═══ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title + Objective */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Titre du plan
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Objectif
              </label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Week cards */}
          {weeks.map((week, weekIdx) => (
            <div
              key={week.weekNumber}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Semaine {week.weekNumber}
                </p>
              </div>

              {/* Focus */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Focus
                </label>
                <input
                  type="text"
                  value={week.focus}
                  onChange={(e) => updateWeekFocus(weekIdx, e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">
                  Actions
                </label>

                {week.actions.map((action, actionIdx) => (
                  <div
                    key={action.id}
                    className="rounded-md border bg-muted/30 p-3 space-y-2"
                  >
                    {/* Row 1: label + remove */}
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={action.label}
                        onChange={(e) =>
                          updateAction(weekIdx, actionIdx, "label", e.target.value)
                        }
                        placeholder="Libellé de l'action…"
                        className="flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        onClick={() => removeAction(weekIdx, actionIdx)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Row 2: frequency, channel, proof */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">
                          Fréquence
                        </label>
                        <input
                          type="text"
                          value={action.frequency}
                          onChange={(e) =>
                            updateAction(weekIdx, actionIdx, "frequency", e.target.value)
                          }
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">
                          Canal
                        </label>
                        <select
                          value={action.channel}
                          onChange={(e) =>
                            updateAction(weekIdx, actionIdx, "channel", e.target.value)
                          }
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          {CHANNEL_OPTIONS.map((ch) => (
                            <option key={ch} value={ch}>
                              {ch}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">
                          Preuve
                        </label>
                        <input
                          type="text"
                          value={action.proof}
                          onChange={(e) =>
                            updateAction(weekIdx, actionIdx, "proof", e.target.value)
                          }
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>

                    {/* Row 3: linkedKpi + done */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">
                          KPI lié
                        </label>
                        <select
                          value={action.linkedKpi ?? ""}
                          onChange={(e) =>
                            updateAction(
                              weekIdx,
                              actionIdx,
                              "linkedKpi",
                              e.target.value || null
                            )
                          }
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <option value="">Aucun</option>
                          {ALL_RATIO_IDS.map((rid) => (
                            <option key={rid} value={rid}>
                              {defaultRatioConfigs[rid].name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-1.5 pt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={action.done}
                          onChange={(e) =>
                            updateAction(weekIdx, actionIdx, "done", e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border accent-green-500"
                        />
                        <span className="text-xs text-muted-foreground">Fait</span>
                      </label>
                    </div>
                  </div>
                ))}

                {/* Add action button */}
                {week.actions.length < MAX_ACTIONS_PER_WEEK && (
                  <button
                    onClick={() => addAction(weekIdx)}
                    className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full justify-center"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter une action
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ Sticky Footer ═══ */}
        <div className="flex items-center justify-end gap-2 border-t bg-background px-5 py-4 shrink-0">
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
