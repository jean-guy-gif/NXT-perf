import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateNudge,
  type NudgeContext,
} from "@/lib/server/coach-rag/nudge-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/coach-nudge
 *
 * Génère un nudge proactif pour le conseiller en fonction du contexte
 * envoyé (lastSaisieIso, topPainExpertiseId, activePlan, recentExpiredPlan).
 *
 * Body : NudgeContext shape
 * Response : { nudge: NudgeOutput | null }
 *
 * Le client envoie son état (résultats récents, plan actif, etc.) — le
 * serveur ne fait pas de DB read sur l'utilisateur (mode démo compatible).
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
    ? `coach-nudge:user:${user.id}`
    : `coach-nudge:ip:${getClientIp(request)}`;
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

  const ctx: NudgeContext = {
    lastSaisieIso:
      typeof body.lastSaisieIso === "string" ? body.lastSaisieIso : null,
    topPainExpertiseId: isValidExpertiseId(body.topPainExpertiseId)
      ? body.topPainExpertiseId
      : null,
    ratioWeekOverWeekDelta:
      typeof body.ratioWeekOverWeekDelta === "number" &&
      Number.isFinite(body.ratioWeekOverWeekDelta)
        ? body.ratioWeekOverWeekDelta
        : null,
    activePlan:
      body.activePlan &&
      typeof body.activePlan === "object" &&
      isValidExpertiseId((body.activePlan as Record<string, unknown>).expertiseId)
        ? {
            expertiseId: (body.activePlan as { expertiseId: ExpertiseRatioId })
              .expertiseId,
            daysSinceStart: Number(
              (body.activePlan as { daysSinceStart: number }).daysSinceStart,
            ),
            actionsDone: Number(
              (body.activePlan as { actionsDone: number }).actionsDone,
            ),
            actionsTotal: Number(
              (body.activePlan as { actionsTotal: number }).actionsTotal,
            ),
          }
        : null,
    recentExpiredPlan:
      body.recentExpiredPlan &&
      typeof body.recentExpiredPlan === "object" &&
      isValidExpertiseId(
        (body.recentExpiredPlan as Record<string, unknown>).expertiseId,
      )
        ? {
            expertiseId: (
              body.recentExpiredPlan as { expertiseId: ExpertiseRatioId }
            ).expertiseId,
            daysSinceExpiry: Number(
              (body.recentExpiredPlan as { daysSinceExpiry: number })
                .daysSinceExpiry,
            ),
          }
        : null,
  };

  try {
    const nudge = await generateNudge(ctx);
    return NextResponse.json({ nudge });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/coach-nudge] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
