"use client";

import { Target } from "lucide-react";
import { DPITeamView } from "@/components/dpi/dpi-team-view";

export function ManagerTeamDPIView() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Target className="h-3.5 w-3.5" />
        Diagnostic
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">
        DPI de votre équipe
      </h2>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Diagnostic de Performance Immobilière agrégé sur l&apos;ensemble de vos
        conseillers.
      </p>
      <DPITeamView />
    </section>
  );
}
