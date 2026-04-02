import { NextRequest, NextResponse } from "next/server";

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
    console.log(`[voice/tts] missing env ${envVar}, fallback to default`);
  }
  return { voiceId: DEFAULT_VOICE_ID, fallback: true };
}

export async function POST(request: NextRequest) {
  console.log("[voice/tts] Request received");

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
  }

  let text: string;
  let context: string | undefined;
  let persona: string | undefined;
  try {
    const body = await request.json();
    text = body.text;
    context = body.context;
    persona = body.persona;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { voiceId, fallback } = getVoiceId(persona);
  console.log(`[voice/tts] context=${context ?? "default"} persona=${persona ?? "none"} voiceId=${voiceId} fallback=${fallback}`);

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
          text: text.trim(),
          model_id: MODEL_ID,
        }),
      },
    );

    if (!response.ok || !response.body) {
      console.error("[voice/tts] ElevenLabs error:", response.status);
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 502 });
    }

    console.log("[voice/tts] Streaming audio response");

    return new NextResponse(response.body as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[voice/tts] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
