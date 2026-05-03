/**
 * Team diagnostic aggregator — agrège les douleurs individuelles en
 * leviers prioritaires équipe.
 *
 * Pipeline :
 *   1) Pour chaque conseiller, on consomme `findCriticitePoints` (déjà
 *      utilisé côté Conseiller) et on ne garde que les items `type: "ratio"`.
 *      Les volumes sont écartés ici (trop individuels pour piloter une
 *      action manager équipe).
 *   2) On regroupe par `ExpertiseRatioId` : fréquence (nb conseillers qui
 *      flag ce ratio) + somme/moyenne du gain potentiel €.
 *   3) Score composite = `frequencyCount × avgGainEur` — un levier qui
 *      touche peu de monde mais avec un gain élevé reste pertinent ; un
 *      levier qui touche tout le monde avec un petit gain l'est aussi.
 *   4) On trie descendant et on coupe : top 1 (headline) + secondaires.
 *
 * Pas de nouveau scoring : tout part de `findCriticitePoints` qui est la
 * source de vérité Conseiller V3.
 */

import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import {
  findCriticitePoints,
  type CriticitePoint,
} from "@/lib/diagnostic-criticite";
import type { MeasuredRatio } from "@/lib/pain-point-detector";
import { deriveProfileLevel } from "@/lib/get-avg-commission";
import type { ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";
import type { User } from "@/types/user";

// ─── Types publics ────────────────────────────────────────────────────────

export interface TeamLever {
  expertiseId: ExpertiseRatioId;
  label: string;
  /** Nombre de conseillers de l'équipe pour qui ce levier est en criticité. */
  frequencyCount: number;
  /** Total de conseillers évalués (avec résultats). */
  totalAdvisors: number;
  /** Moyenne du gain potentiel € sur les conseillers qui flag ce levier. */
  avgGainEur: number;
  /** Somme des gains potentiels € sur l'équipe (impact total mensuel). */
  totalGainEur: number;
  /** Score composite (frequencyCount × avgGainEur) — sert au tri. */
  score: number;
}

export interface TeamDiagnosticResult {
  /** Levier prioritaire équipe (ou null si tout est OK). */
  top: TeamLever | null;
  /** Leviers secondaires (max 2). */
  secondaries: TeamLever[];
  /** Nombre de conseillers évalués (avec résultats). */
  totalAdvisors: number;
  /** Tous les leviers détectés (utile pour le bloc "Où ça coince"). */
  allLevers: TeamLever[];
}

// ─── Entrée par conseiller ────────────────────────────────────────────────

export interface AdvisorDiagnosticInput {
  user: User;
  results: PeriodResults | null;
  computedRatios: ComputedRatio[];
  measuredRatios: MeasuredRatio[];
  avgCommissionEur: number;
  /** Période en mois (1 par défaut côté Conseiller). */
  periodMonths?: number;
}

// ─── API publique ─────────────────────────────────────────────────────────

/**
 * Agrège les criticités individuelles en leviers équipe.
 *
 * @param advisors Liste des conseillers (déjà préparés avec ratios mesurés
 *                 et commission moyenne dérivée).
 * @param maxSecondaries Nombre max de leviers secondaires (default 2 → 1 top + 2 secondaires = 3 visibles).
 */
export function aggregateTeamDiagnostic(
  advisors: AdvisorDiagnosticInput[],
  maxSecondaries: number = 2,
): TeamDiagnosticResult {
  const evaluable = advisors.filter(
    (a) => a.results !== null && a.measuredRatios.length > 0 && a.avgCommissionEur > 0,
  );
  const totalAdvisors = evaluable.length;

  if (totalAdvisors === 0) {
    return { top: null, secondaries: [], totalAdvisors: 0, allLevers: [] };
  }

  // Accumulateur par ratio
  const byRatio = new Map<
    ExpertiseRatioId,
    { count: number; totalGain: number }
  >();

  for (const a of evaluable) {
    const profile = deriveProfileLevel(a.user.category);
    const { top, others } = findCriticitePoints(
      a.measuredRatios,
      profile,
      a.avgCommissionEur,
      a.results,
      a.user.category,
      a.periodMonths ?? 1,
    );

    const allPoints: CriticitePoint[] = top ? [top, ...others] : [];
    // On déduplique par expertiseId au sein d'un même conseiller (ne devrait
    // pas arriver — findCriticitePoints garantit l'unicité — mais ceinture
    // et bretelles).
    const seen = new Set<ExpertiseRatioId>();

    for (const p of allPoints) {
      // V1: team diagnostic focuses on ratio levers because they are directly coachable.
      // Volumes are intentionally excluded at this stage.
      // They will be reintroduced later via a mapping (volume -> actionable ratio),
      // similar to volumeToRelatedRatio on the conseiller side.
      if (p.type !== "ratio") continue;
      const id = p.id as ExpertiseRatioId;
      if (seen.has(id)) continue;
      seen.add(id);

      const acc = byRatio.get(id) ?? { count: 0, totalGain: 0 };
      acc.count += 1;
      acc.totalGain += p.gainEur;
      byRatio.set(id, acc);
    }
  }

  const levers: TeamLever[] = [];
  for (const [expertiseId, agg] of byRatio.entries()) {
    const expertise = RATIO_EXPERTISE[expertiseId];
    if (!expertise) continue;
    const avgGainEur = agg.count > 0 ? agg.totalGain / agg.count : 0;
    levers.push({
      expertiseId,
      label: expertise.label,
      frequencyCount: agg.count,
      totalAdvisors,
      avgGainEur,
      totalGainEur: agg.totalGain,
      score: agg.count * avgGainEur,
    });
  }

  levers.sort((a, b) => b.score - a.score);

  if (levers.length === 0) {
    return { top: null, secondaries: [], totalAdvisors, allLevers: [] };
  }

  return {
    top: levers[0],
    secondaries: levers.slice(1, 1 + maxSecondaries),
    totalAdvisors,
    allLevers: levers,
  };
}
