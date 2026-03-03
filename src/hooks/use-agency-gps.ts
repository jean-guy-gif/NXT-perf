"use client";

import { useMemo, useState } from "react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore, type DirectorCosts } from "@/stores/app-store";
import { CATEGORY_OBJECTIVES, type GPSTheme } from "@/lib/constants";
import { computeAllRatios } from "@/lib/ratios";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

// ── Types ──

export type PerformanceStatus = "ok" | "warning" | "danger";

export interface EntityBar {
  id: string;
  name: string;
  niveau: "agence" | "manager" | "conseiller";
  realise: number;
  objectif: number;
  pct: number;
  status: PerformanceStatus;
  teamId?: string;
}

export interface ProjectionEntry {
  id: string;
  name: string;
  niveau: "agence" | "equipe" | "conseiller";
  performance: number;
  status: PerformanceStatus;
  teamId?: string;
  teamName?: string;
}

export interface RentabiliteData {
  revenuDirecteurVentes: number;
  revenuDirecteurEquipes: number;
  resultatAgenceMois: number;
  projectionRevenuAnnuel: number;
}

export interface AgencyGPSResult {
  objectif: number;
  realise: number;
  ecart: number;
  avancement: number;
  projection: number;
}

export interface TeamDetail {
  teamId: string;
  teamName: string;
  realise: number;
  objectif: number;
  ecart: number;
  pct: number;
  status: PerformanceStatus;
}

// ── Helpers ──

function getStatus(pct: number): PerformanceStatus {
  if (pct >= 100) return "ok";
  if (pct >= 80) return "warning";
  return "danger";
}

function getObjectifForTheme(category: string, theme: GPSTheme): number {
  const obj = CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  switch (theme) {
    case "estimations": return obj.estimations;
    case "mandats": return obj.mandats;
    case "exclusivite": return obj.exclusivite;
    case "visites": return obj.visites;
    case "offres": return obj.offres;
    case "compromis": return obj.compromis;
    case "actes": return obj.actes;
    case "ca_compromis": return obj.ca;
    case "ca_acte": return obj.ca;
  }
}

function getRealiseForTheme(results: PeriodResults | undefined, theme: GPSTheme): number {
  if (!results) return 0;
  switch (theme) {
    case "estimations": return results.vendeurs.estimationsRealisees;
    case "mandats": return results.vendeurs.mandats.length;
    case "exclusivite": {
      const total = results.vendeurs.mandats.length;
      if (total === 0) return 0;
      return Math.round((results.vendeurs.mandats.filter(m => m.type === "exclusif").length / total) * 100);
    }
    case "visites": return results.acheteurs.nombreVisites;
    case "offres": return results.acheteurs.offresRecues;
    case "compromis": return results.acheteurs.compromisSignes;
    case "actes": return results.ventes.actesSignes;
    case "ca_compromis": {
      const avgAct = results.ventes.actesSignes > 0
        ? results.ventes.chiffreAffaires / results.ventes.actesSignes
        : 8000;
      return results.acheteurs.compromisSignes * avgAct;
    }
    case "ca_acte": return results.ventes.chiffreAffaires;
  }
}

function sumRealise(conseillers: User[], allResults: PeriodResults[], theme: GPSTheme): number {
  return conseillers.reduce((sum, c) => {
    const res = allResults.find(r => r.userId === c.id);
    return sum + getRealiseForTheme(res, theme);
  }, 0);
}

function sumObjectif(conseillers: User[], theme: GPSTheme): number {
  if (theme === "exclusivite") {
    if (conseillers.length === 0) return 0;
    const total = conseillers.reduce((s, c) => s + getObjectifForTheme(c.category, theme), 0);
    return Math.round(total / conseillers.length);
  }
  return conseillers.reduce((s, c) => s + getObjectifForTheme(c.category, theme), 0);
}

function avgRealiseExclu(conseillers: User[], allResults: PeriodResults[]): number {
  if (conseillers.length === 0) return 0;
  const total = conseillers.reduce((s, c) => {
    const res = allResults.find(r => r.userId === c.id);
    return s + getRealiseForTheme(res, "exclusivite");
  }, 0);
  return Math.round(total / conseillers.length);
}

// ── Hook ──

