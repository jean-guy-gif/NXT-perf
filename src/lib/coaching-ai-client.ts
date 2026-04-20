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
export async function generateAIDebrief(debrief: CoachingDebrief, persona?: string): Promise<AIDebriefText | null> {
  try {
    const res = await fetch("/api/coaching-debrief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona,
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

    if (!res.ok) {
      console.error(`coaching-ai-client: API error ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.error) {
      console.error("coaching-ai-client: API returned error field", data.error);
      return null;
    }

    // Validate minimum fields
    if (!data.title || !data.overallSummary) {
      console.error("coaching-ai-client: missing required fields in response");
      return null;
    }

    // Force the closing signature
    data.closing = "tu es meilleur que ce que tu penses, Bonne route";

    return data as AIDebriefText;
  } catch (error) {
    // Silent fallback preservé (contrat produit) mais logging ajouté pour debug
    console.error("coaching-ai-client error:", error);
    return null;
  }
}
