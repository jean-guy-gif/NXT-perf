import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOrGenerateWeeklyBrief } from "@/lib/server/coach-rag/weekly-brief-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/weekly-brief
 *
 * Génère (ou récupère depuis le cache) la fiche pédagogique d'une semaine
 * du plan 30j. Rate limit : 10 req/min/user.
 *
 * Body : { expertiseId: ExpertiseRatioId; weekNumber: 1|2|3|4; weekTheme?: string }
 * Response : WeeklyBrief | null (null si fallback ne trouve rien)
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

function isValidWeekNumber(value: unknown): value is 1 | 2 | 3 | 4 {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed } = checkRateLimit(
    `weekly-brief:${auth.user.id}`,
    10,
    60_000,
  );
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
  if (!isValidWeekNumber(body.weekNumber)) {
    return NextResponse.json(
      { error: "weekNumber must be 1, 2, 3 or 4" },
      { status: 400 },
    );
  }

  const weekTheme =
    typeof body.weekTheme === "string" && body.weekTheme.trim().length > 0
      ? body.weekTheme.trim()
      : null;

  try {
    const brief = await getOrGenerateWeeklyBrief(
      body.expertiseId,
      body.weekNumber,
      weekTheme,
    );
    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/weekly-brief] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
