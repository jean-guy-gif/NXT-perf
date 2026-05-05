"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import type { ImprovementResource } from "@/hooks/use-improvement-resources";
import { PlanDebriefScreen } from "@/components/coaching/plan-debrief-screen";
import { computePlanDebrief } from "@/lib/plan-debrief";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import { pickRandomDemoRatio } from "@/lib/demo-ratio-picker";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { useRatios } from "@/hooks/use-ratios";
import { useResults } from "@/hooks/use-results";
import { useUser } from "@/hooks/use-user";
import { useUserContext } from "@/hooks/use-user-context";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

export default function CoachingDebriefPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Mode "Revoir ce plan" depuis Ma Progression (PR3.7.3) : ?planId=<uuid>&readonly=1
  const queryPlanId = searchParams.get("planId");
  // Any direct planId access is treated as archived/read-only consultation.
  // Interactive debrief flows should come from active coaching state, not query planId.
  const isReadonly = searchParams.get("readonly") === "1" || !!queryPlanId;
  const user = useAppStore((s) => s.user);
  const allResults = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const isDemoMode = useAppStore((s) => s.isDemoMode);

  const {
    getNxtCoachingResource,
    getArchivedPlanById,
    updateResource,
    resetPlan,
    createPlan30j,
    loading,
  } = useImprovementResources();
  const { category } = useUser();
  // Chantier A.3.x — propagation matrice 4 axes côté createPlan30j.
  const userCtx = useUserContext();
  const { computedRatios } = useRatios();
  const latestResults = useResults();

  const [archivedPlan, setArchivedPlan] = useState<ImprovementResource | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const nxtCoaching = getNxtCoachingResource();
  // En mode readonly + queryPlanId, on bypass la résolution via nxt_coaching
  // et on fetch directement le plan demandé depuis l'URL.
  const sourcePlanId =
    queryPlanId ??
    ((nxtCoaching?.payload as { source_plan_id?: string } | null)
      ?.source_plan_id ?? null);

  // Fetch archived plan
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !sourcePlanId) {
        setPlanLoading(false);
        return;
      }
      const plan = await getArchivedPlanById(sourcePlanId);
      if (!cancelled) {
        setArchivedPlan(plan);
        setPlanLoading(false);
      }
    }
    setPlanLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [user, sourcePlanId, getArchivedPlanById]);

  const userResults = useMemo(
    () => (user ? allResults.filter((r) => r.userId === user.id) : []),
    [allResults, user]
  );

  const debrief = useMemo(() => {
    if (!archivedPlan) return null;
    const avgCommissionEur = getAvgCommissionEur(
      agencyObjective?.avgActValue,
      userResults
    );
    return computePlanDebrief(archivedPlan, userResults, ratioConfigs, avgCommissionEur);
  }, [archivedPlan, userResults, ratioConfigs, agencyObjective]);

  const handleResetPlanDemo = async () => {
    if (!latestResults) {
      setToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }

    const previousRatioId =
      (archivedPlan?.pain_ratio_id as ExpertiseRatioId | null) ?? null;

    try {
      await resetPlan();
    } catch {
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
        userResults
      );
      const randomRatioId = pickRandomDemoRatio(measuredRatios, previousRatioId);
      if (!randomRatioId) {
        setToast({
          type: "info",
          message: "Aucun ratio mesuré disponible pour régénérer",
        });
        router.push("/conseiller/ameliorer");
        return;
      }
      await createPlan30j({
        mode: "targeted",
        ratioId: randomRatioId,
        measuredRatios,
        profile,
        avgCommissionEur,
        agentStatus: userCtx.agentStatus,
        teamSize: userCtx.teamSize,
      });
    } catch {
      setToast({ type: "error", message: "Erreur lors de la création du plan" });
      return;
    }

    router.push("/conseiller/ameliorer");
  };

  const handleClose = async () => {
    // En mode readonly (consultation depuis Ma Progression), on ne consomme PAS
    // le debrief — la nxt_coaching ne doit pas changer d'état.
    if (isReadonly) {
      router.push("/conseiller/progression");
      return;
    }
    if (nxtCoaching && nxtCoaching.status === "debrief_offered") {
      const now = new Date().toISOString();
      const currentPayload = (nxtCoaching.payload as Record<string, unknown>) ?? {};
      await updateResource(nxtCoaching.id, {
        status: "debrief_used",
        payload: {
          ...currentPayload,
          debrief_used_at: now,
        },
      });
    }
    router.push("/conseiller/ameliorer");
  };

  const handleRequestHumanCoach = async () => {
    if (!nxtCoaching) {
      setToast({ type: "error", message: "Ressource coaching introuvable" });
      return;
    }
    const now = new Date().toISOString();

    if (isDemoMode) {
      const currentPayload = (nxtCoaching.payload as Record<string, unknown>) ?? {};
      await updateResource(nxtCoaching.id, {
        status: "pending_human_coach",
        payload: {
          ...currentPayload,
          human_coach_requested_at: now,
        },
      });
      setToast({ type: "success", message: "Coach assigné, votre plan va être suivi" });
      router.push("/conseiller/ameliorer");
      return;
    }

    if (!sourcePlanId) {
      setToast({ type: "error", message: "Plan source introuvable" });
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setToast({
        type: "error",
        message: "Tu sembles hors ligne. Vérifie ta connexion.",
      });
      return;
    }

    try {
      const res = await fetch("/api/coaching/request-human-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: sourcePlanId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setToast({
          type: "error",
          message:
            body.message ??
            `Erreur ${res.status} : impossible d'enregistrer ta demande`,
        });
        return;
      }
      setToast({ type: "success", message: "Coach assigné, votre plan va être suivi" });
      router.push("/conseiller/ameliorer");
    } catch (err) {
      console.error("Erreur coaching request:", err);
      setToast({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Une erreur est survenue. Vérifie ta connexion et réessaie.",
      });
    }
  };

  // Loading
  if (loading || planLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Pas de ressource nxt_coaching → rien à debriefer.
  // En mode readonly avec un planId explicite, on bypass cette garde
  // (on consulte un plan archivé sans avoir besoin du contexte coaching).
  if (!nxtCoaching && !isReadonly) {
    return (
      <EmptyState
        title="Aucun debrief disponible"
        body="Terminez un plan 30 jours pour débloquer votre debrief."
      />
    );
  }

  // Pas de plan archivé trouvé
  if (!archivedPlan || !debrief) {
    return (
      <EmptyState
        title="Plan introuvable"
        body="Nous n'avons pas retrouvé le plan associé à ce debrief. Retournez au plan pour continuer."
      />
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={
            toast.type === "success"
              ? "mx-auto max-w-3xl rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700"
              : toast.type === "error"
              ? "mx-auto max-w-3xl rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700"
              : "mx-auto max-w-3xl rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700"
          }
        >
          {toast.message}
        </div>
      )}
      <PlanDebriefScreen
        debrief={debrief}
        onClose={handleClose}
        onRequestHumanCoach={handleRequestHumanCoach}
        readonly={isReadonly}
      />
      {isDemoMode && !isReadonly && (
        <div className="mx-auto flex max-w-3xl justify-center px-6 pb-6">
          <button
            type="button"
            onClick={handleResetPlanDemo}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Tester un nouveau plan
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
              Démo
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-muted-foreground">{body}</p>
      <div className="flex gap-3">
        <Link
          href="/conseiller/ameliorer"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Retour au plan
        </Link>
      </div>
    </div>
  );
}
