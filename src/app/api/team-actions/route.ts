import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOrGenerateTeamActions } from "@/lib/server/coach-rag/team-actions-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/team-actions
 *
 * Génère (ou récupère depuis le cache) les 3 actions équipe pour un levier
 * via RAG (Claude Sonnet 4.5 + corpus NXT-Coach + doctrine NXT).
 * Rate limit : 10 req/min/user.
 *
 * Body : { expertiseId: ExpertiseRatioId }
 * Response : { actions: string[3] }
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

export async function POST(request: NextRequest) {
  // Sous-PR Coach-4 : mode démo supporté.
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `team-actions:user:${user.id}`
    : `team-actions:ip:${getClientIp(request)}`;
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

  if (!isValidExpertiseId(body.expertiseId)) {
    return NextResponse.json(
      { error: "expertiseId must be one of the 8 ratio ids" },
      { status: 400 },
    );
  }

  try {
    const actions = await getOrGenerateTeamActions(body.expertiseId);
    return NextResponse.json({ actions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/team-actions] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
