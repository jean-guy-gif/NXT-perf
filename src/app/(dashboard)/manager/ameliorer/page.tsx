"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Wrench, Sparkles, Users } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";
import { useTeamDiagnostic } from "@/hooks/team/use-team-diagnostic";
import { useAppStore } from "@/stores/app-store";
import { TeamActionPlan } from "@/components/manager/ameliorer/team-action-plan";
import { TeamActivationSteps } from "@/components/manager/ameliorer/team-activation-steps";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * Manager — Faire progresser mon équipe (PR3.8.4).
 *
 * Mode Collectif : plan d'action équipe sur le levier prioritaire (query
 * param `?levier=` ou fallback `useTeamDiagnostic().top`).
 * Mode Individuel : stub PR3.8.2 inchangé.
 */
export default function ManagerAmeliorerPage() {
  const { isIndividual, selectedAdvisor } = useManagerView();

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Wrench className="h-3.5 w-3.5" />
          Faire progresser mon équipe
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Faire progresser mon équipe
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isIndividual && selectedAdvisor
            ? `Actions ciblées pour faire progresser ${selectedAdvisor.firstName} ${selectedAdvisor.lastName}.`
            : "Plan d'action collectif sur le levier prioritaire de votre équipe."}
        </p>
      </header>

      <ManagerViewSwitcher />

      {isIndividual ? (
        <IndividualStub advisorName={selectedAdvisor?.firstName ?? null} />
      ) : (
        <Suspense fallback={null}>
          <CollectiveAmeliorer />
        </Suspense>
      )}
    </section>
  );
}

function CollectiveAmeliorer() {
  const isDemo = useAppStore((s) => s.isDemo);
  const searchParams = useSearchParams();
  const { top, totalAdvisors } = useTeamDiagnostic();

  const expertiseId = useMemo<ExpertiseRatioId | null>(() => {
    const raw = searchParams.get("levier");
    if (raw && raw in RATIO_EXPERTISE) return raw as ExpertiseRatioId;
    return top?.expertiseId ?? null;
  }, [searchParams, top]);

  const leverLabel = expertiseId
    ? RATIO_EXPERTISE[expertiseId]?.label ?? null
    : null;

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
          Partagez votre code équipe pour inviter vos conseillers. Le plan
          d&apos;action apparaîtra dès qu&apos;ils auront saisi leurs résultats.
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

  // Tout va bien — pas de levier prioritaire détecté
  if (!expertiseId || !leverLabel) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
          <Sparkles className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Aucun levier prioritaire à activer
          </h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Votre équipe est au-dessus des seuils ce mois-ci. Continuez le
          pilotage régulier — un nouveau levier sera proposé dès qu&apos;un
          écart significatif apparaîtra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TeamActionPlan expertiseId={expertiseId} leverLabel={leverLabel} max={3} />
      <TeamActivationSteps />
    </div>
  );
}

function IndividualStub({ advisorName }: { advisorName: string | null }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8">
      <h2 className="text-lg font-semibold text-foreground">
        Vue conseiller en construction
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {advisorName
          ? `La vue individuelle de ${advisorName} reproduira l'écran "M'améliorer" du Conseiller V3, augmenté des actions Manager (1:1, assignation de modules).`
          : "Sélectionnez un conseiller pour voir ses leviers d'amélioration."}
      </p>
    </div>
  );
}
