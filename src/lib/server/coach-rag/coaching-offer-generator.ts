/**
 * coaching-offer-generator — sous-PR Coach-5.
 *
 * Génère un message d'invitation personnalisé pour la session NXT Coaching
 * offerte à la fin d'un plan 30j. Pre-baked dans le payload nxt_coaching
 * (cf. use-improvement-resources.handlePlanExpiration) pour éviter un appel
 * RAG au render.
 *
 * Fallback silencieux : retourne `null` si fail. Le caller utilise un
 * message hardcoded générique.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
  type ProfileLevel,
} from "@/data/ratio-expertise";

export interface CoachingOfferOutput {
  /** Titre court (5-8 mots) du bloc continuity. */
  title: string;
  /** 2-3 phrases d'invitation personnalisée. */
  body: string;
  /** Label CTA bouton (5-7 mots). */
  ctaLabel: string;
  /** 2-3 questions ouvertes que le coach pourrait poser pendant la session. */
  prepQuestions: string[];
}

interface LlmShape {
  title?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  prepQuestions?: unknown;
}

const MAX_TOKENS = 800;

function buildUserPrompt(
  painRatioId: ExpertiseRatioId,
  profile: ProfileLevel,
  painScore: number,
): string {
  const expertise = RATIO_EXPERTISE[painRatioId];
  return [
    `Génère le message d'invitation pour une session NXT Coaching OFFERTE (30 min, gratuit) à proposer à la fin d'un plan 30j sur le levier "${expertise.label}".`,
    "",
    "CONTEXTE DU CONSEILLER :",
    `- Profil : ${profile}`,
    `- Levier travaillé : ${expertise.label}`,
    `- Pain score V2 : ${painScore.toFixed(2)} (échelle 0-1, plus haut = plus douloureux)`,
    `- Diagnostic du levier : ${expertise.diagnosis}`,
    "",
    "STRUCTURE ATTENDUE :",
    "1. title : 5-8 mots accrocheurs, mention 'Ton coach NXT' ou similaire, lié au levier.",
    "2. body : 2-3 phrases d'invitation. Contextualisée au levier + ton terrain Tedesco. Pas de bullshit.",
    "3. ctaLabel : 5-7 mots, impératif (ex: 'Réserver mes 30 min offertes').",
    "4. prepQuestions : 2-3 questions OUVERTES que le coach posera pour démarrer la session (issues de la méthode NXT — privilégier les Q ouvertes).",
    "",
    "RÈGLES :",
    "- Tutoiement direct.",
    "- Inspire-toi du corpus NXT-Coach et de la doctrine méthode.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "- Pas de promesse miraculeuse — c'est une session de coaching pas une formation magique.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "title": "...",
  "body": "...",
  "ctaLabel": "...",
  "prepQuestions": ["...", "...", "..."]
}`,
  ].join("\n");
}

function extractJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    /* fallthrough */
  }
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(content.slice(first, last + 1));
    } catch {
      /* fallthrough */
    }
  }
  throw new Error("LLM output is not valid JSON");
}

function validate(raw: unknown): CoachingOfferOutput {
  const obj = raw as LlmShape;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (title.length === 0) throw new Error("missing title");
  const body = typeof obj.body === "string" ? obj.body.trim() : "";
  if (body.length === 0) throw new Error("missing body");
  const ctaLabel = typeof obj.ctaLabel === "string" ? obj.ctaLabel.trim() : "";
  if (ctaLabel.length === 0) throw new Error("missing ctaLabel");
  const prepQuestions = Array.isArray(obj.prepQuestions)
    ? (obj.prepQuestions as unknown[])
        .filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        )
        .map((s) => s.trim())
        .slice(0, 3)
    : [];
  if (prepQuestions.length < 2)
    throw new Error(`prepQuestions too few: ${prepQuestions.length}`);
  return { title, body, ctaLabel, prepQuestions };
}

export async function generateCoachingOfferMessage(
  painRatioId: ExpertiseRatioId,
  profile: ProfileLevel,
  painScore: number,
): Promise<CoachingOfferOutput | null> {
  try {
    const userPrompt = buildUserPrompt(painRatioId, profile, painScore);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    return validate(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[coaching-offer-generator] RAG failed: ${message}`);
    return null;
  }
}
