/**
 * Diagnostic criticite — wrapper around `detectBiggestPainPoint` exposing
 * the *whole* sorted list (top + others) for the verdict + drawer "Voir les
 * autres points en danger".
 */

import { ALL_EXPERTISE_RATIOS, type ProfileLevel } from "@/data/ratio-expertise";
import type {
  MeasuredRatio,
  PainPointResult,
} from "@/lib/pain-point-detector";

// Importe les fonctions internes de pain-point-detector via duplication courte :
// le module n'expose actuellement que `detectBiggestPainPoint`. Pour éviter de
// casser ce module partagé, on réimplemente la chaîne de scoring localement,
// en appelant `detectBiggestPainPoint` deux fois ne suffirait pas.
//
// Ici on appelle l'API publique en boucle "exclude top → re-rank" jusqu'à
// épuisement, ce qui est correct fonctionnellement et reste O(n²) — n=8 max.

import { detectBiggestPainPoint } from "@/lib/pain-point-detector";

export interface DiagnosticCriticite {
  top: PainPointResult | null;
  others: PainPointResult[];
}

/**
 * Retourne le point critique principal + la liste triée des autres points
 * en sous-performance.
 */
export function findCriticitePoints(
  measured: MeasuredRatio[],
  profile: ProfileLevel,
  avgCommissionEur: number
): DiagnosticCriticite {
  if (measured.length === 0 || avgCommissionEur <= 0) {
    return { top: null, others: [] };
  }

  // Itération : on ré-appelle `detectBiggestPainPoint` en retirant le top
  // précédent, jusqu'à ce que la fonction renvoie null (plus de douleur).
  const found: PainPointResult[] = [];
  const seen = new Set<string>();
  let pool = [...measured];

  for (let i = 0; i < ALL_EXPERTISE_RATIOS.length; i++) {
    const next = detectBiggestPainPoint(pool, profile, avgCommissionEur);
    if (!next || seen.has(next.expertiseId)) break;
    found.push(next);
    seen.add(next.expertiseId);
    pool = pool.filter((m) => m.expertiseId !== next.expertiseId);
    if (pool.length === 0) break;
  }

  if (found.length === 0) return { top: null, others: [] };
  return { top: found[0], others: found.slice(1) };
}
