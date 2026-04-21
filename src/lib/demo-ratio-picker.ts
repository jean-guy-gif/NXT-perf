import type { MeasuredRatio } from "@/lib/pain-point-detector";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

/**
 * Pick a random ratio id from a measured set, avoiding the given id when possible.
 * Used exclusively by demo-mode plan regeneration to guarantee a different plan
 * on each click (anti-doublon). Never mutates the input.
 */
export function pickRandomDemoRatio(
  measuredRatios: MeasuredRatio[],
  excludeRatioId?: ExpertiseRatioId | null
): ExpertiseRatioId | null {
  if (measuredRatios.length === 0) return null;

  const all = measuredRatios.map((m) => m.expertiseId);
  const eligible = excludeRatioId
    ? all.filter((id) => id !== excludeRatioId)
    : all;
  const pool = eligible.length > 0 ? eligible : all;

  return pool[Math.floor(Math.random() * pool.length)];
}
