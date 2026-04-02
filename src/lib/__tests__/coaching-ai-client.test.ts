import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateAIDebrief } from "../coaching-ai-client";
import type { CoachingDebrief } from "../coaching-debrief";

// Mock debrief payload
const mockDebrief: CoachingDebrief = {
  profile: "correct",
  overallStatus: "correct",
  volumeScore: 75,
  performanceScore: 65,
  compositeScore: 71,
  volumeReview: [
    { label: "Contacts", actual: 25, target: 25, pct: 100, verdict: "on_track" },
  ],
  volumeVerdict: "on_track",
  performanceReview: [
    { ratioId: "contacts_rdv", label: "Contacts → RDV", value: 12.5, target: 15, pctOfTarget: 83, status: "ok", level: "strong", direction: "lower_is_better", confidence: "medium", confidenceLabel: "Lecture à confirmer" },
  ],
  strengths: ["Ratio Contacts → RDV solide."],
  watchouts: ["Volume insuffisant : Mandats."],
  topPriorities: ["Remonter tes mandats."],
  nextWeekPlan: [{ type: "volume", text: "Atteindre 1 mandat minimum." }],
  closingSentence: "tu es meilleur que ce que tu penses, Bonne route",
  coachingBranding: "Ce coaching hebdomadaire vous a été offert par NXT Coaching.",
  ctaLabel: "Tu veux en savoir plus ?",
  ctaUrl: "/formation",
  audioScript: "Semaine correcte. Bonne route.",
};

// Store original fetch
const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Reset fetch mock
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("generateAIDebrief — fallback scenarios", () => {
  it("returns null on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await generateAIDebrief(mockDebrief);
    expect(result).toBeNull();
  });

  it("returns null on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result).toBeNull();
  });

  it("returns null on JSON error response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "AI generation failed" }),
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result).toBeNull();
  });

  it("returns null if title is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ overallSummary: "Some text" }), // no title
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result).toBeNull();
  });

  it("returns null if overallSummary is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "Some title" }), // no summary
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result).toBeNull();
  });

  it("returns valid AIDebriefText on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Bonne dynamique",
        overallSummary: "Semaine correcte avec des points à consolider.",
        volumeText: "Ton volume de prospection est dans le cap.",
        performanceText: "Tes ratios sont corrects mais fragiles.",
        strengthsText: "Ton ratio Contacts → RDV est solide.",
        watchoutsText: "Attention aux mandats, volume insuffisant.",
        nextWeekText: "Semaine prochaine : atteindre au moins 1 mandat.",
        closing: "Mauvaise signature qui sera écrasée",
        audioScript: "Semaine correcte. Continue.",
      }),
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Bonne dynamique");
    expect(result!.overallSummary).toContain("correcte");
    // Closing is ALWAYS forced to the official signature
    expect(result!.closing).toBe("tu es meilleur que ce que tu penses, Bonne route");
  });

  it("forces closing signature even if AI returns different text", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Test",
        overallSummary: "Test",
        closing: "Wrong closing",
      }),
    });
    const result = await generateAIDebrief(mockDebrief);
    expect(result!.closing).toBe("tu es meilleur que ce que tu penses, Bonne route");
  });
});
