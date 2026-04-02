import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * POST /api/voice/session
 *
 * Generates an ephemeral token for Gemini Live API via the official SDK.
 * Accepts optional { persona } to select the voice.
 * GEMINI_API_KEY never leaves the server.
 */

const GEMINI_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

import { PERSONA_GEMINI_VOICE, DEFAULT_PERSONA, isValidPersona } from "@/lib/personas";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("[voice/session] GEMINI_API_KEY exists:", !!apiKey);

  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  // Read optional persona from body
  let persona: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    persona = body?.persona;
  } catch { /* no body is fine */ }

  const validPersona = isValidPersona(persona) ? persona : DEFAULT_PERSONA;
  const voiceName = PERSONA_GEMINI_VOICE[validPersona];
  console.log("[voice/session] persona:", persona ?? "default", "voice:", voiceName);

  try {
    const ai = new GoogleGenAI({ apiKey });

    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        httpOptions: { apiVersion: "v1alpha" },
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: GEMINI_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    console.log("[voice/session] Token created successfully");

    return NextResponse.json({
      token: token.name,
      model: GEMINI_MODEL,
      voice: voiceName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice/session] SDK error:", message);
    return NextResponse.json(
      { error: "Failed to create session token" },
      { status: 500 },
    );
  }
}
