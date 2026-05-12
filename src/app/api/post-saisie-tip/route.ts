import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generatePostSaisieTip,
  type PostSaisieTipInput,
} from "@/lib/server/coach-rag/post-saisie-tip-generator";

/**
 * POST /api/post-saisie-tip
 *
 * Génère un "coup d'œil Coach NXT" focalisé sur 1 micro-action après saisie.
 * Body : PostSaisieTipInput { profile, volumeScore, performanceScore, ... }
 * Response : { tip: PostSaisieTipOutput | null }
 */

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((s): s is string => typeof s === "string")
    : [];
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `post-saisie-tip:user:${user.id}`
    : `post-saisie-tip:ip:${getClientIp(request)}`;
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

  const profile = typeof body.profile === "string" ? body.profile : "";
  if (profile.length === 0) {
    return NextResponse.json({ error: "profile required" }, { status: 400 });
  }

  let weekOverWeekDeltas: PostSaisieTipInput["weekOverWeekDeltas"];
  if (Array.isArray(body.weekOverWeekDeltas)) {
    weekOverWeekDeltas = (body.weekOverWeekDeltas as unknown[])
      .filter(
        (d): d is { label: string; deltaPoints: number } =>
          typeof d === "object" &&
          d !== null &&
          typeof (d as { label?: unknown }).label === "string" &&
          typeof (d as { deltaPoints?: unknown }).deltaPoints === "number",
      )
      .slice(0, 6);
  }

  const input: PostSaisieTipInput = {
    profile,
    volumeScore: num(body.volumeScore, 0),
    performanceScore: num(body.performanceScore, 0),
    compositeScore: num(body.compositeScore, 0),
    watchouts: stringArray(body.watchouts).slice(0, 5),
    strengths: stringArray(body.strengths).slice(0, 5),
    weekOverWeekDeltas,
  };

  try {
    const tip = await generatePostSaisieTip(input);
    return NextResponse.json({ tip });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/post-saisie-tip] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
