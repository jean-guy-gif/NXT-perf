"use client";

import { useState } from "react";
import { Eye, Gauge, Users } from "lucide-react";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ManagerTeamPerformanceView } from "@/components/manager/performance/manager-team-performance-view";
import { ConseillerPerformanceView } from "@/components/manager/performance/conseiller-performance-view";

export default function ManagerPerformancePage() {
  const {
    conseiller,
    conseillerId,
    isIndividualScope,
    setScope,
  } = useManagerScope();
  const { conseillers } = useTeamResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const [viewMode, setViewMode] = useState<"chiffres" | "pourcentages">("chiffres");

  // Empty state Q4 — équipe vide en mode collectif (prod réel)
  if (!isIndividualScope && conseillers.length === 0 && !isDemo) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Votre équipe n&apos;a pas encore de conseillers
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Pour voir les ratios de transformation, ajoutez des conseillers à votre
            équipe.
          </p>
          <a
            href="/manager/equipe"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Inviter des conseillers
          </a>
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Gauge className="h-3.5 w-3.5" />
          Performance
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mes Ratios de Transformation
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Analysez les ratios de transformation de votre équipe ou d&apos;un
          conseiller spécifique. Cliquez sur un ratio pour voir le détail.
        </p>
      </header>

      {/* ═══ Bandeau "Vous regardez X" (mode individuel) ═══ */}
      {isIndividualScope && conseiller && (
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">
                Vous regardez :{" "}
                <strong>
                  {conseiller.firstName} {conseiller.lastName}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScope("team")}
              className="text-xs text-primary hover:underline"
            >
              Retour à la vue équipe
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
        {/* Toggle Chiffres / Pourcentages */}
        <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setViewMode("chiffres")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              viewMode === "chiffres"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chiffres
          </button>
          <button
            type="button"
            onClick={() => setViewMode("pourcentages")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              viewMode === "pourcentages"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pourcentages
          </button>
        </div>

        {/* Dispatch selon scope */}
        {isIndividualScope && !conseillerId ? (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un conseiller dans la barre en haut pour voir sa vue
              détaillée.
            </p>
          </div>
        ) : isIndividualScope && conseillerId ? (
          <ConseillerPerformanceView
            userId={conseillerId}
            viewMode={viewMode}
          />
        ) : (
          <ManagerTeamPerformanceView viewMode={viewMode} />
        )}
      </section>
    </div>
  );
}
