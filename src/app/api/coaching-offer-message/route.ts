import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateCoachingOfferMessage } from "@/lib/server/coach-rag/coaching-offer-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
  type ProfileLevel,
} from "@/data/ratio-expertise";

/**
 * POST /api/coaching-offer-message
 *
 * Génère le message d'invitation personnalisé pour la session NXT Coaching
 * offerte. Pre-baked au moment de la création de la ressource nxt_coaching
 * (cf. use-improvement-resources.handlePlanExpiration).
 *
 * Body : { painRatioId, profile, painScore }
 * Response : { offer: CoachingOfferOutput | null }
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

function isValidProfile(value: unknown): value is ProfileLevel {
  return value === "junior" || value === "confirme" || value === "expert";
}

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `coaching-offer-message:user:${user.id}`
    : `coaching-offer-message:ip:${getClientIp(request)}`;
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

  if (!isValidExpertiseId(body.painRatioId)) {
    return NextResponse.json(
      { error: "painRatioId must be one of the 8 ratio ids" },
      { status: 400 },
    );
  }
  if (!isValidProfile(body.profile)) {
    return NextResponse.json(
      { error: "profile must be junior, confirme or expert" },
      { status: 400 },
    );
  }
  const painScore =
    typeof body.painScore === "number" && Number.isFinite(body.painScore)
      ? body.painScore
      : 0;

  try {
    const offer = await generateCoachingOfferMessage(
      body.painRatioId,
      body.profile,
      painScore,
    );
    return NextResponse.json({ offer });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/coaching-offer-message] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
