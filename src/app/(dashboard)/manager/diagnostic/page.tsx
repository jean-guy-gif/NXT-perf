"use client";

import { Search } from "lucide-react";

/**
 * Manager — Mon diagnostic (PR3.8.1 stub).
 *
 * Page d'atterrissage Manager. Le contenu sera implémenté en PR3.8.2 :
 * toggle Collectif / Individuel, sélecteur conseiller partagé, et bascule
 * sur l'UI Conseiller exact côté Individuel.
 *
 * En attendant : message de placeholder pour ne pas casser la nav.
 */
export default function ManagerDiagnosticPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-12">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Search className="h-3.5 w-3.5" />
        Mon diagnostic
      </div>
      <h1 className="text-3xl font-bold text-foreground">Mon diagnostic</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Page en construction. La refonte Manager s'aligne sur le parcours
        Conseiller V3 — toggle Collectif / Individuel à venir en PR3.8.2.
      </p>
    </section>
  );
}
