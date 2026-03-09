"use client";

import { useMemo, useState } from "react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAppStore, type DirectorCosts } from "@/stores/app-store";
import { CATEGORY_OBJECTIVES, GPS_THEME_LABELS, type GPSTheme } from "@/lib/constants";
import { computeAllRatios } from "@/lib/ratios";
import { aggregateResults } from "@/lib/aggregate-results";
import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";

export type PilotPeriod = "mois" | "annee";

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

export interface AgencyOverviewItem {
  theme: GPSTheme;
  label: string;
  realise: number;
  objectif: number;
  pct: number;
  status: PerformanceStatus;
  isCA: boolean;
  isPercent: boolean;
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
  const storeResults = useAppStore(s => s.results);
  const agencyObjective = useAppStore(s => s.agencyObjective);
  const directorCosts = useAppStore(s => s.directorCosts);
  const user = useAppStore(s => s.user);

  const [theme, setTheme] = useState<GPSTheme>("mandats");
  const [period, setPeriod] = useState<PilotPeriod>("mois");

  // ── Compute latest-month results (one per user) ──
  const latestResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults>();
    for (const r of storeResults) {
      const prev = byUser.get(r.userId);
      if (!prev || r.periodStart > prev.periodStart) byUser.set(r.userId, r);
    }
    return Array.from(byUser.values());
  }, [storeResults]);

  // ── Compute YTD aggregated results (one per user) ──
  const currentYear = new Date().getFullYear();
  const jan1 = `${currentYear}-01-01`;

  const ytdResults = useMemo<PeriodResults[]>(() => {
    const byUser = new Map<string, PeriodResults[]>();
    for (const r of storeResults) {
      if (r.periodType === "month" && r.periodStart >= jan1) {
        if (!byUser.has(r.userId)) byUser.set(r.userId, []);
        byUser.get(r.userId)!.push(r);
      }
    }
    const agg: PeriodResults[] = [];
    for (const [, userResults] of byUser) {
      const a = aggregateResults(userResults);
      if (a) agg.push(a);
    }
    return agg;
  }, [storeResults, jan1]);

  // ── Count distinct months in data (for YTD objective multiplier) ──
  const monthCount = useMemo(() => {
    const months = new Set<string>();
    for (const r of storeResults) {
      if (r.periodType === "month" && r.periodStart >= jan1) months.add(r.periodStart.slice(0, 7));
    }
    return Math.max(1, months.size);
  }, [storeResults, jan1]);

  // ── Effective results based on period ──
  const effectiveResults = period === "annee" ? ytdResults : latestResults;
  const objMultiplier = period === "annee" ? monthCount : 1;

  function sumObjScaled(conseillers: User[], t: GPSTheme): number {
    return sumObjectif(conseillers, t) * (t === "exclusivite" ? 1 : objMultiplier);
  }

  const agencyGPS = useMemo<AgencyGPSResult>(() => {
    const isExclu = theme === "exclusivite";
    const realise = isExclu
      ? avgRealiseExclu(allConseillers, effectiveResults)
      : sumRealise(allConseillers, effectiveResults, theme);
    const objectif = sumObjScaled(allConseillers, theme);
    const ecart = realise - objectif;
    const avancement = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
    const projection = period === "annee" ? Math.round(realise / monthCount * 12) : realise * 12;
    return { objectif, realise, ecart, avancement, projection };
  }, [theme, allConseillers, effectiveResults, period, objMultiplier, monthCount]);

  const ALL_THEMES: GPSTheme[] = ["estimations", "mandats", "exclusivite", "visites", "offres", "compromis", "actes", "ca_compromis", "ca_acte"];

  const agencyOverview = useMemo<AgencyOverviewItem[]>(() => {
    return ALL_THEMES.map(t => {
      const isExclu = t === "exclusivite";
      const realise = isExclu
        ? avgRealiseExclu(allConseillers, effectiveResults)
        : sumRealise(allConseillers, effectiveResults, t);
      const objectif = sumObjScaled(allConseillers, t);
      const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
      return {
        theme: t,
        label: GPS_THEME_LABELS[t],
        realise,
        objectif,
        pct,
        status: getStatus(pct),
        isCA: t === "ca_compromis" || t === "ca_acte",
        isPercent: t === "exclusivite",
      };
    });
  }, [allConseillers, effectiveResults, objMultiplier]);

  const teamDetails = useMemo<TeamDetail[]>(() => {
    return teams.map(t => {
      const isExclu = theme === "exclusivite";
      const realise = isExclu
        ? avgRealiseExclu(t.agents, effectiveResults)
        : sumRealise(t.agents, effectiveResults, theme);
      const objectif = sumObjScaled(t.agents, theme);
      const ecart = realise - objectif;
      const pct = objectif > 0 ? Math.round((realise / objectif) * 100) : 0;
      return { teamId: t.teamId, teamName: t.teamName, realise, objectif, ecart, pct, status: getStatus(pct) };
    });
  }, [theme, teams, effectiveResults, objMultiplier]);

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
    period,
    setPeriod,
    monthCount,
    agencyGPS,
    agencyOverview,
    teamDetails,
    entityBars,
    projectionData,
    rentabilite,
    agencyObjective,
    directorCosts,
  };
}
