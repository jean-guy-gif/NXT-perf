"use client";

import { LineChart } from "lucide-react";

/**
 * Manager — Notre progression (PR3.8.1 stub).
 *
 * Le contenu sera implémenté en PR3.8.x : ROI cumulé équipe, plans 30j
 * archivés par conseiller, courbe CA équipe vs marché, DPI mensuel
 * collectif.
 */
export default function ManagerProgressionPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-12">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <LineChart className="h-3.5 w-3.5" />
        Notre progression
      </div>
      <h1 className="text-3xl font-bold text-foreground">Notre progression</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Page en construction. Vue Collectif (équipe) et Individuel (conseiller
        sélectionné) à venir.
      </p>
    </section>
  );
}
