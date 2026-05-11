/**
 * why-danger-generator — sous-PR Coach-5.
 *
 * Génère un narratif personnalisé "pourquoi ce levier est en danger pour toi"
 * + best practices contextualisées. Couvre les Features 2 (why-danger) + 4
 * (best practices conseiller) en un seul endpoint puisque les 2 surfaces
 * vivent dans le même drawer.
 *
 * Cache in-memory par (expertiseId, deltaBucket). Le deltaBucket est la
 * tranche d'écart vs cible — on group pour permettre une variation utile
 * de prompt sans exploser le nb d'appels API.
 *
 * Fallback silencieux : si fail, retourne `null`. Le caller utilise
 * RATIO_EXPERTISE.diagnosis + commonCauses + getTopPractices() hardcoded.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

export interface WhyDangerOutput {
  diagnosis: string;
  causes: string[];
  practices: string[];
}

interface LlmShape {
  diagnosis?: unknown;
  causes?: unknown;
  practices?: unknown;
}

const CACHE = new Map<string, WhyDangerOutput>();
const MAX_TOKENS = 1200;

function bucketDelta(
  currentValue: number,
  targetValue: number,
  direction: "less_is_better" | "more_is_better",
): string {
  if (targetValue === 0) return "no_target";
  const ratio = currentValue / targetValue;
  const offFromTarget =
    direction === "less_is_better" ? ratio - 1 : 1 - ratio;
  if (offFromTarget < 0.1) return "barely_off";
  if (offFromTarget < 0.3) return "moderate";
  return "severe";
}

function buildUserPrompt(
  expertiseId: ExpertiseRatioId,
  currentValue: number,
  targetValue: number,
): string {
  const expertise = RATIO_EXPERTISE[expertiseId];
  return [
    `Génère le contenu du drawer "Pourquoi ce levier est en danger pour TOI" pour un conseiller immobilier sur le levier "${expertise.label}".`,
    "",
    "DONNÉES DE CONTEXTE :",
    `- Ratio actuel : ${currentValue} (cible ${targetValue}, direction ${expertise.direction})`,
    `- Diagnostic de référence : ${expertise.diagnosis}`,
    `- Causes connues : ${expertise.commonCauses.join(" / ")}`,
    `- Best practices de référence : ${expertise.bestPractices.slice(0, 350)}`,
    "",
    "STRUCTURE ATTENDUE :",
    "1. diagnosis : 2-3 phrases qui expliquent CE QUE ÇA VEUT DIRE quand ce ratio est dégradé. Ton terrain, tutoiement, narratif.",
    "2. causes : 3-4 puces des causes les plus fréquentes spécifiques à ce levier (issues du corpus si possible).",
    "3. practices : 3 puces actionables d'aujourd'hui (impératif manager : 'Note', 'Teste', 'Repasse').",
    "",
    "RÈGLES RÉDACTIONNELLES :",
    "- Tutoiement direct, ton terrain, pas de théorie.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "- Inspire-toi des chunks et synthèses du corpus injecté ci-dessus.",
    "- Phrases courtes (max 20 mots par puce).",
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "diagnosis": "...",
  "causes": ["...", "...", "..."],
  "practices": ["...", "...", "..."]
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

function validate(raw: unknown): WhyDangerOutput {
  const obj = raw as LlmShape;
  const diagnosis =
    typeof obj.diagnosis === "string" && obj.diagnosis.trim().length > 0
      ? obj.diagnosis.trim()
      : "";
  if (diagnosis.length === 0) throw new Error("missing diagnosis");

  const causes = Array.isArray(obj.causes)
    ? (obj.causes as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];
  if (causes.length < 3) throw new Error(`causes too few: ${causes.length}`);

  const practices = Array.isArray(obj.practices)
    ? (obj.practices as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 3)
    : [];
  if (practices.length < 3)
    throw new Error(`practices too few: ${practices.length}`);

  return { diagnosis, causes, practices };
}

export async function getOrGenerateWhyDanger(
  expertiseId: ExpertiseRatioId,
  currentValue: number,
  targetValue: number,
): Promise<WhyDangerOutput | null> {
  const expertise = RATIO_EXPERTISE[expertiseId];
  if (!expertise) return null;

  const bucket = bucketDelta(currentValue, targetValue, expertise.direction);
  const cacheKey = `${expertiseId}-${bucket}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(expertiseId, currentValue, targetValue);
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
      `[why-danger-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
