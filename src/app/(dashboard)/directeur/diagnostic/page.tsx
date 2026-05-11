"use client";

import { Building2 } from "lucide-react";
import { useDirecteurDiagnostic } from "@/hooks/use-directeur-diagnostic";
import { TopLeverCard } from "@/components/directeur/diagnostic/top-lever-card";
import { OtherLeversList } from "@/components/directeur/diagnostic/other-levers-list";
import { DirectionProductionTracker } from "@/components/directeur/diagnostic/direction-production-tracker";
import { ManagersHeatmap } from "@/components/directeur/diagnostic/managers-heatmap";
import { TopPracticesDirection } from "@/components/directeur/diagnostic/top-practices-direction";

export default function DirecteurDiagnosticPage() {
  const diagnostic = useDirecteurDiagnostic();

  if (diagnostic.isEmpty) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            Aucune équipe rattachée à votre direction
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Contactez votre administrateur réseau pour rattacher des équipes à
            votre périmètre.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Mon diagnostic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {diagnostic.conseillerCount} conseiller
          {diagnostic.conseillerCount > 1 ? "s" : ""} ·{" "}
          {diagnostic.teamCount} équipe
          {diagnostic.teamCount > 1 ? "s" : ""}
        </p>
      </header>

      {diagnostic.topLever ? (
        <TopLeverCard pain={diagnostic.topLever} />
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Direction performante — aucun levier critique détecté.
          </p>
        </section>
      )}

      <OtherLeversList levers={diagnostic.otherLevers} />

      <DirectionProductionTracker production={diagnostic.production} />

      <ManagersHeatmap rows={diagnostic.heatmap} />

      {diagnostic.topLever && (
        <TopPracticesDirection pain={diagnostic.topLever} />
      )}
    </div>
  );
}
