/**
 * vocal-coach-tip-generator — sous-PR Coach-12.
 *
 * Génère un tip Coach NXT court (voix Tedesco) basé sur ce que l'agent
 * vient de déclarer vocalement pour une section de saisie. Le tip est
 * affiché après l'extraction numérique pour engager l'agent.
 *
 * Cache in-memory par (section, hash truncated du transcript). Fallback null.
 *
 * Tonalité : Tedesco terrain, 1 phrase d'observation + 1 question ouverte
 * pour faire réfléchir l'agent sur ce qu'il vient de partager.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";

export interface VocalCoachTipInput {
  /** Section vocal saisie (prospection, vendeurs, acheteurs, etc.). */
  section: string;
  /** Transcript brut de ce que l'agent a dit. */
  transcript: string;
  /** Données extraites (objet libre — le LLM les survol). */
  extractedSummary?: string;
}

export interface VocalCoachTipOutput {
  /** 1 phrase d'observation Tedesco sur ce qui a été dit. */
  observation: string;
  /** 1 question ouverte pour faire réfléchir l'agent (méthode NXT). */
  question: string;
  /** Tonalité : positive (vert) / focus (indigo) / concern (orange). */
  mood: "positive" | "focus" | "concern";
}

interface LlmShape {
  observation?: unknown;
  question?: unknown;
  mood?: unknown;
}

const CACHE = new Map<string, VocalCoachTipOutput>();
const MAX_TOKENS = 400;

function transcriptHash(text: string): string {
  // Hash léger pour cache key : longueur + 3 premiers tokens.
  const words = text.trim().split(/\s+/).slice(0, 3).join("_");
  return `${text.length}-${words.toLowerCase()}`;
}

function buildUserPrompt(input: VocalCoachTipInput): string {
  return [
    `Un conseiller immobilier vient de partager vocalement sa saisie sur la section "${input.section}".`,
    "",
    `TRANSCRIPT :`,
    `"${input.transcript}"`,
    "",
    input.extractedSummary
      ? `DONNÉES EXTRAITES : ${input.extractedSummary}`
      : "",
    "",
    "Génère un TIP Coach NXT court — l'agent vient juste de finir de parler, on lui donne un feedback immédiat avant qu'il passe à la section suivante.",
    "",
    "STRUCTURE ATTENDUE :",
    "1. observation : 1 phrase courte (max 20 mots). Observation factuelle sur ce qu'il vient de dire. Tutoiement direct, ton Tedesco. Pas de jugement, pas de générique.",
    "2. question : 1 question OUVERTE pour le faire réfléchir (méthode NXT 71% Q ouvertes). Doit être en lien direct avec ce qu'il a dit.",
    "3. mood : 'positive' (action concrète bien faite) / 'focus' (point de vigilance neutre) / 'concern' (alerte forte).",
    "",
    "RÈGLES :",
    "- 1 SEULE chose à dire (pas 5).",
    "- Tutoiement direct, ton terrain Tedesco.",
    "- Pas de motivation creuse ni de générique.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "observation": "...",
  "question": "...",
  "mood": "focus"
}`,
  ]
    .filter((s) => s !== "")
    .join("\n");
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

function validate(raw: unknown): VocalCoachTipOutput {
  const obj = raw as LlmShape;
  const observation =
    typeof obj.observation === "string" ? obj.observation.trim() : "";
  if (observation.length === 0) throw new Error("missing observation");
  const question =
    typeof obj.question === "string" ? obj.question.trim() : "";
  if (question.length === 0) throw new Error("missing question");
  const moodRaw = typeof obj.mood === "string" ? obj.mood.trim() : "focus";
  const mood: VocalCoachTipOutput["mood"] =
    moodRaw === "positive" || moodRaw === "concern" ? moodRaw : "focus";
  return { observation, question, mood };
}

export async function generateVocalCoachTip(
  input: VocalCoachTipInput,
): Promise<VocalCoachTipOutput | null> {
  if (input.transcript.trim().length < 10) {
    return null; // pas assez de matière à analyser
  }
  const cacheKey = `${input.section}-${transcriptHash(input.transcript)}`;
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
      `[vocal-coach-tip-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
