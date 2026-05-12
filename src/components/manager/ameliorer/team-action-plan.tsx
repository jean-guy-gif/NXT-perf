"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Loader2,
  ListChecks,
  Percent,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getTeamActions } from "@/lib/coaching/coach-brain";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useTeamPlan } from "@/hooks/team/use-team-plan";
import { RatioInfoBadge } from "@/components/coaching/ratio-info-tooltip";
import {
  TEAM_PLAN_DURATION_DAYS,
  computeTeamPlanDay,
} from "@/lib/manager/team-plan";
import { TeamPlanProgressMatrix } from "./team-plan-progress-matrix";

interface TeamActionPlanProps {
  expertiseId: ExpertiseRatioId;
  leverLabel: string;
  /** Nombre max d'actions affichées (default 3). */
  max?: number;
  /**
   * Callback déclenché au clic "Lancer ce plan avec mon équipe". Permet à
   * la page d'activer l'affichage du bloc "Tout est prêt pour animer..."
   * (PR3.8 follow-up — gating supports d'animation).
   */
  onPlanStarted?: () => void;
}

/**
 * Bloc "Plan d'action équipe" (PR3.8.4 — Manager Collectif).
 *
 * Source : `getTeamActions` (coach-brain) — fallback automatique sur
 * `getTopPractices` si pas d'entrée TEAM_ACTIONS.
 *
 * CTA "Lancer ce plan avec mon équipe" — chantier d.1 :
 *   - Persiste désormais en DB via `useTeamPlan` (resource_type =
 *     "team_plan_30j", expires_at = now+30j). RLS prod gérée par
 *     `resources_team_plan_manager_write`.
 *   - Si un plan actif existe pour ce levier : affiche "Lancé le {date},
 *     J+x/30" + bouton "Archiver ce plan équipe" (Q5).
 *   - localStorage gating conservé via `onPlanStarted` callback parent
 *     pour compat (utile fallback démo / DB indisponible temporairement).
 *
 * Hors scope d.1 (à venir) :
 *   - d.2 : distribution UI conseillers (banner persistant + page détail)
 *   - d.3 : suivi hebdo manager (matrice action × conseiller)
 */
