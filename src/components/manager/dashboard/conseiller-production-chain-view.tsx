"use client";

import { Link2 } from "lucide-react";
import { ProductionChain } from "@/components/dashboard/production-chain";

interface ConseillerProductionChainViewProps {
  userId: string;
}

export function ConseillerProductionChainView({
  userId,
}: ConseillerProductionChainViewProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Link2 className="h-3.5 w-3.5" />
        Chaîne de production
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">
        Flux de production
      </h2>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Visualisez chaque étape du tunnel commercial du contact au compromis.
      </p>
      <ProductionChain scope="individual" userId={userId} />
    </section>
  );
}
