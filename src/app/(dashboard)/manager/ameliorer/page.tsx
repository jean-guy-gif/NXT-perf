"use client";

import { Wrench } from "lucide-react";

/**
 * Manager — Faire progresser mon équipe (PR3.8.1 stub).
 *
 * Le contenu sera implémenté en PR3.8.x : actions Manager spécifiques
 * (1:1, assigner un module) en plus de la vue Conseiller en mode Individuel.
 */
export default function ManagerAmeliorerPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-12">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Wrench className="h-3.5 w-3.5" />
        Faire progresser mon équipe
      </div>
      <h1 className="text-3xl font-bold text-foreground">
        Faire progresser mon équipe
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Page en construction. Toggle Collectif / Individuel + actions Manager
        (programmer un 1:1, assigner un module) à venir.
      </p>
    </section>
  );
}
