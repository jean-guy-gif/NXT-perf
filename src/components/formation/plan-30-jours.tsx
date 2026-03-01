"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/charts/progress-bar";
import {
  computeTopPriorities,
  generatePlan30Days,
} from "@/lib/plan-30-jours";
import type { Plan30Days } from "@/lib/plan-30-jours";
import { savePlan, loadPlan, clearPlan } from "@/lib/plan-storage";
import type { FormationDiagnostic } from "@/types/formation";
import type { RatioId, RatioConfig } from "@/types/ratios";
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface Plan30JoursProps {
  diagnostic: FormationDiagnostic;
  ratioConfigs: Record<RatioId, RatioConfig>;
}

export function Plan30Jours({ diagnostic, ratioConfigs }: Plan30JoursProps) {
  const [plan, setPlan] = useState<Plan30Days | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadPlan();
    if (saved) setPlan(saved);
    setLoaded(true);
  }, []);

  const handleGenerate = useCallback(() => {
    const priorities = computeTopPriorities(diagnostic);
    if (priorities.length === 0) return;
    const newPlan = generatePlan30Days(priorities, ratioConfigs);
    setPlan(newPlan);
    savePlan(newPlan);
    setExpandedWeek(1);
  }, [diagnostic, ratioConfigs]);

  const handleRegenerate = useCallback(() => {
    clearPlan();
    handleGenerate();
  }, [handleGenerate]);

  const toggleAction = useCallback(
    (weekIdx: number, actionId: string) => {
      if (!plan) return;
      const updated = {
        ...plan,
        weeks: plan.weeks.map((w, i) =>
          i === weekIdx
            ? {
                ...w,
                actions: w.actions.map((a) =>
                  a.id === actionId ? { ...a, done: !a.done } : a
                ),
              }
            : w
        ),
      };
      setPlan(updated);
      savePlan(updated);
    },
    [plan]
  );

  if (!loaded) return null;

  const noPriorities = computeTopPriorities(diagnostic).length === 0;

  // ─── Pas de plan → CTA ──────────────────────────────────────────

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <CalendarCheck className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-foreground">
          Plan d&apos;action 30 jours
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {noPriorities
            ? "Aucune priorité détectée. Tous vos ratios sont conformes !"
            : "Générez un plan personnalisé basé sur votre diagnostic pour progresser en 4 semaines."}
        </p>
        {!noPriorities && (
          <button
            onClick={handleGenerate}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Générer mon plan 30 jours
          </button>
        )}
      </div>
    );
  }

  // ─── Plan affiché ────────────────────────────────────────────────

  const totalActions = plan.weeks.flatMap((w) => w.actions);
  const doneCount = totalActions.filter((a) => a.done).length;
  const globalProgress =
    totalActions.length > 0 ? (doneCount / totalActions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Mon plan 30 jours
          </h2>
          <p className="text-sm text-muted-foreground">
            Généré le{" "}
            {new Date(plan.generatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Regénérer
        </button>
      </div>

      {/* Barre de progression globale */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Progression globale
          </span>
          <span className="text-sm font-bold text-foreground">
            {doneCount}/{totalActions.length} actions
          </span>
        </div>
        <ProgressBar
          value={globalProgress}
          status={globalProgress >= 75 ? "ok" : globalProgress >= 40 ? "warning" : "danger"}
          showValue
          size="md"
        />
      </div>

      {/* Cartes priorité */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plan.priorities.map((p) => (
          <div
            key={p.ratioId}
            className={cn(
              "rounded-xl border bg-card p-5",
              p.status === "danger"
                ? "border-red-500/30"
                : "border-orange-500/30"
            )}
          >
            <div className="flex items-center gap-2">
              {p.status === "danger" ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {p.label}
              </span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-xs font-bold",
                  p.status === "danger"
                    ? "bg-red-500/20 text-red-500"
                    : "bg-orange-500/20 text-orange-500"
                )}
              >
                {p.status === "danger" ? "P1" : "P2"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {p.currentValue.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">→</span>
              <span className="text-sm font-medium text-muted-foreground">
                {p.targetValue}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Semaines (accordéon) */}
      <div className="space-y-3">
        {plan.weeks.map((week, weekIdx) => {
          const weekDone = week.actions.filter((a) => a.done).length;
          const weekTotal = week.actions.length;
          const weekProgress =
            weekTotal > 0 ? (weekDone / weekTotal) * 100 : 0;
          const isExpanded = expandedWeek === week.weekNumber;

          return (
            <div
              key={week.weekNumber}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Week header */}
              <button
                onClick={() =>
                  setExpandedWeek(isExpanded ? 0 : week.weekNumber)
                }
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    weekProgress === 100
                      ? "bg-green-500/20 text-green-500"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  S{week.weekNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Semaine {week.weekNumber}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {weekDone}/{weekTotal}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar
                      value={weekProgress}
                      status={
                        weekProgress === 100
                          ? "ok"
                          : weekProgress >= 50
                            ? "warning"
                            : "danger"
                      }
                      showValue={false}
                      size="sm"
                    />
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-5 pb-5 pt-3">
                  <ul className="space-y-2">
                    {week.actions.map((action) => (
                      <li key={action.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={action.done}
                            onChange={() => toggleAction(weekIdx, action.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                          />
                          <span
                            className={cn(
                              "text-sm",
                              action.done
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            )}
                          >
                            {action.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {/* Exercice NXT */}
                  {week.exercice && (
                    <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                        Exercice NXT associé
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {week.exercice}
                      </p>
                      <button
                        onClick={() =>
                          window.open("https://nxt.antigravity.fr", "_blank")
                        }
                        className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                      >
                        Je bloque 20 minutes maintenant
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
