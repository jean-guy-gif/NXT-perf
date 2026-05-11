/**
 * computeAxisDeltas — chantier vue évolution DPI.
 *
 * Calcule pour chaque axe DPI le delta entre un score de référence et un
 * score actuel. Retourne `deltaPts` (absolu signé), `deltaPct` (relatif au
 * score de référence — `null` si reference = 0 pour éviter division par 0)
 * et `direction` ("up" / "down" / "flat").
 *
 * Seuil "flat" : `|deltaPts| < 2` (Q4 audit) — évite le bruit visuel sur
 * des micro-variations non significatives.
 *
 * Module pur — pas de hook, pas de side-effect, testable isolément.
 */

const FLAT_THRESHOLD_PTS = 2;

export interface AxisScoreInput {
  id: string;
  label: string;
  score: number;
}

export interface AxisDelta {
  axisId: string;
  axisLabel: string;
  referenceScore: number;
  currentScore: number;
  /** Signed delta in points (current - reference). */
  deltaPts: number;
  /** Percentage delta. `null` si `referenceScore === 0` (pas de base). */
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
}

export function computeAxisDeltas(
  reference: AxisScoreInput[],
  current: AxisScoreInput[],
): AxisDelta[] {
  return current.map((currentAxis) => {
    const refAxis = reference.find((r) => r.id === currentAxis.id);
    const referenceScore = refAxis?.score ?? 0;
    const deltaPts = currentAxis.score - referenceScore;
    const deltaPct =
      referenceScore > 0
        ? Math.round((deltaPts / referenceScore) * 100)
        : null;
    const direction: AxisDelta["direction"] =
      Math.abs(deltaPts) < FLAT_THRESHOLD_PTS
        ? "flat"
        : deltaPts > 0
          ? "up"
          : "down";
    return {
      axisId: currentAxis.id,
      axisLabel: currentAxis.label,
      referenceScore,
      currentScore: currentAxis.score,
      deltaPts,
      deltaPct,
      direction,
    };
  });
}
