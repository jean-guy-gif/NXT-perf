"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { useUser } from "@/hooks/use-user";
import { WeeklyGateWrapper } from "@/components/dashboard/weekly-gate-wrapper";
import { DiagnosticVerdictView } from "@/components/conseiller/diagnostic/diagnostic-verdict-view";
import { DiagnosticRatiosView } from "@/components/conseiller/diagnostic/diagnostic-ratios-view";
import { DiagnosticVolumesView } from "@/components/conseiller/diagnostic/diagnostic-volumes-view";

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticRouter />
    </Suspense>
  );
}

function DiagnosticRouter() {
  const { user } = useUser();
  const params = useSearchParams();
  const view = params.get("view");
  const highlight = params.get("highlight");
  const {
    showGate,
    context: gateContext,
    isLoading: gateLoading,
    dismissGate,
    markSaisieDone,
  } = useWeeklyGate();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!gateLoading && showGate) {
    return (
      <WeeklyGateWrapper
        context={gateContext}
        onDismiss={dismissGate}
        onSaisieDone={markSaisieDone}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Search className="h-3.5 w-3.5" />
          Mon diagnostic
        </div>
        <h1 className="text-3xl font-bold text-foreground">Mon diagnostic</h1>
        {view === "ratios" && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Détail de vos ratios métier.
          </p>
        )}
        {view === "volumes" && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Détail de vos volumes du mois.
          </p>
        )}
        {!view && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Le point critique du mois — chiffré en € de gain potentiel.
          </p>
        )}
      </header>

      {view === "ratios" ? (
        <DiagnosticRatiosView highlightedItem={highlight} />
      ) : view === "volumes" ? (
        <DiagnosticVolumesView highlightedItem={highlight} />
      ) : (
        <DiagnosticVerdictView />
      )}
    </div>
  );
}
