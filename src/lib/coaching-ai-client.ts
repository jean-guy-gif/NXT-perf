/**
 * Client for AI-powered coaching debrief reformulation.
 * Calls the server-side API route that talks to OpenRouter.
 * Falls back silently if the call fails — the local debrief is always available.
 */

import type { CoachingDebrief } from "./coaching-debrief";

export interface AIDebriefText {
  title: string;
  overallSummary: string;
  volumeText: string;
  performanceText: string;
  strengthsText: string;
  watchoutsText: string;
  nextWeekText: string;
  closing: string;
  audioScript: string;
}

/**
 * Request AI reformulation of a coaching debrief.
 * Returns null if the call fails (caller uses local fallback).
 */
export async function generateAIDebrief(debrief: CoachingDebrief): Promise<AIDebriefText | null> {
  try {
    const res = await fetch("/api/coaching-debrief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: debrief.profile,
        volumeScore: debrief.volumeScore,
        performanceScore: debrief.performanceScore,
        compositeScore: debrief.compositeScore,
        volumeReview: debrief.volumeReview,
        performanceReview: debrief.performanceReview,
        strengths: debrief.strengths,
        watchouts: debrief.watchouts,
        topPriorities: debrief.topPriorities,
        nextWeekPlan: debrief.nextWeekPlan,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    // Validate minimum fields
    if (!data.title || !data.overallSummary) return null;

    // Force the closing signature
    data.closing = "T'es meilleur que tu crois. Bonne route.";

    return data as AIDebriefText;
  } catch {
    return null;
  }
}
