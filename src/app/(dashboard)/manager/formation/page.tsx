"use client";

import { Target, Eye, Users } from "lucide-react";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useAppStore } from "@/stores/app-store";
import { ManagerTeamFormationView } from "@/components/manager/formation/manager-team-formation-view";
import { ConseillerFormationView } from "@/components/manager/formation/conseiller-formation-view";

export default function ManagerFormationPage() {
  const { conseiller, isIndividualScope } = useManagerScope();
  const { conseillers } = useTeamResults();
  const isDemo = useAppStore((s) => s.isDemo);

  // Empty state — équipe vide en mode prod réel
  if (conseillers.length === 0 && !isDemo) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Votre équipe est vide pour l&apos;instant
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Partagez votre code équipe pour inviter vos conseillers. Vous verrez les
            axes de formation à travailler avec eux dès qu&apos;ils saisiront leurs
            résultats.
          </p>
          <a
            href="/parametres/equipe"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Gérer mon équipe
          </a>
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Target className="h-3.5 w-3.5" />
          Plan de formation
        </div>
        <h1 className="text-3xl font-bold text-foreground">Ma Formation</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {isIndividualScope && conseiller
            ? `Identifiez les axes faibles de ${conseiller.firstName}, suivez son entraînement et explorez les outils de formation.`
            : "Identifiez les axes faibles de votre équipe, lancez un plan d'équipe et suivez l'entraînement collectif."}
        </p>
      </header>

      {/* BANDEAU "Vous regardez X" — mode Indiv */}
      {isIndividualScope && conseiller && (
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground">
            <Eye className="h-4 w-4 text-primary" />
            <span>
              Vous regardez :{" "}
              <span className="font-semibold">
                {conseiller.firstName} {conseiller.lastName}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* DISPATCH */}
      {isIndividualScope ? (
        conseiller ? (
          <ConseillerFormationView conseiller={conseiller} />
        ) : (
          <section className="mx-auto max-w-3xl px-4 py-12">
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">
                Aucun conseiller sélectionné
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Sélectionnez un conseiller dans la barre en haut pour voir sa formation.
              </p>
            </div>
          </section>
        )
      ) : (
        <ManagerTeamFormationView />
      )}
    </div>
  );
}
