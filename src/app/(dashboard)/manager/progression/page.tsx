"use client";

import { LineChart } from "lucide-react";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { useManagerView } from "@/hooks/use-manager-view";

/**
 * Manager — Notre progression (PR3.8.2 socle).
 *
 * Toggle Collectif / Individuel + sélecteur conseiller. Le contenu
 * (ROI cumulé équipe, plans 30j archivés, courbe CA équipe vs marché,
 * DPI mensuel collectif) sera livré en PR3.8.x.
 */
export default function ManagerProgressionPage() {
  const { isIndividual, selectedAdvisor } = useManagerView();

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
            : "Progression collective de l'équipe — ROI cumulé, plans 30j archivés et courbe CA vs marché."}
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
        ROI cumulé équipe, plans 30j archivés par conseiller, courbe CA
        équipe vs marché et DPI mensuel collectif arriveront dans une
        prochaine PR3.8.x.
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
          ? `La vue individuelle de ${advisorName} affichera ici exactement la page "Ma progression" du Conseiller V3.`
          : "Sélectionnez un conseiller pour voir sa progression."}
      </p>
    </div>
  );
}
