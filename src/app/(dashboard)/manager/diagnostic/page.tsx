"use client";

import { Search, Users } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";
import { useTeamDiagnostic } from "@/hooks/team/use-team-diagnostic";
import { useAppStore } from "@/stores/app-store";
import { TeamDiagnosticSummary } from "@/components/manager/diagnostic/team-diagnostic-summary";
import { TeamPainBreakdown } from "@/components/manager/diagnostic/team-pain-breakdown";
import { BestPracticesBlock } from "@/components/manager/diagnostic/best-practices-block";
import { TeamProductionTracker } from "@/components/manager/diagnostic/team-production-tracker";
import { ConseillerProxy } from "@/components/manager/individual/conseiller-proxy";
import { NoAdvisorSelected } from "@/components/manager/individual/no-advisor-selected";
import { DiagnosticVerdictView } from "@/components/conseiller/diagnostic/diagnostic-verdict-view";

/**
 * Manager — Mon diagnostic (PR3.8.5).
 *
 * Mode Collectif  : diagnostic équipe (PR3.8.3 — top levier + breakdown +
 *                   best practices).
 * Mode Individuel : vue Conseiller V3 réutilisée via ConseillerProxy
 *                   (override de l'utilisateur courant).
 */
export default function ManagerDiagnosticPage() {
  const { isIndividual, selectedAdvisor, selectedAdvisorId } = useManagerView();

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Search className="h-3.5 w-3.5" />
          Mon diagnostic
        </div>
        <h1 className="text-3xl font-bold text-foreground">Mon diagnostic</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isIndividual && selectedAdvisor
            ? `Diagnostic individuel de ${selectedAdvisor.firstName} ${selectedAdvisor.lastName}.`
            : "Identifiez en un coup d'œil le levier qui fait perdre le plus de performance à votre équipe."}
        </p>
      </header>

      <ManagerViewSwitcher />

      {isIndividual ? (
        selectedAdvisorId ? (
          <ConseillerProxy advisorId={selectedAdvisorId}>
            <DiagnosticVerdictView />
          </ConseillerProxy>
        ) : (
          <NoAdvisorSelected />
        )
      ) : (
        <CollectiveDiagnostic />
      )}
    </section>
  );
}

function CollectiveDiagnostic() {
  const isDemo = useAppStore((s) => s.isDemo);
  const {
    top,
    secondaries,
    allLevers,
    totalAdvisors,
    teamAveragesByExpertise,
  } = useTeamDiagnostic();

  // Empty state — équipe vide en prod réel
  if (totalAdvisors === 0 && !isDemo) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          Votre équipe est vide pour l&apos;instant
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          Partagez votre code équipe pour inviter vos conseillers. Le
          diagnostic apparaîtra dès qu&apos;ils auront saisi leurs résultats.
        </p>
        <a
          href="/parametres/equipe"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Gérer mon équipe
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamDiagnosticSummary
        top={top}
        secondaries={secondaries}
        totalAdvisors={totalAdvisors}
      />

      {/* PR3.8.6 — Production équipe avec proration "à date" pour ne pas
          comparer un volume de début de mois à l'objectif mensuel complet. */}
      <TeamProductionTracker />

      {allLevers.length > 0 && (
        <TeamPainBreakdown
          levers={allLevers}
          teamAverages={teamAveragesByExpertise}
          limit={3}
        />
      )}

      {top && (
        <BestPracticesBlock
          expertiseId={top.expertiseId}
          leverLabel={top.label}
          max={3}
        />
      )}
    </div>
  );
}
