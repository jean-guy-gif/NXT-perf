import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generatePlanDebriefNarrative,
  type PlanDebriefNarrativeInput,
} from "@/lib/server/coach-rag/plan-debrief-narrative-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/plan-debrief-narrative
 *
 * Génère un debrief narratif J+30 fin de plan 30j via RAG.
 * Body : PlanDebriefNarrativeInput (planId + numbers + action labels)
 * Response : { narrative: PlanDebriefNarrativeOutput | null }
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

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
    ? `plan-debrief-narrative:user:${user.id}`
    : `plan-debrief-narrative:ip:${getClientIp(request)}`;
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

  const planId = typeof body.planId === "string" ? body.planId : "";
  if (planId.length === 0) {
    return NextResponse.json(
      { error: "planId required" },
      { status: 400 },
    );
  }
  if (!isValidExpertiseId(body.painRatioId)) {
    return NextResponse.json(
      { error: "painRatioId must be one of the 8 ratio ids" },
      { status: 400 },
    );
  }

  const input: PlanDebriefNarrativeInput = {
    planId,
    painRatioId: body.painRatioId,
    ratioBaseline: num(body.ratioBaseline, 0),
    ratioCurrent: num(body.ratioCurrent, 0),
    ratioDeltaPoints: num(body.ratioDeltaPoints, 0),
    isImproving: body.isImproving === true,
    actionsDone: num(body.actionsDone, 0),
    actionsTotal: num(body.actionsTotal, 0),
    percentDone: num(body.percentDone, 0),
    weeksWithSaisie: num(body.weeksWithSaisie, 0),
    monthlyGainEur: num(body.monthlyGainEur, 0),
    annualProjectedEur: num(body.annualProjectedEur, 0),
    doneActionLabels: stringArray(body.doneActionLabels),
    pendingActionLabels: stringArray(body.pendingActionLabels),
  };

  try {
    const narrative = await generatePlanDebriefNarrative(input);
    return NextResponse.json({ narrative });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/plan-debrief-narrative] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
