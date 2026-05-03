"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wrench, Sparkles, Users } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";
import { useTeamDiagnostic } from "@/hooks/team/use-team-diagnostic";
import { useAppStore } from "@/stores/app-store";
import { TeamActionPlan } from "@/components/manager/ameliorer/team-action-plan";
import { TeamActivationSteps } from "@/components/manager/ameliorer/team-activation-steps";
import { ConseillerProxy } from "@/components/manager/individual/conseiller-proxy";
import { NoAdvisorSelected } from "@/components/manager/individual/no-advisor-selected";
import { ManagerIndividualAmeliorerView } from "@/components/manager/ameliorer/manager-individual-ameliorer-view";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * Manager — Faire progresser mon équipe (PR3.8 follow-up).
 *
 * Mode Collectif :
 *   - "Plan d'action pour votre équipe" toujours visible.
 *   - "Tout est prêt pour animer votre équipe" déplié uniquement après
 *     clic "Lancer ce plan avec mon équipe" (gating teamPlanStarted,
 *     persisté en localStorage par levier).
 *
 * Mode Individuel :
 *   - On rend `ManagerIndividualAmeliorerView` (lecture seule du plan
 *     conseiller + bloc "Préparer mon coaching individuel"), pas
 *     `AmeliorerAdaptiveFlow` — le manager n'a pas à créer un plan à la
 *     place du conseiller.
 */
export default function ManagerAmeliorerPage() {
  const { isIndividual, selectedAdvisor, selectedAdvisorId } = useManagerView();

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
            ? `Accompagnement individuel de ${selectedAdvisor.firstName} ${selectedAdvisor.lastName}.`
            : "Plan d'action collectif sur le levier prioritaire de votre équipe."}
        </p>
      </header>

      <ManagerViewSwitcher />

      {isIndividual ? (
        selectedAdvisorId ? (
          <ConseillerProxy advisorId={selectedAdvisorId}>
            <ManagerIndividualAmeliorerView />
          </ConseillerProxy>
        ) : (
          <NoAdvisorSelected />
        )
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

  // PR3.8 follow-up — gating "supports d'animation" : seulement après
  // clic explicite "Lancer ce plan avec mon équipe". Persistance par levier
  // (localStorage manager-team-plan-started-{expertiseId}).
  const [teamPlanStarted, setTeamPlanStarted] = useState(false);

  useEffect(() => {
    if (!expertiseId) {
      setTeamPlanStarted(false);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(
        `manager-team-plan-started-${expertiseId}`,
      );
      setTeamPlanStarted(raw === "true");
    } catch {
      setTeamPlanStarted(false);
    }
  }, [expertiseId]);

  const handlePlanStarted = () => {
    setTeamPlanStarted(true);
    if (!expertiseId) return;
    try {
      localStorage.setItem(
        `manager-team-plan-started-${expertiseId}`,
        "true",
      );
    } catch {
      // localStorage indisponible — on garde l'état en mémoire.
    }
  };

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
      <TeamActionPlan
        expertiseId={expertiseId}
        leverLabel={leverLabel}
        max={3}
        onPlanStarted={handlePlanStarted}
      />

      {teamPlanStarted ? (
        <TeamActivationSteps expertiseId={expertiseId} />
      ) : (
        <ActivationTeaser />
      )}
    </div>
  );
}

/**
 * Teaser court de "Comment l'activer concrètement" tant que le manager n'a
 * pas cliqué "Lancer ce plan". Le bloc complet (3 cartes lanceur Gamma /
 * slides / NXT Training) ne s'affiche qu'après l'engagement.
 */
function ActivationTeaser() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Comment l&apos;activer concrètement
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Réunion d&apos;équipe → Mise en pratique → 4 points hebdo. Cliquez
        sur <span className="font-semibold text-foreground">« Lancer ce
        plan avec mon équipe »</span> ci-dessus pour récupérer les supports
        prêts à utiliser.
      </p>
    </div>
  );
}
