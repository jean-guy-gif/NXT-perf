"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useDirectorData } from "@/hooks/use-director-data";
import { computeAllRatios } from "@/lib/ratios";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import {
  detectTopPainPoints,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import {
  bucketTeamSize,
  resolveThreshold,
  type ThresholdContext,
} from "@/lib/diagnostic/resolve-threshold";
import {
  aggregatePainPointsDirection,
  type ConseillerPainEntry,
  type DirectionPainPoint,
} from "@/lib/director/aggregate-pain-points-direction";
import {
  buildHeatmapRows,
  CHAIN_LEVERS,
  type ConseillerLeverInput,
  type HeatmapRow,
  type TeamMeta,
} from "@/lib/director/aggregate-team-ratio-per-lever";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
  type ProfileLevel,
} from "@/data/ratio-expertise";
import type { User, UserCategory } from "@/types/user";
import type { PeriodResults } from "@/types/results";

const FALLBACK_AVG_COMMISSION_EUR = 8000;
const TOP_PAIN_LIMIT_PER_CONSEILLER = 8;

export type ProductionStatus = "ahead" | "on_track" | "behind" | "no_target";

export interface ProductionDirection {
  estimations: number;
  mandats: number;
  visites: number;
  compromis: number;
  actes: number;
  caCumule: number;
  monthlyActesTarget: number | null;
  expectedActes: number | null;
  actesStatus: ProductionStatus;
  dayOfMonth: number;
  daysInMonth: number;
}

export interface DirecteurDiagnostic {
  topLever: DirectionPainPoint | null;
  otherLevers: DirectionPainPoint[];
  heatmap: HeatmapRow[];
  production: ProductionDirection;
  conseillerCount: number;
  teamCount: number;
  managerCount: number;
  isEmpty: boolean;
}

function deriveSeniority(category: UserCategory): ProfileLevel {
  if (category === "debutant") return "junior";
  if (category === "expert") return "expert";
  return "confirme";
}

interface ConseillerComputed {
  conseiller: User;
  results: PeriodResults;
  ctx: ThresholdContext;
  painPoints: PainPointResult[];
  /** Mesures par expertiseId pour les 4 leviers chaîne — pour la heatmap. */
  chainMeasures: Array<{
    expertiseId: ExpertiseRatioId;
    currentValue: number;
    targetValue: number;
  }>;
}

function todayStats() {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  return { dayOfMonth, daysInMonth };
}

function classifyActesStatus(
  actes: number,
  expected: number | null,
): ProductionStatus {
  if (expected === null || expected === 0) return "no_target";
  const ratio = actes / expected;
  if (ratio >= 1.0) return "ahead";
  if (ratio >= 0.85) return "on_track";
  return "behind";
}

