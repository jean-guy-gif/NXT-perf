"use client";

import { useSearchParams } from "next/navigation";

/**
 * Scope d'affichage pour les pages Directeur.
 *
 * - "agence"     : agrégation sur tous les conseillers de l'agence (par défaut)
 * - "equipe"     : focus sur une équipe spécifique (scopeId = teamId)
 * - "conseiller" : focus sur un conseiller spécifique (scopeId = userId)
 */
export type ScopeType = "agence" | "equipe" | "conseiller";

export interface DirecteurScope {
  scope: ScopeType;
  /** ID de l'équipe (scope=equipe) ou du conseiller (scope=conseiller). null pour scope=agence. */
  scopeId: string | null;
  /**
   * Contexte équipe persistant.
   * - scope=agence     → null
   * - scope=equipe     → identique à scopeId
   * - scope=conseiller → lit `?team=xxx` (peut être null si conseiller hors contexte équipe)
   *
   * Permet de drill-down depuis une équipe vers un conseiller sans perdre la
   * référence à l'équipe parente (utilisé pour préserver la sélection du
   * dropdown équipe et afficher le contexte dans le titre).
   */
  teamContext: string | null;
}

/**
 * Lit le scope Directeur depuis l'URL (`?scope=...&id=...&team=...`).
 * Défaut : `{ scope: "agence", scopeId: null, teamContext: null }`.
 */
export function useDirecteurScope(): DirecteurScope {
  const searchParams = useSearchParams();
  const rawScope = searchParams.get("scope");
  const scope: ScopeType =
    rawScope === "equipe" || rawScope === "conseiller" ? rawScope : "agence";
  const scopeId = searchParams.get("id");

  let teamContext: string | null = null;
  if (scope === "equipe") teamContext = scopeId;
  else if (scope === "conseiller") teamContext = searchParams.get("team");

  return { scope, scopeId, teamContext };
}
