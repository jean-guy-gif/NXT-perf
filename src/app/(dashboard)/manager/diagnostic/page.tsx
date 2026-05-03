"use client";

import { Search } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";

/**
 * Manager — Mon diagnostic (PR3.8.2 socle).
 *
 * Le contenu Collectif et Individuel sera implémenté en PR3.8.x. Ici on
 * pose uniquement le toggle + le sélecteur conseiller via
 * <ManagerViewSwitcher /> et un placeholder par mode.
 */
export default function ManagerDiagnosticPage() {
  const { isIndividual, selectedAdvisor } = useManagerView();

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
            : "Diagnostic collectif de votre équipe — verdict global, indicateurs clés et focus du mois."}
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
        La vue Collectif du diagnostic Manager est en cours de refonte. Elle
        sera livrée dans une prochaine PR3.8.x.
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
          ? `La vue individuelle de ${advisorName} affichera ici exactement le diagnostic Conseiller V3, avec ses leviers et son plan d'action.`
          : "Sélectionnez un conseiller pour voir son diagnostic individuel."}
      </p>
    </div>
  );
}
