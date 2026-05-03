"use client";

import { useMemo } from "react";
import { CheckCircle2, ListTodo, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import { PLAN_30J_DURATION_DAYS, type Plan30jPayload } from "@/config/coaching";
import { CATEGORY_LABELS } from "@/lib/constants";
import { IndividualCoachingPrep } from "@/components/manager/individual/individual-coaching-prep";

/**
 * ManagerIndividualAmeliorerView (PR3.8 follow-up).
 *
 * Vue manager pour l'onglet "M'améliorer" en mode Individuel. Remplace
 * `<AmeliorerAdaptiveFlow>` (qui inclut la création de plan côté conseiller)
 * par une vue OBSERVATION + ACCOMPAGNEMENT :
 *
 *   - Si le conseiller a un plan actif : affiche levier + J+X/30 +
 *     progression % + actions cochées vs restantes (lecture seule).
 *   - Sinon : message "Pas de plan actif" sans CTA de création
 *     (le manager ne crée pas de plan à la place du conseiller).
 *   - Toujours : bloc "Préparer mon coaching individuel" avec trame de
 *     questions, copier, télécharger .md et slides.
 *
 * Ce composant est rendu DANS un `<ConseillerProxy>` (PR3.8.5) → useUser()
 * et useImprovementResources() renvoient les données du conseiller
 * sélectionné, pas du manager.
 */
export function ManagerIndividualAmeliorerView() {
  const { user, category } = useUser();
  const { getActivePlan, loading } = useImprovementResources();
  const activePlan = loading ? null : getActivePlan();

  const planSummary = useMemo(() => {
    if (!activePlan) return null;
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const remaining = Math.max(0, total - done);

    const startedAt = new Date(activePlan.created_at);
    const elapsedDays = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)),
      ),
    );

    const ratioId = payload.pain_ratio_id as ExpertiseRatioId | undefined;
    const expertise = ratioId ? RATIO_EXPERTISE[ratioId] : null;

    return {
      ratioId: ratioId ?? null,
      lever: expertise?.label ?? "Plan ciblé",
      total,
      done,
      remaining,
      pct,
      elapsedDays,
      totalDays: PLAN_30J_DURATION_DAYS,
    };
  }, [activePlan]);

  if (!user) return null;

  const advisor = {
    firstName: user.firstName,
    lastName: user.lastName,
    level: CATEGORY_LABELS[category] ?? category,
  };

  // Levier en focus pour le coaching kit : celui du plan actif si disponible.
  const coachingExpertiseId: ExpertiseRatioId | null =
    planSummary?.ratioId ?? null;
  const coachingProgress = planSummary
    ? {
        dayOfPlan: planSummary.elapsedDays,
        totalDays: planSummary.totalDays,
        donePct: planSummary.pct,
        remaining: planSummary.remaining,
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Bandeau identifiant du conseiller observé */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserRound className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            Vue observation — {advisor.firstName} {advisor.lastName ?? ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {advisor.level}
            {" · "}
            Mode accompagnement (lecture seule du plan).
          </p>
        </div>
      </div>

      {planSummary ? (
        <ActivePlanReadOnly summary={planSummary} />
      ) : (
        <NoActivePlanCard firstName={advisor.firstName} />
      )}

      <IndividualCoachingPrep
        advisor={advisor}
        expertiseId={coachingExpertiseId}
        progress={coachingProgress}
      />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function ActivePlanReadOnly({
  summary,
}: {
  summary: {
    lever: string;
    total: number;
    done: number;
    remaining: number;
    pct: number;
    elapsedDays: number;
    totalDays: number;
  };
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Plan 30 jours en cours
          </p>
          <h3 className="mt-1 text-xl font-bold text-foreground">
            {summary.lever}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Avancement</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {summary.pct}%
          </p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all",
            summary.pct === 0 && "bg-muted",
          )}
          style={{ width: `${summary.pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Metric
          label="Jour"
          value={`J+${summary.elapsedDays}/${summary.totalDays}`}
        />
        <Metric
          label="Actions cochées"
          value={`${summary.done}/${summary.total}`}
          icon={CheckCircle2}
          tone="ok"
        />
        <Metric
          label="Actions restantes"
          value={summary.remaining.toString()}
          icon={ListTodo}
        />
        <Metric label="Progression" value={`${summary.pct}%`} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: typeof CheckCircle2;
  tone?: "ok";
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-base font-bold tabular-nums text-foreground",
          tone === "ok" && "text-emerald-600 dark:text-emerald-500",
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {value}
      </p>
    </div>
  );
}

function NoActivePlanCard({ firstName }: { firstName: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
      <h3 className="text-base font-semibold text-foreground">
        Pas de plan actif
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {firstName} n&apos;a pas encore de plan 30 jours en cours. Préparez un
        accompagnement individuel ci-dessous pour cadrer un point ensemble —
        le plan reste à initier par {firstName}.
      </p>
    </div>
  );
}
