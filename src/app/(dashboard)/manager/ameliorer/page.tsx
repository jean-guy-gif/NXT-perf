"use client";

import { Wrench } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";

/**
 * Manager — Faire progresser mon équipe (PR3.8.2 socle).
 *
 * Toggle Collectif / Individuel + sélecteur conseiller posés via
 * <ManagerViewSwitcher />. Le contenu actionnable (1:1, assignation de
 * modules, plan 30 jours par conseiller) sera livré en PR3.8.x.
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
            : "Plan d'action collectif et leviers prioritaires pour faire progresser l'équipe."}
        </p>
      </header>

      <ManagerViewSwitcher />

      {isIndividual ? (
        <IndividualStub advisorName={selectedAdvisor?.firstName ?? null} />
      ) : (
        <CollectiveStub />
      )}
    </section>
  );
}

function CollectiveStub() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8">
      <h2 className="text-lg font-semibold text-foreground">
        Vue collective en construction
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Les leviers d&apos;équipe et les actions Manager (programmer un 1:1,
        assigner un module) seront livrés dans une prochaine PR3.8.x.
      </p>
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
