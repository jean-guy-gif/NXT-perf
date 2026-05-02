"use client";

import { ProductionChain } from "@/components/dashboard/production-chain";
import type { PeriodResults } from "@/types/results";

interface Props {
  userId: string;
  results: PeriodResults | null;
  /** Échelle d'objectif (1 = mois, 12 = année…) */
  periodMonths: number;
  /** Mode de période transmis à ProductionChain */
  periodMode?: "mois" | "ytd" | "custom";
}

/**
 * ProductionFlow — wrapper Conseiller autour du `<ProductionChain>` partagé.
 *
 * Existe pour deux raisons :
 *   1. Isoler les call-sites Conseiller du composant partagé Manager/Directeur.
 *      Si la signature de `ProductionChain` évolue, on adapte ici sans
 *      toucher à la page Mon Diagnostic.
 *   2. Maintenir une option de header / titre côté Conseiller sans polluer
 *      le composant chain partagé.
 */
export function ProductionFlow({
  userId,
  results,
  periodMonths,
  periodMode = "mois",
}: Props) {
  return (
    <ProductionChain
      scope="individual"
      userId={userId}
      resultsOverride={results}
      periodMonths={Math.max(1, Math.round(periodMonths))}
      periodMode={periodMode}
    />
  );
}
