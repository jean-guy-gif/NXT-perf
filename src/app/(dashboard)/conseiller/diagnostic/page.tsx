"use client";

import { Search } from "lucide-react";

export default function ConseillerDiagnosticPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Search className="h-3.5 w-3.5" />
        Mon diagnostic
      </div>
      <h1 className="text-3xl font-bold text-foreground">Mon diagnostic</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Page en construction (commit 2/3 à venir).
      </p>
    </section>
  );
}
