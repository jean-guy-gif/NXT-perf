/**
 * Weekly coaching debrief engine — v3.
 *
 * Direction: each ratio has an explicit direction (lower_is_better / higher_is_better).
 * Confidence: each ratio has a confidence level based on the volume behind it.
 * Scoring uses percentageOfTarget from computeAllRatios (already direction-aware).
 *
 * Weighting:
 *   if volumeScore < 70 → 80% volume / 20% performance
 *   else → 60% volume / 40% performance
 *
 * Profiles: high_performer, low_volume, low_conversion, mixed, correct, insufficient_data
 */

import type { PeriodResults } from "@/types/results";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import { computeAllRatios } from "@/lib/ratios";

// ── Types ────────────────────────────────────────────────────────────────────

export type VolumeVerdict = "above" | "on_track" | "below" | "no_data";
export type PerformanceLevel = "strong" | "correct" | "weak";
export type AgentProfile = "low_volume" | "low_conversion" | "mixed" | "high_performer" | "correct" | "insufficient_data";
export type RatioDirection = "lower_is_better" | "higher_is_better";
export type RatioConfidence = "low" | "medium" | "high";

export interface VolumeItem {
  label: string;
  actual: number;
  target: number;
  pct: number;
  verdict: VolumeVerdict;
}

export interface RatioInsight {
  ratioId: string;
  label: string;
  value: number;
  target: number;
  pctOfTarget: number;
  status: "ok" | "warning" | "danger";
  level: PerformanceLevel;
  direction: RatioDirection;
  confidence: RatioConfidence;
  confidenceLabel: string;
}

export interface ActionItem {
  type: "volume" | "performance" | "discipline";
  text: string;
}

