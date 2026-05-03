"use client";

import { LineChart, Users } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";
import { useAppStore } from "@/stores/app-store";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { ConseillerProxy } from "@/components/manager/individual/conseiller-proxy";
import { NoAdvisorSelected } from "@/components/manager/individual/no-advisor-selected";
import ConseillerProgressionPage from "@/app/(dashboard)/conseiller/progression/page";
import { TeamProgressionSummary } from "@/components/manager/progression/team-progression-summary";
import { TeamProductionTrends } from "@/components/manager/progression/team-production-trends";
import { TeamAdvisorSnapshots } from "@/components/manager/progression/team-advisor-snapshots";

/**
 * Manager — Notre progression (PR3.8.6).
 *
 * Mode Collectif  : Synthèse équipe (CA) + Production équipe (4 catégories)
 *                   + Conseillers à suivre (clic → bascule individuel).
 * Mode Individuel : page Conseiller "Ma progression" rendue via
 *                   ConseillerProxy (PR3.8.5 — inchangé).
 */
export default function ManagerProgressionPage() {
  const { isIndividual, selectedAdvisor, selectedAdvisorId } = useManagerView();

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LineChart className="h-3.5 w-3.5" />
          Notre progression
        </div>
        <h1 className="text-3xl font-bold text-foreground">Notre progression</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isIndividual && selectedAdvisor
            ? `Progression de ${selectedAdvisor.firstName} ${selectedAdvisor.lastName} — ROI cumulé, plans archivés, DPI mensuel.`
            : "Où votre équipe avance, où elle décroche, qui suivre en priorité."}
        </p>
      </header>

      <ManagerViewSwitcher />

      {isIndividual ? (
        selectedAdvisorId ? (
          <ConseillerProxy advisorId={selectedAdvisorId}>
            <ConseillerProgressionPage />
          </ConseillerProxy>
        ) : (
          <NoAdvisorSelected />
        )
      ) : (
        <CollectiveProgression />
      )}
    </section>
  );
}

function CollectiveProgression() {
  const isDemo = useAppStore((s) => s.isDemo);
  const { conseillers } = useTeamResults();

  // Empty state — équipe vide en prod réel
  if (conseillers.length === 0 && !isDemo) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          Votre équipe est vide pour l&apos;instant
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
          Partagez votre code équipe pour inviter vos conseillers. La
          progression apparaîtra dès qu&apos;ils auront saisi leurs résultats.
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
      <TeamProgressionSummary />
      <TeamProductionTrends />
      <TeamAdvisorSnapshots />
    </div>
  );
}