export function useDirecteurDiagnostic(): DirecteurDiagnostic {
  const user = useAppStore((s) => s.user);
  const { teams, allConseillers, allManagers, allResults, ratioConfigs } =
    useDirectorData();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const institutionId = user?.institutionId ?? null;

  const scopedConseillers = useMemo(() => {
    if (!institutionId) return allConseillers;
    return allConseillers.filter((c) => c.institutionId === institutionId);
  }, [allConseillers, institutionId]);

  const scopedManagers = useMemo(() => {
    if (!institutionId) return allManagers;
    return allManagers.filter((m) => m.institutionId === institutionId);
  }, [allManagers, institutionId]);

  const scopedTeams = useMemo(() => {
    if (!institutionId) return teams;
    const managerIds = new Set(scopedManagers.map((m) => m.id));
    return teams.filter(
      (t) =>
        managerIds.has(t.managerId) ||
        scopedConseillers.some((c) => c.teamId === t.teamId),
    );
  }, [teams, institutionId, scopedManagers, scopedConseillers]);

  const avgCommissionEur =
    agencyObjective?.avgActValue && agencyObjective.avgActValue > 0
      ? agencyObjective.avgActValue
      : FALLBACK_AVG_COMMISSION_EUR;

  const conseillerComputed = useMemo<ConseillerComputed[]>(() => {
    const out: ConseillerComputed[] = [];
    for (const conseiller of scopedConseillers) {
      const results = allResults.find((r) => r.userId === conseiller.id);
      if (!results) continue;
      const computedRatios = computeAllRatios(
        results,
        conseiller.category,
        ratioConfigs,
      );
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const teamMembers = scopedConseillers.filter(
        (c) => c.teamId === conseiller.teamId,
      );
      const teamSize = Math.max(1, teamMembers.length);
      const ctx: ThresholdContext = {
        seniority: deriveSeniority(conseiller.category),
        agentStatus: conseiller.agentStatus ?? null,
        teamSizeBucket: bucketTeamSize(teamSize),
        avgCommissionEur,
      };
      const painPoints = detectTopPainPoints(
        measuredRatios,
        ctx,
        TOP_PAIN_LIMIT_PER_CONSEILLER,
      );
      const chainMeasures = CHAIN_LEVERS.map((leverId) => {
        const measured = measuredRatios.find((m) => m.expertiseId === leverId);
        if (!measured) return null;
        const expertise = RATIO_EXPERTISE[leverId];
        const targetValue = resolveThreshold(expertise, ctx);
        return {
          expertiseId: leverId,
          currentValue: measured.currentValue,
          targetValue,
        };
      }).filter((m): m is NonNullable<typeof m> => m !== null);

      out.push({ conseiller, results, ctx, painPoints, chainMeasures });
    }
    return out;
  }, [scopedConseillers, allResults, ratioConfigs, avgCommissionEur]);

  const topLever = useMemo(() => {
    const entries: ConseillerPainEntry[] = conseillerComputed.map((c) => ({
      conseillerId: c.conseiller.id,
      teamId: c.conseiller.teamId ?? null,
      painPoints: c.painPoints,
    }));
    return aggregatePainPointsDirection(entries);
  }, [conseillerComputed]);

  const heatmap = useMemo(() => {
    const teamsMeta: TeamMeta[] = scopedTeams.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      managerName: t.managerName,
      agentCount: t.agentCount,
      dpiAvg: t.avgPerformance,
    }));
    const inputs: ConseillerLeverInput[] = conseillerComputed.map((c) => ({
      conseillerId: c.conseiller.id,
      teamId: c.conseiller.teamId ?? null,
      measures: c.chainMeasures,
    }));
    return buildHeatmapRows(teamsMeta, inputs);
  }, [scopedTeams, conseillerComputed]);

  const production = useMemo<ProductionDirection>(() => {
    let estimations = 0;
    let mandats = 0;
    let visites = 0;
    let compromis = 0;
    let actes = 0;
    let caCumule = 0;
    for (const c of conseillerComputed) {
      estimations += c.results.vendeurs.estimationsRealisees ?? 0;
      mandats += c.results.vendeurs.mandatsSignes ?? 0;
      visites += c.results.acheteurs.nombreVisites ?? 0;
      compromis += c.results.acheteurs.compromisSignes ?? 0;
      actes += c.results.ventes.actesSignes ?? 0;
      caCumule += c.results.ventes.chiffreAffaires ?? 0;
    }

    const annualActesTarget =
      agencyObjective?.annualCA &&
      agencyObjective.annualCA > 0 &&
      agencyObjective.avgActValue &&
      agencyObjective.avgActValue > 0
        ? agencyObjective.annualCA / agencyObjective.avgActValue
        : null;
    const monthlyActesTarget =
      annualActesTarget !== null ? annualActesTarget / 12 : null;

    const { dayOfMonth, daysInMonth } = todayStats();
    const expectedActes =
      monthlyActesTarget !== null
        ? (dayOfMonth / daysInMonth) * monthlyActesTarget
        : null;
    const actesStatus = classifyActesStatus(actes, expectedActes);

    return {
      estimations,
      mandats,
      visites,
      compromis,
      actes,
      caCumule,
      monthlyActesTarget:
        monthlyActesTarget !== null ? Math.round(monthlyActesTarget) : null,
      expectedActes:
        expectedActes !== null ? Math.round(expectedActes * 10) / 10 : null,
      actesStatus,
      dayOfMonth,
      daysInMonth,
    };
  }, [conseillerComputed, agencyObjective]);

  return {
    topLever: topLever[0] ?? null,
    otherLevers: topLever.slice(1, 5),
    heatmap,
    production,
    conseillerCount: scopedConseillers.length,
    teamCount: scopedTeams.length,
    managerCount: scopedManagers.length,
    isEmpty: scopedTeams.length === 0 || conseillerComputed.length === 0,
  };
}
