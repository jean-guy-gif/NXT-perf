/**
 * Shared TTS service — calls /api/voice/tts (ElevenLabs).
 * Reusable across conversation and coaching debrief.
 */

export type TTSContext = "conversation" | "coach";

/**
 * Format text for more natural speech depending on context.
 * Coach context: add breathing pauses, break dense blocks, keep content intact.
 */
function formatForSpeech(text: string, context: TTSContext): string {
  if (context !== "coach") return text;

  let s = text;

  // 1. Colons → ellipsis pause + line break (breathing after titles/introductions)
  s = s.replace(/\s*:\s*/g, "... ");

  // 2. Semicolons → period + line break (split dense compound sentences)
  s = s.replace(/\s*;\s*/g, ".\n");

  // 3. Periods followed by space → period + pause (natural sentence break)
  s = s.replace(/\.\s+/g, ".\n\n");

  // 4. Exclamation/question marks → same treatment
  s = s.replace(/!\s+/g, "!\n\n");
  s = s.replace(/\?\s+/g, "?\n\n");

  // 5. Long dashes / em-dashes → ellipsis pause
  s = s.replace(/\s*[—–]\s*/g, "... ");

  // 6. Parenthetical content → slight pause around it
  s = s.replace(/\s*\(\s*/g, "... ");
  s = s.replace(/\s*\)\s*/g, "... ");

  // 7. Clean up artifacts: "... ." → "..."
  s = s.replace(/\.\.\.\s*\./g, "...");

  // 9. Collapse excessive whitespace / line breaks (max 2 consecutive newlines)
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]+/g, " ");

  // 10. Dense text protection: if any paragraph > 200 chars, break at commas too
  s = s.split("\n").map((para) => {
    if (para.length > 200) {
      return para.replace(/,\s*/g, ",\n");
    }
    return para;
  }).join("\n");

  return s.trim();
}

/**
 * Fetch audio from /api/voice/tts.
 * Returns the Response (streaming audio/mpeg) or null if failed.
 */
export async function speakText(
  text: string,
  context: TTSContext = "conversation",
  persona?: string,
): Promise<Response | null> {
  if (!text?.trim()) return null;

  const formatted = formatForSpeech(text, context);
  console.log(`[tts/front] context=${context} persona=${persona ?? "none"}`);

  try {
    const res = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatted, context, persona }),
    });

    if (!res.ok) {
      console.log("[TTS] fetch failed:", res.status);
      return null;
    }

    return res;
  } catch (err) {
    console.log("[TTS] error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Play audio from a TTS response. Returns cleanup function.
 * Falls back to Web Speech if ElevenLabs fails.
 */
export async function playTTSResponse(
  res: Response,
  onEnd?: () => void,
): Promise<HTMLAudioElement | null> {
  try {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(url);
    };

    audio.onended = () => { cleanup(); onEnd?.(); };
    audio.onerror = () => { cleanup(); onEnd?.(); };

    await audio.play();
    return audio;
  } catch {
    onEnd?.();
    return null;
  }
}
