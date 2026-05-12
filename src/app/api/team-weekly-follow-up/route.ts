import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getOrGenerateWeeklyFollowUp,
  type WeeklyFollowUpInput,
} from "@/lib/server/coach-rag/weekly-follow-up-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/team-weekly-follow-up
 *
 * Génère un suivi hebdo manager → conseiller (4 points : constat /
 * difficulté / engagement / question) via RAG.
 * Body : WeeklyFollowUpInput shape
 * Response : { followUp: WeeklyFollowUpOutput | null }
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
    ? `team-weekly-follow-up:user:${user.id}`
    : `team-weekly-follow-up:ip:${getClientIp(request)}`;
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

  const input: WeeklyFollowUpInput = {
    firstName,
    level: typeof body.level === "string" ? body.level : undefined,
    expertiseId: isValidExpertiseId(body.expertiseId) ? body.expertiseId : null,
    planMetrics:
      body.planMetrics && typeof body.planMetrics === "object"
        ? {
            dayOfPlan: Number(
              (body.planMetrics as { dayOfPlan: number }).dayOfPlan ?? 0,
            ),
            totalDays: Number(
              (body.planMetrics as { totalDays: number }).totalDays ?? 30,
            ),
            donePct: Number(
              (body.planMetrics as { donePct: number }).donePct ?? 0,
            ),
            doneActions: Number(
              (body.planMetrics as { doneActions: number }).doneActions ?? 0,
            ),
            totalActions: Number(
              (body.planMetrics as { totalActions: number }).totalActions ?? 0,
            ),
          }
        : undefined,
    lastSaisieIso:
      typeof body.lastSaisieIso === "string" ? body.lastSaisieIso : null,
    ratioCurrent:
      typeof body.ratioCurrent === "number" ? body.ratioCurrent : null,
    ratioTarget: typeof body.ratioTarget === "number" ? body.ratioTarget : null,
  };

  try {
    const followUp = await getOrGenerateWeeklyFollowUp(input);
    return NextResponse.json({ followUp });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/team-weekly-follow-up] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
