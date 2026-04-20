"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import type { ImprovementResource } from "@/hooks/use-improvement-resources";
import { PlanDebriefScreen } from "@/components/coaching/plan-debrief-screen";
import { computePlanDebrief } from "@/lib/plan-debrief";
import { getAvgCommissionEur } from "@/lib/get-avg-commission";

export default function CoachingDebriefPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const allResults = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const isDemoMode = useAppStore((s) => s.isDemoMode);

  const {
    getNxtCoachingResource,
    getArchivedPlanById,
    updateResource,
    loading,
  } = useImprovementResources();

  const [archivedPlan, setArchivedPlan] = useState<ImprovementResource | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const nxtCoaching = getNxtCoachingResource();
  const sourcePlanId =
    (nxtCoaching?.payload as { source_plan_id?: string } | null)?.source_plan_id ?? null;

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

  const handleClose = async () => {
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
    router.push("/formation?tab=plan30");
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
      router.push("/formation?tab=plan30");
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
      router.push("/formation?tab=plan30");
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

  // Pas de ressource nxt_coaching → rien à debriefer
  if (!nxtCoaching) {
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
      />
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
          href="/formation?tab=plan30"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Retour au plan
        </Link>
      </div>
    </div>
  );
}
