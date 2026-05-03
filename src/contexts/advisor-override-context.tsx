"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Advisor override context (PR3.8.5).
 *
 * Sert au mode Manager → Individuel : permet d'injecter un `advisorId` au
 * sommet de l'arbre Conseiller pour que tous les hooks "current user"
 * (useUser, useResults, useImprovementResources) renvoient les données du
 * conseiller sélectionné, sans avoir à muter le store global ni dupliquer
 * les composants Conseiller.
 *
 * Default value `{ advisorId: null }` → comportement inchangé pour tout
 * consommateur monté HORS d'un `<AdvisorOverrideProvider>`. Aucun composant
 * Conseiller n'a besoin d'être modifié.
 */

interface AdvisorOverrideValue {
  /** Si non-null, prend le pas sur `useAppStore.user.id`. */
  advisorId: string | null;
}

const AdvisorOverrideContext = createContext<AdvisorOverrideValue>({
  advisorId: null,
});

interface AdvisorOverrideProviderProps {
  advisorId: string | null;
  children: ReactNode;
}

export function AdvisorOverrideProvider({
  advisorId,
  children,
}: AdvisorOverrideProviderProps) {
  const value = useMemo(() => ({ advisorId }), [advisorId]);
  return (
    <AdvisorOverrideContext.Provider value={value}>
      {children}
    </AdvisorOverrideContext.Provider>
  );
}

export function useAdvisorOverride(): AdvisorOverrideValue {
  return useContext(AdvisorOverrideContext);
}
