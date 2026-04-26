"use client";

import { Target, Hourglass } from "lucide-react";

interface ConseillerDPIViewProps {
  userId: string;
}

export function ConseillerDPIView({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId,
}: ConseillerDPIViewProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Target className="h-3.5 w-3.5" />
        Diagnostic
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">
        DPI individuel
      </h2>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          <Hourglass className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          DPI individuel — bientôt disponible
        </h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Utilisez la vue Collectif équipe pour voir le DPI agrégé de votre équipe.
        </p>
      </div>
    </section>
  );
}
