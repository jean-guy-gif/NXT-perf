/**
 * aggregate-pain-points-direction — agrège les pain points conseiller-level
 * en pain points direction-level pour le diagnostic Directeur.
 *
 * Module pur, testable. Politique de tri Q-D1.1 : gain € cumulé max.
 *
 * Pour chaque expertiseId présent dans au moins un painPoint conseiller :
 *   - `gainEurCumule` = somme des `estimatedCaLossEur`
 *   - `nbConseillersConcernes` = nombre distinct de conseillers
 *   - `nbEquipesConcernees` = nombre distinct de teamId
 *   - `painScoreV2Moyen` = moyenne arithmétique des painScoreV2
 */

import type {
  ExpertiseRatioId,
  RatioExpertise,
} from "@/data/ratio-expertise";
import type { PainPointResult } from "@/lib/pain-point-detector";

export interface DirectionPainPoint {
  expertiseId: ExpertiseRatioId;
  expertise: RatioExpertise;
  gainEurCumule: number;
  nbConseillersConcernes: number;
  nbEquipesConcernees: number;
  painScoreV2Moyen: number;
}

export interface ConseillerPainEntry {
  conseillerId: string;
  teamId: string | null;
  painPoints: PainPointResult[];
}

export function aggregatePainPointsDirection(
  entries: ConseillerPainEntry[],
): DirectionPainPoint[] {
  type Acc = {
    expertise: RatioExpertise;
    gainEurCumule: number;
    conseillerIds: Set<string>;
    teamIds: Set<string>;
    painScoreV2Sum: number;
    painPointCount: number;
  };

  const map = new Map<ExpertiseRatioId, Acc>();

  for (const entry of entries) {
    for (const pp of entry.painPoints) {
      const existing = map.get(pp.expertiseId);
      if (existing) {
        existing.gainEurCumule += pp.estimatedCaLossEur;
        existing.conseillerIds.add(entry.conseillerId);
        if (entry.teamId) existing.teamIds.add(entry.teamId);
        existing.painScoreV2Sum += pp.painScoreV2;
        existing.painPointCount += 1;
      } else {
        const teamIds = new Set<string>();
        if (entry.teamId) teamIds.add(entry.teamId);
        map.set(pp.expertiseId, {
          expertise: pp.expertise,
          gainEurCumule: pp.estimatedCaLossEur,
          conseillerIds: new Set([entry.conseillerId]),
          teamIds,
          painScoreV2Sum: pp.painScoreV2,
          painPointCount: 1,
        });
      }
    }
  }

  const result: DirectionPainPoint[] = [];
  for (const [expertiseId, acc] of map.entries()) {
    result.push({
      expertiseId,
      expertise: acc.expertise,
      gainEurCumule: acc.gainEurCumule,
      nbConseillersConcernes: acc.conseillerIds.size,
      nbEquipesConcernees: acc.teamIds.size,
      painScoreV2Moyen: acc.painScoreV2Sum / acc.painPointCount,
    });
  }

  result.sort((a, b) => b.gainEurCumule - a.gainEurCumule);
  return result;
}
