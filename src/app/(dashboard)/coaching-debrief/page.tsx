"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { CoachingDebriefScreen } from "@/components/saisie/coaching-debrief";

export default function CoachingDebriefPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const allResults = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { getNxtCoachingResource, updateResource, loading } = useImprovementResources();

  const latestResults = useMemo(() => {
    if (!user) return null;
    const userResults = allResults.filter((r) => r.userId === user.id);
    if (userResults.length === 0) return null;
    return [...userResults].sort((a, b) =>
      b.periodStart.localeCompare(a.periodStart)
    )[0];
  }, [allResults, user]);

  const nxtCoaching = getNxtCoachingResource();

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

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!latestResults) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">Debrief IA indisponible</h2>
        <p className="max-w-md text-muted-foreground">
          Aucune donnée de période n&apos;a été trouvée. Saisissez d&apos;abord vos
          résultats hebdomadaires pour pouvoir générer un debrief IA.
        </p>
        <div className="flex gap-3">
          <Link
            href="/saisie"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Saisir mes résultats
          </Link>
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

  return (
    <CoachingDebriefScreen
      results={latestResults}
      category={user.category}
      ratioConfigs={ratioConfigs}
      onClose={handleClose}
    />
  );
}