export function TeamActionPlan({
  expertiseId,
  leverLabel,
  max = 3,
  onPlanStarted,
}: TeamActionPlanProps) {
  // Sous-PR Coach-2a : fetch RAG lazy au mount. Fallback hardcoded immédiat
  // pour éviter un flash vide pendant le fetch. Le RAG marche aussi en mode
  // démo car /api/team-actions ne touche pas à la DB (juste OpenRouter +
  // retrieval Supabase corpus).
  const fallbackActions = useMemo(
    () => getTeamActions(expertiseId, max),
    [expertiseId, max],
  );
  const [actions, setActions] = useState<string[]>(fallbackActions);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsRagSucceeded, setActionsRagSucceeded] = useState(false);
  const fetchedExpertiseRef = useRef<string | null>(null);

  useEffect(() => {
    if (fetchedExpertiseRef.current === expertiseId) return;
    fetchedExpertiseRef.current = expertiseId;

    let cancelled = false;
    setActionsLoading(true);
    setActions(fallbackActions); // affichage immédiat fallback pendant fetch
    fetch("/api/team-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expertiseId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { actions: string[] };
        if (!cancelled && data.actions && data.actions.length >= 3) {
          setActions(data.actions);
          setActionsRagSucceeded(true);
        }
      })
      .catch((err) => {
        console.error("[team-action-plan] RAG fetch failed", err);
        // fallbackActions déjà dans le state
      })
      .finally(() => {
        if (!cancelled) setActionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expertiseId, fallbackActions]);

  const [launching, setLaunching] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sous-PR Coach-21 (meeting alignement) — toggle Vue Ratio / Vue Volume.
  // Permet au manager de comprendre le levier sous 2 angles sans changer
  // les actions : mesure (formule du ratio) vs impact (cascade volume).
  const [lensView, setLensView] = useState<"ratio" | "volume">("ratio");
  const expertise = RATIO_EXPERTISE[expertiseId];
  const ratioFormulaText = expertise?.formula ?? null;
  const volumeImpactText = expertise?.caImpactNote ?? null;

  const currentUser = useAppStore((s) => s.user);
  const teamId = currentUser?.teamId ?? null;
  const managerId = currentUser?.id ?? null;
  const { activePlan, createTeamPlan, archiveTeamPlan } = useTeamPlan(teamId);

  // Le plan actif est-il bien sur CE levier ? Un team plan actif sur un
  // autre levier n'empêche pas l'UI de s'afficher (le manager reste libre
  // de regarder le contenu du levier courant). Mais le bouton "Lancer" est
  // bloqué si un plan actif existe (un seul team plan actif à la fois pour
  // l'équipe — hypothèse V1).
  const isLaunchedForThisLever =
    !!activePlan && activePlan.payload.expertise_id === expertiseId;
  const hasOtherActivePlan =
    !!activePlan && activePlan.payload.expertise_id !== expertiseId;

  const launchedDateLabel = useMemo(() => {
    if (!activePlan) return null;
    const d = new Date(activePlan.created_at);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [activePlan]);

  const dayOfPlan = useMemo(() => {
    if (!activePlan) return 0;
    return computeTeamPlanDay(activePlan.created_at);
  }, [activePlan]);

  const handleLaunch = async () => {
    if (!teamId || !managerId) {
      setError("Identifiant d'équipe manquant — impossible de lancer le plan.");
      return;
    }
    if (launching) return;
    setLaunching(true);
    setError(null);
    try {
      await createTeamPlan({
        teamId,
        managerId,
        expertiseId,
        leverLabel,
        actions: actions.map((label) => ({ label })),
      });
      // Conserver le callback parent (gating localStorage) pour compat.
      onPlanStarted?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Erreur lors du lancement : ${msg}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleArchive = async () => {
    if (!activePlan || archiving) return;
    setArchiving(true);
    setError(null);
    try {
      await archiveTeamPlan(activePlan.id);
      setConfirmArchive(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Erreur lors de l'archivage : ${msg}`);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">
              Plan d&apos;action pour votre équipe
            </h2>
            {actionsLoading && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                role="status"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Coach NXT
              </span>
            )}
            {!actionsLoading && actionsRagSucceeded && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                title="Actions générées par Claude Sonnet 4.5 + corpus NXT-Coach"
              >
                <Sparkles className="h-3 w-3" />
                Coach NXT
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Objectif : améliorer{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              {leverLabel}
              <RatioInfoBadge expertiseId={expertiseId} size="sm" />
            </span>{" "}
            sur l&apos;ensemble de l&apos;équipe.
          </p>
        </div>
      </div>

      {/* Toggle Vue Ratio / Vue Volume — sous-PR Coach-21 meeting alignement.
          Le manager change l'angle de lecture sans modifier les actions. */}
      {(ratioFormulaText || volumeImpactText) && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <div
            role="tablist"
            aria-label="Angle de lecture du levier"
            className="inline-flex gap-1 rounded-md bg-background p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={lensView === "ratio"}
              onClick={() => setLensView("ratio")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                lensView === "ratio"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Percent className="h-3.5 w-3.5" />
              Vue ratio
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={lensView === "volume"}
              onClick={() => setLensView("volume")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                lensView === "volume"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Vue volume
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {lensView === "ratio" ? (
              <>
                <span className="font-semibold text-foreground">
                  Comment ça se mesure :
                </span>{" "}
                {ratioFormulaText
                  ? `formule ${ratioFormulaText}. Objectif : réduire l'écart de l'équipe à la cible sur ce ratio.`
                  : "ratio mesurant la conversion entre deux étapes du parcours."}
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">
                  Impact volume attendu :
                </span>{" "}
                {volumeImpactText ??
                  "amélioration de ce levier déclenche un effet cascade sur le volume d'estimations, de mandats et d'actes signés."}
              </>
            )}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {actions.map((action, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-lg border border-border bg-background px-4 py-3"
          >
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-foreground">
              {action}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/* État "Lancé" pour CE levier — affichage J+x/30 + archive */}
        {isLaunchedForThisLever ? (
          <>
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Lancé le {launchedDateLabel} · J+{dayOfPlan}/
              {TEAM_PLAN_DURATION_DAYS}
            </span>
            {confirmArchive ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-500">
                <span>Archiver ce plan ?</span>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="rounded bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {archiving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Confirmer"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmArchive(false)}
                  disabled={archiving}
                  className="rounded border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                >
                  Annuler
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Archive className="h-3.5 w-3.5" />
                Archiver ce plan équipe
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={handleLaunch}
            disabled={launching || hasOtherActivePlan}
            title={
              hasOtherActivePlan
                ? "Un plan équipe est déjà actif sur un autre levier — archivez-le d'abord."
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {launching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {launching ? "Lancement…" : "Lancer ce plan avec mon équipe"}
          </button>
        )}

        {error && (
          <p className="w-full text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Chantier d.3 — Suivi hebdo équipe : matrice action × conseiller
          rendue uniquement si le team plan actif correspond à CE levier. */}
      {isLaunchedForThisLever && activePlan && (
        <TeamPlanProgressMatrix
          planResourceId={activePlan.id}
          actions={activePlan.payload.actions}
        />
      )}
    </div>
  );
}
