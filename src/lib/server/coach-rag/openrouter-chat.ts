/**
 * openrouter-chat — wrapper OpenRouter chat completion + retrieval injection.
 *
 * SERVEUR UNIQUEMENT. `OPENROUTER_API_KEY` lu dans process.env.
 *
 * Modèle par défaut : anthropic/claude-sonnet-4-5 (configurable via env
 * COACH_RAG_DEFAULT_MODEL). Format de réponse : OpenAI-compatible.
 */

import { retrieveHybrid, listConcepts } from "@/lib/server/coach-rag/retrieve";
import {
  buildSystemPrompt,
  detectMode,
  type CoachMode,
} from "@/lib/server/coach-rag/system-prompt";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.COACH_RAG_DEFAULT_MODEL ?? "anthropic/claude-sonnet-4-5";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CoachChatOptions {
  /** Mode override (sinon auto-détecté depuis le dernier message user). */
  mode?: CoachMode;
  /** Désactive le retrieval RAG (utile pour test isolation OpenRouter). */
  skipRetrieval?: boolean;
  /** Modèle OpenRouter override. */
  model?: string;
  /** Température (défaut 0.4 — coach pragmatique, peu créatif). */
  temperature?: number;
  /** Max output tokens (défaut 800). */
  maxTokens?: number;
}

export interface CoachChatResponse {
  content: string;
  mode: CoachMode;
  retrievalUsed: boolean;
  retrievalChunkCount: number;
  retrievalSynthesisCount: number;
  model: string;
}

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterError("OPENROUTER_API_KEY missing.", 500);
  }
  return key;
}

function lastUserQuery(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

/**
 * Chat principal avec retrieval RAG automatique.
 *
 * 1. Détecte le mode (soutien / tactique / stratégique)
 * 2. Retrieve top-k chunks + syntheses sur le dernier message user
 * 3. Build system prompt enrichi
 * 4. Appel OpenRouter chat completion
 * 5. Retourne contenu + meta (mode, retrieval stats)
 */
export async function coachChat(
  messages: ChatMessage[],
  options: CoachChatOptions = {},
): Promise<CoachChatResponse> {
  const userQuery = lastUserQuery(messages);
  const mode = options.mode ?? detectMode(userQuery);

  let chunks: Awaited<ReturnType<typeof retrieveHybrid>>["chunks"] = [];
  let syntheses: Awaited<ReturnType<typeof retrieveHybrid>>["syntheses"] = [];

  if (!options.skipRetrieval && userQuery.length > 0) {
    try {
      const bundle = await retrieveHybrid(userQuery);
      chunks = bundle.chunks;
      syntheses = bundle.syntheses;
    } catch (err) {
      console.error(
        "[coach-rag/openrouter-chat] retrieval failed, falling back to no-RAG",
        err,
      );
    }
  }

  let concepts: Array<{ name: string; definition: string }> = [];
  if (!options.skipRetrieval) {
    try {
      concepts = await listConcepts();
    } catch (err) {
      console.error("[coach-rag/openrouter-chat] concepts fetch failed", err);
    }
  }

  const systemPrompt = buildSystemPrompt({ mode, chunks, syntheses, concepts });

  const fullMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m) => m.role !== "system"),
  ];

  const apiKey = getApiKey();
  const model = options.model ?? DEFAULT_MODEL;
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://nxt-perf.vercel.app",
      "X-Title": "NXT Performance",
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new OpenRouterError(
      `OpenRouter ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as OpenRouterResponse;
  const content = json.choices[0]?.message?.content ?? "";

  return {
    content,
    mode,
    retrievalUsed: !options.skipRetrieval && chunks.length + syntheses.length > 0,
    retrievalChunkCount: chunks.length,
    retrievalSynthesisCount: syntheses.length,
    model: json.model ?? model,
  };
}
