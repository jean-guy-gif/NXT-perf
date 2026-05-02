"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/charts/progress-bar";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useAppStore } from "@/stores/app-store";
import { useUser } from "@/hooks/use-user";
import { useRatios } from "@/hooks/use-ratios";
import { useResults } from "@/hooks/use-results";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import type {
  Plan30jPayload,
  Plan30jWeek,
  Plan30jAction,
  Plan30jActionStatus,
} from "@/config/coaching";
import type { PeriodResults } from "@/types/results";
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FastForward,
  Circle,
  CircleDashed,
  BookOpen,
} from "lucide-react";
import { ActionObjectiveDrawer } from "@/components/conseiller/ameliorer/action-objective-drawer";
import { buildResourceFromExpertise } from "@/data/action-resources";
import { pickRandomDemoRatio } from "@/lib/demo-ratio-picker";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

type ToastState = { type: "success" | "error" | "info"; message: string } | null;

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function Plan30Jours() {
  const { user, category } = useUser();
  const { computedRatios } = useRatios();
  const latestResults = useResults();
  const allResults = useAppStore((s) => s.results);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const isDemoMode = useAppStore((s) => s.isDemoMode);
  const {
    loading,
    getActivePlan,
    createPlan30j,
    refresh,
    updateResource,
    resetPlan,
  } = useImprovementResources();

  const [expandedWeek, setExpandedWeek] = useState<number>(1);
  const [toast, setToast] = useState<ToastState>(null);
  const [generating, setGenerating] = useState(false);
  const [localPayload, setLocalPayload] = useState<Plan30jPayload | null>(null);

  const activePlan = getActivePlan();

  useEffect(() => {
    if (activePlan?.payload) {
      setLocalPayload(activePlan.payload as unknown as Plan30jPayload);
    } else {
      setLocalPayload(null);
    }
  }, [activePlan]);

  const userHistory = useMemo(
    () => allResults.filter((r) => r.userId === user?.id),
    [allResults, user?.id]
  );

  const handleGenerate = useCallback(async () => {
    if (!user || !latestResults) {
      setToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }
    setGenerating(true);
    setToast(null);
    try {
      const measuredRatios = buildMeasuredRatios(computedRatios, latestResults);
      const profile = deriveProfileLevel(category);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        userHistory
      );
      await createPlan30j({
        mode: "auto",
        measuredRatios,
        profile,
        avgCommissionEur,
      });
      setExpandedWeek(1);
      setToast({ type: "success", message: "Plan 30 jours généré" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setToast({
          type: "info",
          message: "Vous avez déjà un plan actif, voici votre plan actuel",
        });
        await refresh();
      } else if (msg.startsWith("NO_PAIN_POINT")) {
        setToast({
          type: "info",
          message: "Aucun ratio en sous-performance détecté",
        });
      } else {
        setToast({ type: "error", message: "Erreur lors de la création du plan" });
      }
    } finally {
      setGenerating(false);
    }
  }, [
    user,
    latestResults,
    computedRatios,
    category,
    agencyObjective,
    userHistory,
    createPlan30j,
    refresh,
  ]);

  const handleRegenerateDemo = useCallback(async () => {
    if (!user || !latestResults) {
      setToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }
    setGenerating(true);
    setToast(null);

    const previousRatioId =
      (getActivePlan()?.pain_ratio_id as ExpertiseRatioId | null) ?? null;

    try {
      await resetPlan();
    } catch {
      setGenerating(false);
      setToast({
        type: "error",
        message: "Impossible de réinitialiser le plan, réessayez",
      });
      return;
    }
    try {
      const measuredRatios = buildMeasuredRatios(computedRatios, latestResults);
      const profile = deriveProfileLevel(category);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        userHistory
      );
      const randomRatioId = pickRandomDemoRatio(measuredRatios, previousRatioId);
      if (!randomRatioId) {
        setToast({
          type: "info",
          message: "Aucun ratio mesuré disponible pour régénérer",
        });
        return;
      }
      await createPlan30j({
        mode: "targeted",
        ratioId: randomRatioId,
        measuredRatios,
        profile,
        avgCommissionEur,
      });
      setExpandedWeek(1);
      setToast({ type: "success", message: "Nouveau plan 30 jours généré" });
    } catch {
      setToast({ type: "error", message: "Erreur lors de la création du plan" });
    } finally {
      setGenerating(false);
    }
  }, [
    user,
    latestResults,
    computedRatios,
    category,
    agencyObjective,
    userHistory,
    createPlan30j,
    resetPlan,
    getActivePlan,
  ]);

  const handleFastForward = useCallback(async () => {
    const activePlan = getActivePlan();
    if (!activePlan) {
      setToast({ type: "info", message: "Aucun plan actif à simuler" });
      return;
    }
    if (!user?.id) return;
    if (typeof window === "undefined") return;

    // 1) Calculer le progrès par semaine depuis les actions réelles du plan
    const payload = activePlan.payload as unknown as Plan30jPayload | null;
    const weeks = payload?.weeks ?? [];
    const progressByWeek = weeks.map((w) => {
      const total = w.actions.length;
      const done = w.actions.filter(
        (a) => a.status === "done" || a.done === true
      ).length;
      return total > 0 ? done / total : 0;
    });
    while (progressByWeek.length < 4) progressByWeek.push(0);

    // 2) Simuler 4 saisies hebdo et les injecter dans le store
    const painRatioId = (activePlan.pain_ratio_id as string) ?? "contacts_estimations";
    const simulated = buildSimulatedResults(
      user.id,
      activePlan.created_at,
      painRatioId,
      progressByWeek
    );
    const addResults = useAppStore.getState().addResults;
    for (const r of simulated) {
      addResults(r);
    }

    // 3) Forcer l'expiration du plan en localStorage (demo uniquement)
    const key = `demo_improvement_resources_${user.id}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      setToast({ type: "error", message: "Mode démo introuvable" });
      return;
    }
    try {
      const rows = JSON.parse(raw) as Array<{ id: string; expires_at: string | null }>;
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const updatedRows = rows.map((r) =>
        r.id === activePlan.id ? { ...r, expires_at: pastDate } : r
      );
      window.localStorage.setItem(key, JSON.stringify(updatedRows));
    } catch {
      setToast({ type: "error", message: "Données démo corrompues" });
      return;
    }

    await refresh();
    setToast({
      type: "success",
      message: "Plan expiré, 4 saisies simulées ajoutées, debrief gratuit débloqué !",
    });
  }, [getActivePlan, user?.id, refresh]);

  const toggleAction = useCallback(
    async (weekNumber: number, actionId: string) => {
      if (!localPayload || !activePlan) return;
      const nextPayload: Plan30jPayload = {
        ...localPayload,
        weeks: localPayload.weeks.map((w) =>
          w.week_number === weekNumber
            ? {
                ...w,
                actions: w.actions.map((a) => {
                  if (a.id !== actionId) return a;
                  const current: Plan30jActionStatus =
                    a.status ?? (a.done ? "done" : "todo");
                  const nextStatus = cycleStatus(current);
                  return {
                    ...a,
                    status: nextStatus,
                    done: nextStatus === "done",
                  };
                }),
              }
            : w
        ),
      };
      setLocalPayload(nextPayload);
      await updateResource(activePlan.id, {
        payload: nextPayload as unknown as Record<string, unknown>,
      });
    },
    [localPayload, activePlan, updateResource]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ─── Pas de plan actif → CTA de génération ────────────────────────
  if (!activePlan || !localPayload) {
    return (
      <div className="space-y-4">
        {toast && <Toast state={toast} onDismiss={() => setToast(null)} />}
        {isDemoMode && (
          <div className="flex justify-end">
            <FastForwardButton onClick={handleFastForward} />
          </div>
        )}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CalendarCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-foreground">
            Plan d&apos;action 30 jours
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Générez un plan personnalisé basé sur votre plus gros point de douleur.
            Le plan cible un seul ratio pour maximiser l&apos;impact.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Génération en cours…" : "Générer mon plan"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Plan actif → affichage ────────────────────────────────────────
  const daysElapsed = daysBetween(activePlan.created_at, new Date().toISOString());
  const daysRemaining = activePlan.expires_at
    ? daysBetween(new Date().toISOString(), activePlan.expires_at)
    : Math.max(0, 30 - daysElapsed);
  const xOfThirty = Math.min(30, daysElapsed);
  const allActions = localPayload.weeks.flatMap((w) => w.actions);
  const doneCount = allActions.filter(
    (a) => a.status === "done" || a.done === true
  ).length;
  const globalProgress =
    allActions.length > 0 ? (doneCount / allActions.length) * 100 : 0;
  const painExpertise = RATIO_EXPERTISE[localPayload.pain_ratio_id as keyof typeof RATIO_EXPERTISE];

  return (
    <div className="space-y-6">
      {toast && <Toast state={toast} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Plan en cours</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              J+{xOfThirty}/30
            </span>
          </div>
          {painExpertise && (
            <p className="mt-1 text-sm text-muted-foreground">
              Focus : <span className="font-medium text-foreground">{painExpertise.label}</span>
              {daysRemaining > 0 && (
                <span> · {daysRemaining} jour{daysRemaining > 1 ? "s" : ""} restants</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDemoMode && <FastForwardButton onClick={handleFastForward} />}
          {isDemoMode ? (
            <button
              onClick={handleRegenerateDemo}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {generating ? "Régénération…" : "Régénérer"}
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                Démo
              </span>
            </button>
          ) : (
            <button
              disabled
              title="Un plan est déjà actif — attendez son expiration (30 jours)"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground/60 cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4" />
              Régénérer
            </button>
          )}
        </div>
      </div>

      {/* Diagnostic / best practices */}
      {painExpertise && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Diagnostic</p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">{painExpertise.diagnosis}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ce que font les meilleurs</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{painExpertise.bestPractices}</p>
          </div>
        </div>
      )}

      {/* Progression globale */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progression globale</span>
          <span className="text-sm font-bold text-foreground">
            {doneCount}/{allActions.length} actions
          </span>
        </div>
        <ProgressBar
          value={globalProgress}
          status={globalProgress >= 75 ? "ok" : globalProgress >= 40 ? "warning" : "danger"}
          showValue
          size="md"
        />
      </div>

      {/* Semaines (accordéon) */}
      <div className="space-y-3">
        {localPayload.weeks.map((week) => (
          <WeekAccordion
            key={week.week_number}
            week={week}
            isExpanded={expandedWeek === week.week_number}
            onToggle={() =>
              setExpandedWeek(expandedWeek === week.week_number ? 0 : week.week_number)
            }
            onToggleAction={(actionId) => toggleAction(week.week_number, actionId)}
            painRatioId={localPayload.pain_ratio_id}
          />
        ))}
      </div>
    </div>
  );
}

function WeekAccordion({
  week,
  isExpanded,
  onToggle,
  onToggleAction,
  painRatioId,
}: {
  week: Plan30jWeek;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleAction: (actionId: string) => void;
  painRatioId: string;
}) {
  const weekDone = week.actions.filter(
    (a) => a.status === "done" || a.done === true
  ).length;
  const weekTotal = week.actions.length;
  const weekProgress = weekTotal > 0 ? (weekDone / weekTotal) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
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
          S{week.week_number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              Semaine {week.week_number} — {week.focus}
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
                weekProgress === 100 ? "ok" : weekProgress >= 50 ? "warning" : "danger"
              }
              showValue={false}
              size="sm"
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-5 pb-5 pt-3">
          <ul className="space-y-2">
            {week.actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onToggle={() => onToggleAction(action.id)}
                painRatioId={painRatioId}
              />
            ))}
          </ul>

          {week.exercice && (
            <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                Exercice NXT associé
              </p>
              <p className="mt-1 text-sm text-foreground">{week.exercice}</p>
              <button
                onClick={() => window.open("https://nxt.antigravity.fr", "_blank")}
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
}

function getTooltipForStatus(status: Plan30jActionStatus): string {
  switch (status) {
    case "todo":
      return "Marquer comme en cours";
    case "in_progress":
      return "Marquer comme terminé";
    case "done":
      return "Remettre à faire";
  }
}

function ActionRow({
  action,
  onToggle,
  painRatioId,
}: {
  action: Plan30jAction;
  onToggle: () => void;
  painRatioId: string;
}) {
  const [resourceOpen, setResourceOpen] = useState(false);
  const resource = buildResourceFromExpertise(painRatioId);

  const status: Plan30jActionStatus =
    action.status ?? (action.done ? "done" : "todo");

  const config =
    status === "done"
      ? { Icon: CheckCircle2, iconClass: "text-green-500", labelClass: "text-muted-foreground line-through", aria: "Terminé" }
      : status === "in_progress"
      ? { Icon: CircleDashed, iconClass: "text-amber-500", labelClass: "text-foreground", aria: "En cours" }
      : { Icon: Circle, iconClass: "text-muted-foreground/60", labelClass: "text-foreground", aria: "À faire" };
  const Icon = config.Icon;
  const tooltip = getTooltipForStatus(status);

  return (
    <li className="flex items-start gap-2 rounded-lg py-3 px-2 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-label={tooltip}
        title={tooltip}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
      >
        <Icon className={cn("h-6 w-6", config.iconClass)} />
      </button>
      <span className={cn("flex-1 min-w-0 self-center text-sm", config.labelClass)}>
        {action.label}
      </span>
      <button
        type="button"
        onClick={() => setResourceOpen(true)}
        title="Objectif de cette action"
        aria-label="Objectif de cette action"
        className="flex shrink-0 items-center gap-1.5 self-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Objectif de cette action</span>
      </button>
      <ActionObjectiveDrawer
        open={resourceOpen}
        onClose={() => setResourceOpen(false)}
        title={resource.title}
        content={resource.content}
        isPlaceholder={resource.isPlaceholder}
      />
    </li>
  );
}

function cycleStatus(current: Plan30jActionStatus): Plan30jActionStatus {
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return "todo";
}

function buildSimulatedResults(
  userId: string,
  planCreatedAtIso: string,
  painRatioId: string,
  progressByWeek: number[]
): PeriodResults[] {
  const createdAt = new Date(planCreatedAtIso);
  const results: PeriodResults[] = [];

  for (let week = 1; week <= 4; week++) {
    const progress = Math.max(0, Math.min(1, progressByWeek[week - 1] ?? 0));
    const boost = 1 + progress * 0.3; // jusqu'à +30 % avec 100 % done

    // Baselines réalistes (perf moyenne/faible)
    let contactsTotaux = 50;
    let rdvEstimation = 6;
    let estimationsRealisees = 6;
    let mandatsSignes = 3;
    let pctExclusif = 0.5;
    let nombreVisites = 15;
    let acheteursSortisVisite = 5;
    let offresRecues = 2;
    let compromisSignes = 2;
    let actesSignes = 2;

    switch (painRatioId) {
      case "contacts_estimations":
        // ratio contactsTotaux / rdvEstimation doit BAISSER → + de RDV pour les mêmes contacts
        rdvEstimation = Math.round(rdvEstimation * boost);
        estimationsRealisees = Math.round(estimationsRealisees * boost);
        break;
      case "estimations_mandats":
        // ratio rdvEstim / mandats → + de mandats
        mandatsSignes = Math.round(mandatsSignes * boost);
        break;
      case "pct_exclusivite":
        pctExclusif = Math.min(0.9, 0.3 + 0.5 * progress); // 30 % → 80 %
        break;
      case "acheteurs_tournee":
      case "visites_par_acheteur":
        // ratio nombreVisites / acheteursSortisVisite → + d'acheteurs sortis
        acheteursSortisVisite = Math.round(acheteursSortisVisite * boost);
        break;
      case "visites_offres":
        // ratio visites / offres → + d'offres
        offresRecues = Math.round(offresRecues * boost);
        break;
      case "offres_compromis":
        compromisSignes = Math.round(compromisSignes * boost);
        break;
      case "compromis_actes":
        actesSignes = Math.round(actesSignes * boost);
        break;
    }

    const numExclu = Math.max(0, Math.min(mandatsSignes, Math.floor(mandatsSignes * pctExclusif)));
    const weekStart = new Date(createdAt.getTime() + (week - 1) * 7 * 24 * 3600 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 3600 * 1000);

    results.push({
      id: `sim-result-${week}-${createdAt.getTime()}`,
      userId,
      periodType: "week",
      periodStart: weekStart.toISOString(),
      periodEnd: weekEnd.toISOString(),
      prospection: {
        contactsTotaux,
        rdvEstimation,
      },
      vendeurs: {
        rdvEstimation,
        estimationsRealisees,
        mandatsSignes,
        mandats: Array.from({ length: mandatsSignes }, (_, i) => ({
          id: `sim-mandat-${week}-${i}-${createdAt.getTime()}`,
          type: i < numExclu ? ("exclusif" as const) : ("simple" as const),
        })),
        rdvSuivi: 2,
        requalificationSimpleExclusif: 1,
        baissePrix: 0,
      },
      acheteurs: {
        acheteursSortisVisite,
        nombreVisites,
        offresRecues,
        compromisSignes,
        chiffreAffairesCompromis: compromisSignes * 10000,
      },
      ventes: {
        actesSignes,
        chiffreAffaires: actesSignes * 9000,
      },
      createdAt: weekEnd.toISOString(),
      updatedAt: weekEnd.toISOString(),
    });
  }

  return results;
}

function FastForwardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Mode démo : simule l'expiration du plan pour montrer la suite du flywheel"
      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
    >
      <FastForward className="h-3.5 w-3.5" />
      Simuler 30 jours
    </button>
  );
}

function Toast({ state, onDismiss }: { state: NonNullable<ToastState>; onDismiss: () => void }) {
  const styles =
    state.type === "success"
      ? { bg: "border-green-500/30 bg-green-500/5", Icon: CheckCircle2, iconClass: "text-green-500" }
      : state.type === "error"
      ? { bg: "border-red-500/30 bg-red-500/5", Icon: XCircle, iconClass: "text-red-500" }
      : { bg: "border-amber-500/30 bg-amber-500/5", Icon: AlertTriangle, iconClass: "text-amber-500" };
  const Icon = styles.Icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", styles.bg)}>
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", styles.iconClass)} />
      <p className="flex-1 text-sm text-foreground">{state.message}</p>
      <button
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Fermer
      </button>
    </div>
  );
}
