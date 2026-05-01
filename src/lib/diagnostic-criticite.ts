/**
 * Diagnostic criticite — calcule LE point critique du mois.
 *
 * Pool combiné :
 *   • Ratios sous-performants (via detectBiggestPainPoint, scoring €-pondéré
 *     avec leverageWeight)
 *   • Volumes sous-performants (gain € = (target − current) × valeur unitaire,
 *     valeur unitaire ancrée sur avgCommission × actes/volume)
 *
 * Tri descendant sur painScore (= gainPotentielEur pour les volumes,
 * gainPotentielEur × leverageWeight pour les ratios).
 *
 * Les ratios produisent un `id` au format `ExpertiseRatioId`, exploitable par
 * `createPlan30j({mode:"targeted"})`. Les volumes ne créent pas de plan ciblé
 * (le user passe par LeverPicker).
 */

import {
  ALL_EXPERTISE_RATIOS,
  RATIO_EXPERTISE,
  type ProfileLevel,
} from "@/data/ratio-expertise";
import {
  detectBiggestPainPoint,
  type MeasuredRatio,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";

// ─── Volumes : config ─────────────────────────────────────────────────────

export type VolumeKey =
  | "contactsTotaux"
  | "rdvEstimation"
  | "estimationsRealisees"
  | "mandatsSignes"
  | "nombreVisites"
  | "offresRecues"
  | "compromisSignes"
  | "actesSignes";

const VOLUME_KEYS: VolumeKey[] = [
  "contactsTotaux",
  "rdvEstimation",
  "estimationsRealisees",
  "mandatsSignes",
  "nombreVisites",
  "offresRecues",
  "compromisSignes",
  "actesSignes",
];

const VOLUME_LABELS: Record<VolumeKey, string> = {
  contactsTotaux: "Contacts",
  rdvEstimation: "RDV estimation",
  estimationsRealisees: "Estimations",
  mandatsSignes: "Mandats",
  nombreVisites: "Visites",
  offresRecues: "Offres",
  compromisSignes: "Compromis",
  actesSignes: "Actes",
};

const VOLUME_PATHS: Record<VolumeKey, (r: PeriodResults) => number> = {
  contactsTotaux: (r) => r.prospection.contactsTotaux,
  rdvEstimation: (r) => r.prospection.rdvEstimation,
  estimationsRealisees: (r) => r.vendeurs.estimationsRealisees,
  mandatsSignes: (r) => r.vendeurs.mandatsSignes,
  nombreVisites: (r) => r.acheteurs.nombreVisites,
  offresRecues: (r) => r.acheteurs.offresRecues,
  compromisSignes: (r) => r.acheteurs.compromisSignes,
  actesSignes: (r) => r.ventes.actesSignes,
};

/**
 * Objectif mensuel par catégorie. Aligné sur CATEGORY_OBJECTIVES + heuristique
 * "15 contacts par estimation" du legacy dashboard.
 */
function monthlyVolumeTarget(key: VolumeKey, category: UserCategory): number {
  const obj =
    CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  switch (key) {
    case "contactsTotaux":
      return obj.estimations * 15;
    case "rdvEstimation":
      return obj.estimations;
    case "estimationsRealisees":
      return obj.estimations;
    case "mandatsSignes":
      return obj.mandats;
    case "nombreVisites":
      return obj.visites;
    case "offresRecues":
      return obj.offres;
    case "compromisSignes":
      return obj.compromis;
    case "actesSignes":
      return obj.actes;
  }
}

/**
 * Valeur en € d'1 unité de volume, ancrée sur avgCommission × actes/volume.
 * Exemple : pour confirmé, mandats=8/mois et actes=2/mois ⇒ 1 mandat ≈ 25 %
 * d'un acte ≈ 0,25 × avgCommission.
 */
function volumeUnitValue(
  key: VolumeKey,
  category: UserCategory,
  avgCommission: number
): number {
  const obj =
    CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  const targetActes = obj.actes;
  const targetVolume = monthlyVolumeTarget(key, category);
  if (targetActes <= 0 || targetVolume <= 0) return 0;
  // 1 acte = avgCommission. Le ratio actes/volume donne la fraction d'acte
  // que représente 1 unité de ce volume.
  return avgCommission * (targetActes / targetVolume);
}

// ─── Type unifié ──────────────────────────────────────────────────────────

export type CriticitePoint =
  | {
      type: "ratio";
      /** ExpertiseRatioId — utilisable directement par createPlan30j */
      id: string;
      label: string;
      currentValue: number;
      targetValue: number;
      gainEur: number;
      painScore: number;
      /** Source brute pour les consommateurs qui en ont besoin */
      _ratio: PainPointResult;
    }
  | {
      type: "volume";
      id: VolumeKey;
      label: string;
      current: number;
      target: number;
      gainEur: number;
      painScore: number;
    };

export interface DiagnosticCriticite {
  top: CriticitePoint | null;
  others: CriticitePoint[];
}

// ─── API publique ─────────────────────────────────────────────────────────

export function findCriticitePoints(
  measured: MeasuredRatio[],
  profile: ProfileLevel,
  avgCommissionEur: number,
  results: PeriodResults | null,
  category: UserCategory,
  periodMonths: number
): DiagnosticCriticite {
  if (avgCommissionEur <= 0) {
    return { top: null, others: [] };
  }

  // ── Ratios sous-perf : itération via detectBiggestPainPoint ──────────────
  const ratioPoints: CriticitePoint[] = [];
  const seenRatios = new Set<string>();
  let pool = [...measured];

  for (let i = 0; i < ALL_EXPERTISE_RATIOS.length; i++) {
    const next = detectBiggestPainPoint(pool, profile, avgCommissionEur);
    if (!next || seenRatios.has(next.expertiseId)) break;
    seenRatios.add(next.expertiseId);
    ratioPoints.push({
      type: "ratio",
      id: next.expertiseId,
      label: next.expertise.label,
      currentValue: next.currentValue,
      targetValue: next.targetValue,
      gainEur: next.estimatedCaLossEur,
      painScore: next.painScore,
      _ratio: next,
    });
    pool = pool.filter((m) => m.expertiseId !== next.expertiseId);
    if (pool.length === 0) break;
  }

  // ── Force-inclusion (PR3.5 fix BUG 2) : ratios warning/danger issus du
  //    scoring legacy mais que detectBiggestPainPoint a écartés (cas du
  //    dénominateur nul → ratio = 0 → painScore = 0 → faussement "OK").
  //    On les ajoute avec un painScore minimal pour qu'ils apparaissent dans
  //    le drawer "Voir les autres points en danger". Q4 : on ignore les
  //    ratios sans activité upstream (volumeBase = 0).
  for (const m of measured) {
    if (seenRatios.has(m.expertiseId)) continue;
    if (m.legacyStatus !== "warning" && m.legacyStatus !== "danger") continue;
    if (m.volumeBase <= 0) continue;
    const expertise = RATIO_EXPERTISE[m.expertiseId];
    if (!expertise) continue;
    seenRatios.add(m.expertiseId);
    // Estimation prudente : volumeBase × avgCommission × 0.05 (heuristique
    // 5 % du potentiel — placeholder V1, à calibrer).
    const fallbackGain = Math.round(m.volumeBase * avgCommissionEur * 0.05);
    const targetValue = expertise.thresholds[profile];
    ratioPoints.push({
      type: "ratio",
      id: m.expertiseId,
      label: expertise.label,
      currentValue: m.currentValue,
      targetValue,
      gainEur: fallbackGain,
      painScore: Math.max(1, fallbackGain),
      _ratio: {
        expertiseId: m.expertiseId,
        expertise,
        currentValue: m.currentValue,
        targetValue,
        normalizedGap: 0,
        estimatedCaLossEur: fallbackGain,
        painScore: Math.max(1, fallbackGain),
      },
    });
  }

  // ── Volumes sous-perf : gap × valeur unitaire ────────────────────────────
  const volumePoints: CriticitePoint[] = [];
  if (results) {
    const m = Math.max(0.01, periodMonths);
    for (const key of VOLUME_KEYS) {
      const current = VOLUME_PATHS[key](results);
      const targetMonthly = monthlyVolumeTarget(key, category);
      const target = targetMonthly * m;
      if (target <= 0) continue;
      const gap = target - current;
      if (gap <= 0) continue; // OK ou surperf
      const unitValue = volumeUnitValue(key, category, avgCommissionEur);
      const gainEur = gap * unitValue;
      if (gainEur <= 0) continue;
      volumePoints.push({
        type: "volume",
        id: key,
        label: VOLUME_LABELS[key],
        current,
        target: Math.round(target),
        gainEur,
        painScore: gainEur, // PDF : painScore volume = gainPotentielEur
      });
    }
  }

  // ── Pool combiné, tri descendant sur painScore ──────────────────────────
  const all = [...ratioPoints, ...volumePoints].sort(
    (a, b) => b.painScore - a.painScore
  );

  if (all.length === 0) return { top: null, others: [] };
  return { top: all[0], others: all.slice(1) };
}
