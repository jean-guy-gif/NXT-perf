/**
 * pain-override-explanation-generator — sous-PR Coach-8.
 *
 * Génère un narratif Tedesco expliquant pourquoi le top pain a shift de
 * l'algorithme amont (painScoreV2) vers un override contextuel downstream.
 *
 * Exemple : "L'algo aurait dit contacts → estimations parce que c'est le
 * plus en amont. MAIS tu as déjà 8 mandats en stock. Le problème n'est pas
 * d'amener plus de mandats, c'est de transformer ceux que tu as déjà."
 *
 * Cache in-memory par (originalExpertiseId, overrideExpertiseId, ruleId).
 * Fallback : retourne `null` si fail. Le caller affiche alors juste le
 * `reason` factuel hardcodé du context override.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { ContextRuleId } from "@/lib/pain-point-context-override";

export interface PainOverrideExplanationInput {
  originalExpertiseId: ExpertiseRatioId;
  overrideExpertiseId: ExpertiseRatioId;
  ruleId: ContextRuleId;
  factualReason: string;
}

export interface PainOverrideExplanationOutput {
  /** 2-3 phrases narratif Tedesco — ton terrain, ouvert. */
  narrative: string;
  /** 1 question ouverte clé issue du corpus / méthode NXT. */
  keyQuestion: string;
}

const CACHE = new Map<string, PainOverrideExplanationOutput>();
const MAX_TOKENS = 600;

function buildUserPrompt(input: PainOverrideExplanationInput): string {
  const original = RATIO_EXPERTISE[input.originalExpertiseId];
  const override = RATIO_EXPERTISE[input.overrideExpertiseId];
  return [
    `L'algorithme de priorisation (painScoreV2) aurait choisi "${original.label}" comme levier prioritaire pour ce conseiller immobilier, parce que ce ratio est le plus en amont de la chaîne (cascade CA maximale).`,
    "",
    `MAIS une règle contextuelle a détecté un blocage downstream : ${input.factualReason}`,
    "",
    `Du coup, on shift le top pain vers "${override.label}" (plus aval, mais c'est là que ça bloque vraiment).`,
    "",
    "Génère un narratif Tedesco qui explique ce shift au conseiller en termes simples et terrain.",
    "",
    "STRUCTURE ATTENDUE :",
    "1. narrative : 2-3 phrases. Pourquoi le shift fait sens. Tutoiement direct, ton terrain, sans jargon algo. Compare upstream/downstream avec une métaphore concrète si possible.",
    "2. keyQuestion : 1 question OUVERTE issue de la méthode NXT pour faire prendre conscience au conseiller.",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton Tedesco terrain.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "- Phrases courtes. Pas de jargon technique (pas 'painScoreV2', pas 'chainPosition').",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "narrative": "...",
  "keyQuestion": "..."
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

function validate(raw: unknown): PainOverrideExplanationOutput {
  const obj = raw as Record<string, unknown>;
  const narrative =
    typeof obj.narrative === "string" ? obj.narrative.trim() : "";
  if (narrative.length === 0) throw new Error("missing narrative");
  const keyQuestion =
    typeof obj.keyQuestion === "string" ? obj.keyQuestion.trim() : "";
  if (keyQuestion.length === 0) throw new Error("missing keyQuestion");
  return { narrative, keyQuestion };
}

export async function generatePainOverrideExplanation(
  input: PainOverrideExplanationInput,
): Promise<PainOverrideExplanationOutput | null> {
  const cacheKey = `${input.originalExpertiseId}->${input.overrideExpertiseId}-${input.ruleId}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(input);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    const result = validate(parsed);
    CACHE.set(cacheKey, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[pain-override-explanation] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
