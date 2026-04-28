"use client";

import { useSearchParams } from "next/navigation";

/**
 * Scope d'affichage pour les pages Directeur.
 *
 * - "agence"     : agrégation sur tous les conseillers de l'agence (par défaut)
 * - "equipe"     : focus sur une équipe spécifique (scopeId = teamId)
 * - "conseiller" : focus sur un conseiller spécifique (scopeId = userId)
 *
 * PR2a : ce hook se contente de lire l'URL — il NE filtre PAS encore les données.
 * Le wiring data multi-scope est planifié en PR2c.
 */
export type ScopeType = "agence" | "equipe" | "conseiller";

export interface DirecteurScope {
  scope: ScopeType;
  /** ID de l'équipe (scope=equipe) ou du conseiller (scope=conseiller). null pour scope=agence. */
  scopeId: string | null;
}

/**
 * Lit le scope Directeur depuis l'URL (`?scope=...&id=...`).
 * Défaut : `{ scope: "agence", scopeId: null }`.
 */
export function useDirecteurScope(): DirecteurScope {
  const searchParams = useSearchParams();
  const rawScope = searchParams.get("scope");
  const scope: ScopeType =
    rawScope === "equipe" || rawScope === "conseiller" ? rawScope : "agence";
  return {
    scope,
    scopeId: searchParams.get("id"),
  };
}
