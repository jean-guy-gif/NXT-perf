"use client";

import { Suspense } from "react";
import { Wrench } from "lucide-react";
import { AmeliorerAdaptiveFlow } from "@/components/conseiller/ameliorer/ameliorer-adaptive-flow";

export default function ConseillerAmeliorerPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Wrench className="h-3.5 w-3.5" />
          M'améliorer
        </div>
        <h1 className="text-3xl font-bold text-foreground">M'améliorer</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choisissez un levier, lancez votre plan 30 jours, formez-vous et
          prenez RDV avec un coach.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        <Suspense
          fallback={
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Chargement…
            </div>
          }
        >
          <AmeliorerAdaptiveFlow />
        </Suspense>
      </div>
    </div>
  );
}
