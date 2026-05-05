"use client";

import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { useTeamGPS } from "@/hooks/use-team-gps";
import type { ProfileLevel } from "@/data/ratio-expertise";
import {
  bucketTeamSize,
  type TeamSizeBucket,
} from "@/lib/diagnostic/resolve-threshold";
import type { AgentStatus } from "@/types/user";

// Re-export pour compat des call-sites qui importaient AgentStatus depuis ce hook.
export type { AgentStatus } from "@/types/user";

const FALLBACK_AVG_COMMISSION_EUR = 8000;

export interface UserContext {
  /** Niveau d'ancienneté — issu de `profiles.category`. */
  seniority: ProfileLevel;
  /** Statut juridique — `null` si jamais saisi (compat profils existants). */
  agentStatus: AgentStatus | null;
  /** Taille équipe — dérivée live (`teamConseillers.length`), ≥ 1. */
  teamSize: number;
  /**
   * Bucket taille équipe (chantier A.3) — dérivé via `bucketTeamSize`.
   * Sert directement à `resolveThreshold` côté pain-point-detector.
   */
  teamSizeBucket: TeamSizeBucket;
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
  // Chantier A.3 — `useUser()` est override-aware (chantier C). Sous
  // `<AdvisorOverrideProvider>` (mode Manager → zoom Conseiller), retourne
  // le User du conseiller observé, donc `user.agentStatus` est désormais
  // celui du conseiller observé. La limitation V1 d'A.2 est levée.
  const { user, category } = useUser();
  const profile = useAppStore((s) => s.profile);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { memberCount } = useTeamGPS();

  const seniority: ProfileLevel =
    category === "debutant"
      ? "junior"
      : category === "expert"
        ? "expert"
        : "confirme";

  // Priorité : User.agentStatus (propagé via mapper, override-aware)
  // > profile.agent_status (DbProfile current — fallback si users[] pas
  // encore chargé en prod, ou pour le user courant solo).
  const agentStatus: AgentStatus | null =
    user?.agentStatus ?? profile?.agent_status ?? null;

  const avgCommissionEur =
    agencyObjective?.avgActValue && agencyObjective.avgActValue > 0
      ? agencyObjective.avgActValue
      : FALLBACK_AVG_COMMISSION_EUR;

  const teamSize = Math.max(1, memberCount ?? 1);

  return {
    seniority,
    agentStatus,
    teamSize,
    teamSizeBucket: bucketTeamSize(teamSize),
    avgCommissionEur,
    annualTargetCaEur:
      agencyObjective?.annualCA && agencyObjective.annualCA > 0
        ? agencyObjective.annualCA
        : null,
  };
}
