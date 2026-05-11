import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  coachChat,
  type ChatMessage,
} from "@/lib/server/coach-rag/openrouter-chat";
import type { CoachMode } from "@/lib/server/coach-rag/system-prompt";

/**
 * POST /api/coach-brain/chat
 *
 * Chat enrichi par retrieval RAG + OpenRouter (Claude Sonnet 4.5 par défaut).
 * Rate limit : 10 req/min/user.
 *
 * Body : {
 *   messages: ChatMessage[];
 *   mode?: "soutien" | "tactique" | "strategique";
 *   skipRetrieval?: boolean;
 *   model?: string;
 *   temperature?: number;
 *   maxTokens?: number;
 * }
 */

function isValidMode(value: unknown): value is CoachMode {
  return value === "soutien" || value === "tactique" || value === "strategique";
}

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as { role: unknown }).role === "string" &&
      ["system", "user", "assistant"].includes(
        (m as { role: string }).role,
      ) &&
      typeof (m as { content: unknown }).content === "string",
  );
}

export async function POST(request: NextRequest) {
  // Sous-PR Coach-4 : mode démo (anonyme) supporté. Rate-limit user-based si
  // authentifié, IP-based + plus strict si anonyme.
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `coach-brain-chat:user:${user.id}`
    : `coach-brain-chat:ip:${getClientIp(request)}`;
  const rateMax = user ? 10 : 5;
  const { allowed } = checkRateLimit(rateKey, rateMax, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isChatMessageArray(body.messages)) {
    return NextResponse.json(
      { error: "messages must be an array of { role, content }" },
      { status: 400 },
    );
  }
  const messages = body.messages;

  const mode = isValidMode(body.mode) ? body.mode : undefined;
  const skipRetrieval = body.skipRetrieval === true;
  const model = typeof body.model === "string" ? body.model : undefined;
  const temperature =
    typeof body.temperature === "number" ? body.temperature : undefined;
  const maxTokens =
    typeof body.maxTokens === "number" ? Math.floor(body.maxTokens) : undefined;

  try {
    const response = await coachChat(messages, {
      mode,
      skipRetrieval,
      model,
      temperature,
      maxTokens,
    });
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/coach-brain/chat] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
