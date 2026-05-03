"use client";

import { UserCog } from "lucide-react";

/**
 * État "aucun conseiller sélectionné" (PR3.8.5).
 *
 * En pratique `useManagerView` auto-sélectionne le 1er conseiller dès qu'on
 * passe en mode Individuel. Ce composant ne se déclenche que si l'équipe est
 * vide (cas géré aussi côté empty state des pages Collectif).
 */
export function NoAdvisorSelected() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <UserCog className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Veuillez sélectionner un conseiller
      </h2>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        Choisissez un conseiller dans le sélecteur en haut de la page pour
        afficher sa vue individuelle.
      </p>
    </div>
  );
}
