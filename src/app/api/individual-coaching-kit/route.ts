import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateIndividualCoachingKitRag,
  type IndividualCoachingRagInput,
} from "@/lib/server/coach-rag/individual-coaching-kit-rag";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/individual-coaching-kit
 *
 * Génère le kit "Préparer mon coaching individuel" via RAG.
 * Body : { firstName, level?, expertiseId, metrics? }
 * Response : { kit: Kit | null }
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `individual-coaching-kit:user:${user.id}`
    : `individual-coaching-kit:ip:${getClientIp(request)}`;
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

  const firstName =
    typeof body.firstName === "string" && body.firstName.trim().length > 0
      ? body.firstName.trim()
      : "";
  if (firstName.length === 0) {
    return NextResponse.json({ error: "firstName required" }, { status: 400 });
  }
  const level = typeof body.level === "string" ? body.level : undefined;
  const expertiseId = isValidExpertiseId(body.expertiseId)
    ? body.expertiseId
    : null;

  let metrics: IndividualCoachingRagInput["metrics"] | undefined;
  if (body.metrics && typeof body.metrics === "object") {
    const m = body.metrics as Record<string, unknown>;
    metrics = {
      dayOfPlan: Number(m.dayOfPlan ?? 0),
      totalDays: Number(m.totalDays ?? 30),
      donePct: Number(m.donePct ?? 0),
      doneActions: Number(m.doneActions ?? 0),
      totalActions: Number(m.totalActions ?? 0),
      remainingActions: Number(m.remainingActions ?? 0),
    };
  }

  const input: IndividualCoachingRagInput = {
    firstName,
    level,
    expertiseId,
    metrics,
  };

  try {
    const kit = await generateIndividualCoachingKitRag(input);
    return NextResponse.json({ kit });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/individual-coaching-kit] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
