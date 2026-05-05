"use client";

import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { useTeamGPS } from "@/hooks/use-team-gps";
import type { ProfileLevel } from "@/data/ratio-expertise";

/**
 * Statut juridique métier — chantier A.2.
 *
 * Source : `profiles.agent_status` (text + CHECK, migration 034 prod).
 * NULL = profil pré-A.2 qui n'a pas encore vu l'étape onboarding "Statut".
 */
export type AgentStatus = "salarie" | "agent_commercial" | "mandataire";

const FALLBACK_AVG_COMMISSION_EUR = 8000;

export interface UserContext {
  /** Niveau d'ancienneté — issu de `profiles.category`. */
  seniority: ProfileLevel;
  /** Statut juridique — `null` si jamais saisi (compat profils existants). */
  agentStatus: AgentStatus | null;
  /** Taille équipe — dérivée live (`teamConseillers.length`), ≥ 1. */
  teamSize: number;
  /**
   * Honoraires moyens par acte (€). Source : `agencyObjective.avgActValue`
   * Zustand, hydraté au login depuis `objectives.input.avg_commission_eur`.
   * Fallback `FALLBACK_AVG_COMMISSION_EUR` (8000€) si non saisi.
   */
  avgCommissionEur: number;
  /**
   * Objectif CA annuel (€). Source : `agencyObjective.annualCA`.
   * `null` si non saisi en onboarding GPS.
   */
  annualTargetCaEur: number | null;
}

/**
 * Hook unifié pour lire le contexte du conseiller courant (chantier A.2).
 *
 * Source de vérité unique pour les 4 axes contextuels — préparation A.3
 * (matrice thresholds 4 axes pour moduler le scoring du diagnostic).
 *
 * Override-aware (chantier C) : sous un `<AdvisorOverrideProvider>` côté
 * Manager → zoom Conseiller, `useUser()` retourne déjà le conseiller observé.
 * Idem pour `agencyObjective` (lu via Zustand global pour V1 — A.3 pourra
 * passer à un `objectives` per-user lecture si besoin).
 *
 * Note V1 : `agencyObjective` reste un singleton Zustand. En mode Manager
 * → individuel, le contexte commission/CA renvoyé est celui du conseiller
 * **connecté**, pas du conseiller observé. À traiter en A.3 si nécessaire
 * (lecture directe de `objectives` filtrée par `advisorId`).
 */
export function useUserContext(): UserContext {
  const { category } = useUser();
  // Note V1 : `agent_status` est lu depuis le `profile` (DbProfile) du user
  // courant en Zustand. Sous override (Manager → zoom Conseiller, chantier C),
  // ce sera donc le `agent_status` du manager, pas du conseiller observé.
  // Limitation acceptée pour A.2 (plumberie data, l'algo ne consomme pas
  // encore agentStatus — Q4 minimal). A.3 pourra étendre le store pour
  // mettre les profils observés à disposition (per-user DbProfile cache).
  const profile = useAppStore((s) => s.profile);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { memberCount } = useTeamGPS();

  const seniority: ProfileLevel =
    category === "debutant"
      ? "junior"
      : category === "expert"
        ? "expert"
        : "confirme";

  const agentStatus: AgentStatus | null = profile?.agent_status ?? null;

  const avgCommissionEur =
    agencyObjective?.avgActValue && agencyObjective.avgActValue > 0
      ? agencyObjective.avgActValue
      : FALLBACK_AVG_COMMISSION_EUR;

  return {
    seniority,
    agentStatus,
    teamSize: Math.max(1, memberCount ?? 1),
    avgCommissionEur,
    annualTargetCaEur:
      agencyObjective?.annualCA && agencyObjective.annualCA > 0
        ? agencyObjective.annualCA
        : null,
  };
}