export function useAgencyGPS() {
  const { teams, allConseillers, allResults, ratioConfigs, orgStats } = useDirectorData();
  const agencyObjective = useAppStore(s => s.agencyObjective);
  const directorCosts = useAppStore(s => s.directorCosts);
  const user = useAppStore(s => s.user);

  const [theme, setTheme] = useState<GPSTheme>("mandats");

  const agencyGPS = useMemo<AgencyGPSResult>(() => {
    const isExclu = theme === "exclusivite";
    const realise = isExclu
      ? avgRealiseExclu(allConseillers, allResults)
      : sumRealise(allConseillers, allResults, theme);
    const objectif = sumObjectif(allConseillers, theme);
    const ecart = realise - objectif;
    const avancement = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
    const projection = realise * 12;
    return { objectif, realise, ecart, avancement, projection };
  }, [theme, allConseillers, allResults]);

  const teamDetails = useMemo<TeamDetail[]>(() => {
    return teams.map(t => {
      const isExclu = theme === "exclusivite";
      const realise = isExclu
        ? avgRealiseExclu(t.agents, allResults)
        : sumRealise(t.agents, allResults, theme);
      const objectif = sumObjectif(t.agents, theme);
      const ecart = realise - objectif;
      const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
      return { teamId: t.teamId, teamName: t.teamName, realise, objectif, ecart, pct, status: getStatus(pct) };
    });
  }, [theme, teams, allResults]);

  const entityBars = useMemo<EntityBar[]>(() => {
    const bars: EntityBar[] = [];
    const isExclu = theme === "exclusivite";

    const agRealise = isExclu
      ? avgRealiseExclu(allConseillers, allResults)
      : sumRealise(allConseillers, allResults, theme);
    const agObjectif = sumObjectif(allConseillers, theme);
    const agPct = agObjectif > 0 ? Math.round((agRealise / agObjectif) * 100) : 0;
    bars.push({ id: "agence", name: "Agence", niveau: "agence", realise: agRealise, objectif: agObjectif, pct: agPct, status: getStatus(agPct) });

    for (const team of teams) {
      const mgrRealise = isExclu
        ? avgRealiseExclu(team.agents, allResults)
        : sumRealise(team.agents, allResults, theme);
      const mgrObjectif = sumObjectif(team.agents, theme);
      const mgrPct = mgrObjectif > 0 ? Math.round((mgrRealise / mgrObjectif) * 100) : 0;
      bars.push({ id: `mgr-${team.teamId}`, name: team.managerName, niveau: "manager", realise: mgrRealise, objectif: mgrObjectif, pct: mgrPct, status: getStatus(mgrPct), teamId: team.teamId });

      for (const agent of team.agents) {
        const res = allResults.find(r => r.userId === agent.id);
        const realise = getRealiseForTheme(res, theme);
        const objectif = getObjectifForTheme(agent.category, theme);
        const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
        bars.push({ id: agent.id, name: `${agent.firstName} ${agent.lastName}`, niveau: "conseiller", realise, objectif, pct, status: getStatus(pct), teamId: team.teamId });
      }
    }

    return bars;
  }, [theme, teams, allConseillers, allResults]);

  const projectionData = useMemo<ProjectionEntry[]>(() => {
    const entries: ProjectionEntry[] = [];

    const agPerf = orgStats.avgPerformance;
    entries.push({ id: "agence", name: "Agence", niveau: "agence", performance: agPerf, status: getStatus(agPerf) });

    for (const team of teams) {
      entries.push({ id: `team-${team.teamId}`, name: team.teamName, niveau: "equipe", performance: team.avgPerformance, status: getStatus(team.avgPerformance), teamId: team.teamId, teamName: team.teamName });

      const sortedAgents = [...team.agents]
        .map(agent => {
          const res = allResults.find(r => r.userId === agent.id);
          if (!res) return { agent, perf: 0 };
          const ratios = computeAllRatios(res, agent.category, ratioConfigs);
          const perf = ratios.length > 0
            ? Math.round(ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length)
            : 0;
          return { agent, perf };
        })
        .sort((a, b) => b.perf - a.perf);

      for (const { agent, perf } of sortedAgents) {
        entries.push({ id: agent.id, name: `${agent.firstName} ${agent.lastName}`, niveau: "conseiller", performance: perf, status: getStatus(perf), teamId: team.teamId, teamName: team.teamName });
      }
    }

    return entries;
  }, [teams, allResults, ratioConfigs, orgStats]);

  const rentabilite = useMemo<RentabiliteData | null>(() => {
    if (!directorCosts) return null;
    const directorResults = user ? allResults.find(r => r.userId === user.id) : undefined;
    const caDirecteur = directorResults?.ventes.chiffreAffaires ?? 0;
    const revenuDirecteurVentes = caDirecteur * (directorCosts.commissionDirecteur / 100);
    const caEquipes = orgStats.totalCA;
    const revenuDirecteurEquipes = caEquipes * (directorCosts.commissionDirecteur / 100);
    const chargesTotal = directorCosts.coutsFixes + directorCosts.masseSalariale + directorCosts.autresCharges;
    const resultatAgenceMois = caEquipes - chargesTotal;
    const projectionRevenuAnnuel = (revenuDirecteurVentes + revenuDirecteurEquipes) * 12 - chargesTotal * 12;
    return { revenuDirecteurVentes, revenuDirecteurEquipes, resultatAgenceMois, projectionRevenuAnnuel };
  }, [directorCosts, user, allResults, orgStats]);

  return {
    theme,
    setTheme,
    agencyGPS,
    teamDetails,
    entityBars,
    projectionData,
    rentabilite,
    agencyObjective,
    directorCosts,
  };
}
