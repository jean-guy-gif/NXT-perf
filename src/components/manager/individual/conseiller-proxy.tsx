"use client";

import type { ReactNode } from "react";
import { AdvisorOverrideProvider } from "@/contexts/advisor-override-context";

interface ConseillerProxyProps {
  /** Conseiller dont on veut afficher la vue. Null = aucune sélection. */
  advisorId: string | null;
  children: ReactNode;
}

/**
 * Proxy "voir comme le conseiller" (PR3.8.5 — mode Manager → Individuel).
 *
 * Wrap simple autour des composants Conseiller : injecte un advisorId via
 * `<AdvisorOverrideProvider>` pour que les hooks "current user" (useUser,
 * useResults, useImprovementResources) renvoient les données du conseiller
 * sélectionné. Aucune modification dans `/conseiller/*` n'est nécessaire.
 *
 * Si `advisorId === null`, le contexte reste à null → comportement par
 * défaut (utilisateur courant). En pratique on ne devrait pas rendre ce
 * composant sans advisorId — la page parent affiche un état "veuillez
 * sélectionner un conseiller" à la place.
 */
export function ConseillerProxy({ advisorId, children }: ConseillerProxyProps) {
  return (
    <AdvisorOverrideProvider advisorId={advisorId}>
      {children}
    </AdvisorOverrideProvider>
  );
}
