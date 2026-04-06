import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/voice/tts
 *
 * Text-to-speech via ElevenLabs streaming.
 * Accepts { text, context? } — context selects the voice.
 * Returns audio/mpeg stream. ELEVENLABS_API_KEY stays server-side.
 */

import { PERSONA_ELEVENLABS_ENV, DEFAULT_PERSONA, isValidPersona } from "@/lib/personas";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_flash_v2_5";

/** Get ElevenLabs voice ID for a persona, with fallback */
function getVoiceId(persona?: string): { voiceId: string; fallback: boolean } {
  if (persona && isValidPersona(persona)) {
    const envVar = PERSONA_ELEVENLABS_ENV[persona];
    const id = process.env[envVar];
    if (id) return { voiceId: id, fallback: false };
  }
  return { voiceId: DEFAULT_VOICE_ID, fallback: true };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { allowed } = checkRateLimit(`voice-tts:${auth.user.id}`, 30, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
  }

  let text: string;
  let persona: string | undefined;
  try {
    const body = await request.json();
    text = body.text;
    persona = body.persona;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { voiceId } = getVoiceId(persona);

  // Normalize abbreviations for natural TTS reading
  const normalizedText = text.trim()
    .replace(/\bRDV\b/gi, "rendez-vous")
    .replace(/\bCA\b/g, "chiffre d'affaires")
    .replace(/\bKPI\b/gi, "indicateur clé")
    .replace(/\bNXT\b/g, "Next")
    .replace(/€/g, " euros")
    .replace(/%/g, " pourcent")
    .replace(/(\d+)\/(\d+)/g, "$1 sur $2");

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: normalizedText,
          model_id: MODEL_ID,
        }),
      },
    );

    if (!response.ok || !response.body) {
      if (process.env.NODE_ENV === "development") console.error("[voice/tts] ElevenLabs error:", response.status);
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 502 });
    }

    return new NextResponse(response.body as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error("[voice/tts] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
