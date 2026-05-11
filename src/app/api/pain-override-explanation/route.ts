import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generatePainOverrideExplanation,
  type PainOverrideExplanationInput,
} from "@/lib/server/coach-rag/pain-override-explanation-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { ContextRuleId } from "@/lib/pain-point-context-override";

/**
 * POST /api/pain-override-explanation
 *
 * Body : PainOverrideExplanationInput shape
 * Response : { explanation: PainOverrideExplanationOutput | null }
 */

function isValidExpertiseId(value: unknown): value is ExpertiseRatioId {
  return (
    typeof value === "string" &&
    ALL_EXPERTISE_RATIOS.some((r) => r.id === value)
  );
}

const VALID_RULES: ContextRuleId[] = [
  "MANDATS_STOCK_HIGH_ACTES_LOW",
  "ESTIMATIONS_HIGH_MANDATS_LOW",
  "ACHETEURS_HIGH_VISITES_LOW",
  "VISITES_HIGH_OFFRES_LOW",
  "COMPROMIS_HIGH_ACTES_LOW",
];

function isValidRuleId(value: unknown): value is ContextRuleId {
  return (
    typeof value === "string" && VALID_RULES.includes(value as ContextRuleId)
  );
}

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `pain-override:user:${user.id}`
    : `pain-override:ip:${getClientIp(request)}`;
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

  if (!isValidExpertiseId(body.originalExpertiseId)) {
    return NextResponse.json(
      { error: "originalExpertiseId must be a valid ratio id" },
      { status: 400 },
    );
  }
  if (!isValidExpertiseId(body.overrideExpertiseId)) {
    return NextResponse.json(
      { error: "overrideExpertiseId must be a valid ratio id" },
      { status: 400 },
    );
  }
  if (!isValidRuleId(body.ruleId)) {
    return NextResponse.json(
      { error: "ruleId must be a known context rule" },
      { status: 400 },
    );
  }
  const factualReason =
    typeof body.factualReason === "string" ? body.factualReason : "";

  const input: PainOverrideExplanationInput = {
    originalExpertiseId: body.originalExpertiseId,
    overrideExpertiseId: body.overrideExpertiseId,
    ruleId: body.ruleId,
    factualReason,
  };

  try {
    const explanation = await generatePainOverrideExplanation(input);
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/pain-override-explanation] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
