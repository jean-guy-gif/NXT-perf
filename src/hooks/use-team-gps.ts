"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { computeAllRatios } from "@/lib/ratios";
import type { PeriodResults } from "@/types/results";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";

/**
 * Aggregates raw results from all team conseillers into a single PeriodResults.
 * Used for team-level GPS to compute "niveau actuel" ratios.
 */
function aggregateTeamResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;

  const allMandats = results.flatMap((r) => r?.vendeurs?.mandats ?? []);

  return {
    id: "team-aggregate",
    userId: "team",
    periodType: "month",
    periodStart: results[0].periodStart,
    periodEnd: results[0].periodEnd,
    prospection: {
      contactsTotaux: results.reduce((s, r) => s + (r?.prospection?.contactsTotaux ?? 0), 0),
      rdvEstimation: results.reduce((s, r) => s + (r?.prospection?.rdvEstimation ?? 0), 0),
    },
    vendeurs: {
      rdvEstimation: results.reduce((s, r) => s + (r?.vendeurs?.rdvEstimation ?? 0), 0),
      estimationsRealisees: results.reduce((s, r) => s + (r?.vendeurs?.estimationsRealisees ?? 0), 0),
      mandatsSignes: results.reduce((s, r) => s + (r?.vendeurs?.mandatsSignes ?? 0), 0),
      mandats: allMandats,
      rdvSuivi: results.reduce((s, r) => s + (r?.vendeurs?.rdvSuivi ?? 0), 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + (r?.vendeurs?.requalificationSimpleExclusif ?? 0), 0),
      baissePrix: results.reduce((s, r) => s + (r?.vendeurs?.baissePrix ?? 0), 0),
    },
    acheteurs: {
      acheteursSortisVisite: results.reduce((s, r) => s + (r?.acheteurs?.acheteursSortisVisite ?? 0), 0),
      nombreVisites: results.reduce((s, r) => s + (r?.acheteurs?.nombreVisites ?? 0), 0),
      offresRecues: results.reduce((s, r) => s + (r?.acheteurs?.offresRecues ?? 0), 0),
      compromisSignes: results.reduce((s, r) => s + (r?.acheteurs?.compromisSignes ?? 0), 0),
      chiffreAffairesCompromis: results.reduce((s, r) => s + (r?.acheteurs?.chiffreAffairesCompromis ?? 0), 0),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + (r?.ventes?.actesSignes ?? 0), 0),
      chiffreAffaires: results.reduce((s, r) => s + (r?.ventes?.chiffreAffaires ?? 0), 0),
    },
    createdAt: results[0].createdAt,
    updatedAt: results[0].updatedAt,
  };
}

/**
 * Determine the dominant category of the team (most frequent among conseillers).
 */
function getDominantCategory(categories: UserCategory[]): UserCategory {
  const counts: Record<UserCategory, number> = { debutant: 0, confirme: 0, expert: 0 };
  categories.forEach((c) => counts[c]++);
  if (counts.expert >= counts.confirme && counts.expert >= counts.debutant) return "expert";
  if (counts.confirme >= counts.debutant) return "confirme";
  return "debutant";
}

export function useTeamGPS() {
  const user = useAppStore((s) => s.user);
  const allUsers = useAppStore((s) => s.users);
  const allResults = useAppStore((s) => s.results);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  // Team conseillers (not the manager themselves)
  const teamConseillers = useMemo(() => {
    if (!user) return [];
    return allUsers.filter(
      (u) => u.teamId === user.teamId && u.id !== user.id && u.mainRole === "conseiller"
    );
  }, [user, allUsers]);

  // Their results
  const teamResults = useMemo(() => {
    const ids = new Set(teamConseillers.map((u) => u.id));
    return allResults.filter((r) => ids.has(r.userId));
  }, [teamConseillers, allResults]);

  // Aggregated results
  const aggregatedResults = useMemo(() => aggregateTeamResults(teamResults), [teamResults]);

  // Dominant category
  const dominantCategory = useMemo(
    () => getDominantCategory(teamConseillers.map((u) => u.category)),
    [teamConseillers]
  );

  // Team-level ratios (using aggregated raw data)
  const teamRatios = useMemo((): ComputedRatio[] => {
    if (!aggregatedResults) return [];
    // Use "confirme" as baseline — the actual category doesn't matter for computing raw values
    return computeAllRatios(aggregatedResults, "confirme", ratioConfigs);
  }, [aggregatedResults, ratioConfigs]);

  // Team CA
  const teamCA = useMemo(
    () => teamResults.reduce((s, r) => s + (r?.ventes?.chiffreAffaires ?? 0), 0),
    [teamResults]
  );

  return {
    teamConseillers,
    teamResults,
    aggregatedResults,
    dominantCategory,
    teamRatios,
    teamCA,
    ratioConfigs,
    memberCount: teamConseillers.length,
  };
}