export interface CoachingDebrief {
  profile: AgentProfile;
  overallStatus: "strong" | "correct" | "needs_work" | "insufficient_data";
  volumeScore: number;
  performanceScore: number;
  compositeScore: number;
  volumeReview: VolumeItem[];
  volumeVerdict: VolumeVerdict;
  performanceReview: RatioInsight[];
  strengths: string[];
  watchouts: string[];
  topPriorities: string[];
  nextWeekPlan: ActionItem[];
  closingSentence: string;
  coachingBranding: string;
  ctaLabel: string;
  ctaUrl: string;
  audioScript: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

import { COACHING_CLOSING, COACHING_BRANDING, COACHING_CTA_LABEL, COACHING_CTA_URL } from "@/lib/personas";

const KEY_RATIOS: RatioId[] = [
  "contacts_rdv",
  "estimations_mandats",
  "pct_mandats_exclusifs",
  "visites_offre",
];

const RATIO_LABELS: Record<string, string> = {
  contacts_rdv: "Contacts → RDV",
  estimations_mandats: "Estimations → Mandats",
  pct_mandats_exclusifs: "% Exclusivité",
  visites_offre: "Visites → Offre",
};

const RATIO_DIRECTIONS: Record<string, RatioDirection> = {
  contacts_rdv: "lower_is_better",
  estimations_mandats: "lower_is_better",
  pct_mandats_exclusifs: "higher_is_better",
  visites_offre: "lower_is_better",
};

// ── Confidence labels ────────────────────────────────────────────────────────

const CONFIDENCE_LABELS: Record<RatioConfidence, string> = {
  low: "Signal à consolider",
  medium: "Lecture à confirmer",
  high: "Lecture fiable",
};

// ── Weekly GPS targets ───────────────────────────────────────────────────────

interface WeeklyTargets {
  contactsTotaux: number;
  rdvEstimation: number;
  estimationsRealisees: number;
  mandatsSignes: number;
  nombreVisites: number;
  compromisSignes: number;
}

const DEFAULT_WEEKLY_TARGETS: Record<UserCategory, WeeklyTargets> = {
  debutant: { contactsTotaux: 30, rdvEstimation: 2, estimationsRealisees: 2, mandatsSignes: 1, nombreVisites: 8, compromisSignes: 0 },
  confirme: { contactsTotaux: 25, rdvEstimation: 2, estimationsRealisees: 2, mandatsSignes: 1, nombreVisites: 6, compromisSignes: 1 },
  expert:   { contactsTotaux: 20, rdvEstimation: 3, estimationsRealisees: 3, mandatsSignes: 2, nombreVisites: 5, compromisSignes: 1 },
};

// ── Confidence calculation ───────────────────────────────────────────────────

/**
 * Confidence depends on the volume behind the ratio.
 * We look at the denominator value (what we're dividing by) + the numerator.
 *
 * Thresholds:
 *   high: denominator ≥ 3 AND numerator ≥ 5
 *   medium: denominator ≥ 2 OR numerator ≥ 3
 *   low: everything else (1 visite / 1 offre, etc.)
 */
function computeRatioConfidence(ratioId: string, results: PeriodResults): RatioConfidence {
  const p = results.prospection;
  const v = results.vendeurs;
  const a = results.acheteurs;

  switch (ratioId) {
    case "contacts_rdv": {
      // numerator = contacts, denominator = rdv
      const num = p.contactsTotaux;
      const den = p.rdvEstimation;
      if (den >= 3 && num >= 10) return "high";
      if (den >= 2 || num >= 5) return "medium";
      return "low";
    }
    case "estimations_mandats": {
      const num = v.estimationsRealisees;
      const den = v.mandatsSignes;
      if (den >= 3 && num >= 5) return "high";
      if (den >= 2 || num >= 3) return "medium";
      return "low";
    }
    case "pct_mandats_exclusifs": {
      const total = v.mandats.length;
      if (total >= 4) return "high";
      if (total >= 2) return "medium";
      return "low";
    }
    case "visites_offre": {
      const num = a.nombreVisites;
      const den = a.offresRecues;
      if (den >= 3 && num >= 8) return "high";
      if (den >= 2 || num >= 4) return "medium";
      return "low";
    }
    default:
      return "low";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function volumePct(actual: number, target: number): number {
  if (target === 0) return actual > 0 ? 150 : 100;
  return clamp(Math.round((actual / target) * 100), 0, 200);
}

// ── Core engine ──────────────────────────────────────────────────────────────

export function generateCoachingDebrief(
  results: PeriodResults,
  category: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig>,
): CoachingDebrief {
  const allRatios = computeAllRatios(results, category, ratioConfigs);
  const targets = DEFAULT_WEEKLY_TARGETS[category];

  // ═══ 1. VOLUME ═════════════════════════════════════════════════════════════

  const volumeItems: VolumeItem[] = [
    { label: "Contacts",       actual: results.prospection.contactsTotaux,     target: targets.contactsTotaux,       pct: 0, verdict: "on_track" },
    { label: "RDV estimation", actual: results.prospection.rdvEstimation,      target: targets.rdvEstimation,        pct: 0, verdict: "on_track" },
    { label: "Estimations",    actual: results.vendeurs.estimationsRealisees,  target: targets.estimationsRealisees, pct: 0, verdict: "on_track" },
    { label: "Mandats",        actual: results.vendeurs.mandatsSignes,         target: targets.mandatsSignes,        pct: 0, verdict: "on_track" },
    { label: "Visites",        actual: results.acheteurs.nombreVisites,        target: targets.nombreVisites,        pct: 0, verdict: "on_track" },
    { label: "Compromis",      actual: results.acheteurs.compromisSignes,      target: targets.compromisSignes,      pct: 0, verdict: "on_track" },
  ];

  for (const item of volumeItems) {
    item.pct = volumePct(item.actual, item.target);
    item.verdict = item.pct >= 110 ? "above" : item.pct >= 80 ? "on_track" : "below";
  }

  const volumeScore = clamp(
    Math.round(volumeItems.reduce((sum, v) => sum + Math.min(v.pct, 100), 0) / volumeItems.length),
    0, 100,
  );

  const belowCount = volumeItems.filter(v => v.verdict === "below").length;
  const aboveCount = volumeItems.filter(v => v.verdict === "above").length;
  const volumeVerdict: VolumeVerdict = belowCount >= 3 ? "below" : aboveCount >= 3 ? "above" : "on_track";

  // ═══ 2. PERFORMANCE (4 key ratios with direction + confidence) ═════════════

  const keyRatioResults = KEY_RATIOS
    .map(id => allRatios.find(r => r.ratioId === id))
    .filter((r): r is ComputedRatio => r !== undefined);

  const performanceReview: RatioInsight[] = keyRatioResults.map(r => {
    const confidence = computeRatioConfidence(r.ratioId, results);
    const direction = RATIO_DIRECTIONS[r.ratioId] ?? "lower_is_better";
    return {
      ratioId: r.ratioId,
      label: RATIO_LABELS[r.ratioId] || r.ratioId,
      value: Math.round(r.value * 100) / 100,
      target: r.thresholdForCategory,
      pctOfTarget: r.percentageOfTarget,  // already direction-aware from computeAllRatios
      status: r.status,
      level: r.status === "ok" ? "strong" as const : r.status === "warning" ? "correct" as const : "weak" as const,
      direction,
      confidence,
      confidenceLabel: CONFIDENCE_LABELS[confidence],
    };
  });

  // Performance score: weight by confidence (high=1.0, medium=0.8, low=0.5)
  const confidenceWeights: Record<RatioConfidence, number> = { high: 1.0, medium: 0.8, low: 0.5 };
  const activeRatios = performanceReview.filter(r => r.value > 0);
  let performanceScore: number;
  if (activeRatios.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const r of activeRatios) {
      const w = confidenceWeights[r.confidence];
      weightedSum += Math.min(r.pctOfTarget, 100) * w;
      totalWeight += w;
    }
    performanceScore = clamp(Math.round(weightedSum / totalWeight), 0, 100);
  } else {
    performanceScore = 0;
  }

  // ═══ 3. WEIGHTING ══════════════════════════════════════════════════════════

  let compositeScore: number;
  if (volumeScore < 70) {
    compositeScore = Math.round(volumeScore * 0.8 + performanceScore * 0.2);
  } else {
    compositeScore = Math.round(volumeScore * 0.6 + performanceScore * 0.4);
  }

  // ═══ 4. PROFILE ════════════════════════════════════════════════════════════

  const hasData = results.prospection.contactsTotaux > 0 || results.vendeurs.estimationsRealisees > 0;
  let profile: AgentProfile;
  if (!hasData) {
    profile = "insufficient_data";
  } else if (volumeScore >= 80 && performanceScore >= 80) {
    profile = "high_performer";
  } else if (volumeScore < 70 && performanceScore < 60) {
    profile = "mixed";
  } else if (volumeScore < 70) {
    profile = "low_volume";
  } else if (performanceScore < 60) {
    profile = "low_conversion";
  } else {
    profile = "correct";
  }

  // ═══ 5. STRENGTHS (max 2, confidence-aware) ═══════════════════════════════

  const strengths: string[] = [];

  const strongRatios = performanceReview.filter(r => r.level === "strong" && r.value > 0);
  if (strongRatios.length > 0) {
    const best = strongRatios.sort((a, b) => b.pctOfTarget - a.pctOfTarget)[0];
    if (best.confidence === "high") {
      strengths.push(`${best.label} solide : ${best.pctOfTarget}% de l'objectif.`);
    } else {
      strengths.push(`${best.label} encourageant (${best.pctOfTarget}% de l'objectif), à confirmer avec plus de volume.`);
    }
  }

  const aboveVolumes = volumeItems.filter(v => v.verdict === "above");
  if (aboveVolumes.length > 0 && strengths.length < 2) {
    strengths.push(`${aboveVolumes.map(v => v.label).join(", ")} au-dessus du cap.`);
  }

  // ═══ 6. WATCHOUTS (max 2, confidence-aware) ═══════════════════════════════

  const watchouts: string[] = [];

  const weakRatios = performanceReview.filter(r => r.level === "weak" && r.value > 0);
  if (weakRatios.length > 0) {
    const worst = weakRatios[0];
    if (worst.confidence === "high") {
      watchouts.push(`${worst.label} en zone critique (${worst.value} vs objectif ${worst.target}).`);
    } else if (worst.confidence === "medium") {
      watchouts.push(`${worst.label} semble fragile (${worst.value} vs objectif ${worst.target}), à surveiller.`);
    } else {
      watchouts.push(`${worst.label} : signal faible, pas assez de volume pour conclure fermement.`);
    }
  }

  const belowVolumes = volumeItems.filter(v => v.verdict === "below");
  if (belowVolumes.length > 0 && watchouts.length < 2) {
    watchouts.push(`Volume insuffisant : ${belowVolumes.map(v => v.label).join(", ")}.`);
  }

  // ═══ 7. TOP PRIORITIES (max 3, profile-driven) ════════════════════════════

  const topPriorities: string[] = [];

  if (profile === "low_volume" || profile === "mixed") {
    const worst = [...belowVolumes].sort((a, b) => a.pct - b.pct)[0];
    if (worst) topPriorities.push(`Priorité n°1 : augmenter tes ${worst.label.toLowerCase()} (${worst.actual}/${worst.target}).`);
  }

  if (profile === "low_conversion" || profile === "mixed") {
    const highConfWeak = weakRatios.filter(r => r.confidence !== "low");
    if (highConfWeak.length > 0) {
      topPriorities.push(`Corriger ton ratio ${highConfWeak[0].label}.`);
    } else if (weakRatios.length > 0) {
      topPriorities.push(`Surveiller ton ratio ${weakRatios[0].label} en augmentant le volume.`);
    }
  }

  if (profile === "high_performer") {
    topPriorities.push("Maintenir ce niveau et viser l'excellence.");
  }

  if (profile === "correct") {
    const highConfWeak = weakRatios.filter(r => r.confidence !== "low");
    if (highConfWeak.length > 0) topPriorities.push(`Consolider ton ratio ${highConfWeak[0].label}.`);
    if (belowVolumes.length > 0) topPriorities.push(`Remonter tes ${belowVolumes[0].label.toLowerCase()}.`);
  }

  if (results.vendeurs.mandats.length > 0 && results.vendeurs.mandats.filter(m => m.type === "exclusif").length === 0 && topPriorities.length < 3) {
    topPriorities.push("Viser au moins un mandat exclusif par semaine.");
  }

  // ═══ 8. NEXT WEEK PLAN (max 3) ════════════════════════════════════════════

  const nextWeekPlan: ActionItem[] = [];

  if (belowVolumes.length > 0) {
    const worst = [...belowVolumes].sort((a, b) => a.pct - b.pct)[0];
    nextWeekPlan.push({ type: "volume", text: `Atteindre ${worst.target} ${worst.label.toLowerCase()} minimum.` });
  } else {
    nextWeekPlan.push({ type: "volume", text: "Maintenir ton rythme de prospection." });
  }

  if (weakRatios.length > 0 && weakRatios[0].confidence !== "low") {
    nextWeekPlan.push({ type: "performance", text: `Améliorer ton ratio ${weakRatios[0].label}.` });
  } else {
    const warningR = performanceReview.filter(r => r.level === "correct" && r.confidence !== "low");
    if (warningR.length > 0) {
      nextWeekPlan.push({ type: "performance", text: `Consolider ton ratio ${warningR[0].label}.` });
    }
  }

  if (results.vendeurs.rdvSuivi === 0 && results.vendeurs.mandatsSignes > 0) {
    nextWeekPlan.push({ type: "discipline", text: "Planifier au moins 2 RDV de suivi vendeurs." });
  }

  // ═══ 9. OVERALL STATUS ═════════════════════════════════════════════════════

  let overallStatus: CoachingDebrief["overallStatus"];
  if (profile === "insufficient_data") overallStatus = "insufficient_data";
  else if (profile === "high_performer") overallStatus = "strong";
  else if (profile === "mixed" || compositeScore < 50) overallStatus = "needs_work";
  else overallStatus = "correct";

  // ═══ 10. AUDIO SCRIPT ═════════════════════════════════════════════════════

  const audio: string[] = [];

  switch (profile) {
    case "high_performer":
      audio.push("Belle semaine. Tes volumes sont au rendez-vous et tes ratios sont solides.");
      break;
    case "low_volume":
      audio.push("Cette semaine, le volume n'y est pas encore. Tes ratios de conversion sont corrects, c'est le volume qui te manque.");
      break;
    case "low_conversion":
      audio.push("Tu travailles assez en volume, mais tes ratios de conversion doivent progresser.");
      break;
    case "mixed":
      audio.push("Semaine difficile. Le volume et la conversion sont en dessous. On va corriger ça ensemble.");
      break;
    case "insufficient_data":
      audio.push("Pas assez de données cette semaine pour un débrief complet.");
      break;
    default:
      audio.push("Semaine correcte. Quelques ajustements à faire.");
  }

  if (strengths.length > 0) audio.push(`Point fort : ${strengths[0]}`);
  if (watchouts.length > 0) audio.push(`Attention : ${watchouts[0]}`);

  // Add confidence caveat in audio if most ratios are low confidence
  const lowConfCount = performanceReview.filter(r => r.confidence === "low" && r.value > 0).length;
  if (lowConfCount >= 2) {
    audio.push("Ces tendances sont à confirmer avec plus de volume la semaine prochaine.");
  }

  if (nextWeekPlan.length > 0) audio.push(`Semaine prochaine : ${nextWeekPlan[0].text}`);
  audio.push(COACHING_CLOSING);

  return {
    profile,
    overallStatus,
    volumeScore,
    performanceScore,
    compositeScore,
    volumeReview: volumeItems,
    volumeVerdict,
    performanceReview,
    strengths: strengths.slice(0, 2),
    watchouts: watchouts.slice(0, 2),
    topPriorities: topPriorities.slice(0, 3),
    nextWeekPlan: nextWeekPlan.slice(0, 3),
    closingSentence: COACHING_CLOSING,
    coachingBranding: COACHING_BRANDING,
    ctaLabel: COACHING_CTA_LABEL,
    ctaUrl: COACHING_CTA_URL,
    audioScript: audio.join(" "),
  };
}
