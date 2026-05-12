import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateComparisonInsight,
  type ComparisonInsightInput,
} from "@/lib/server/coach-rag/comparison-insight-generator";

/**
 * POST /api/comparison-insight
 *
 * Body : ComparisonInsightInput { otherLabel, biggestGap, expertiseId? }
 * Response : { insight: ComparisonInsightOutput | null }
 */

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `comparison-insight:user:${user.id}`
    : `comparison-insight:ip:${getClientIp(request)}`;
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

  const otherLabel =
    typeof body.otherLabel === "string" && body.otherLabel.trim().length > 0
      ? body.otherLabel.trim()
      : "";
  if (otherLabel.length === 0) {
    return NextResponse.json(
      { error: "otherLabel required" },
      { status: 400 },
    );
  }
  if (!body.biggestGap || typeof body.biggestGap !== "object") {
    return NextResponse.json(
      { error: "biggestGap required" },
      { status: 400 },
    );
  }
  const bg = body.biggestGap as Record<string, unknown>;
  const axisId = typeof bg.axisId === "string" ? bg.axisId : "";
  const label = typeof bg.label === "string" ? bg.label : "";
  const me = Number(bg.me);
  const other = Number(bg.other);
  const gap = Number(bg.gap);
  if (
    axisId.length === 0 ||
    label.length === 0 ||
    !Number.isFinite(me) ||
    !Number.isFinite(other) ||
    !Number.isFinite(gap)
  ) {
    return NextResponse.json(
      { error: "biggestGap requires axisId, label, me, other, gap" },
      { status: 400 },
    );
  }

  const input: ComparisonInsightInput = {
    otherLabel,
    biggestGap: { axisId, label, me, other, gap },
    expertiseId:
      typeof body.expertiseId === "string" ? body.expertiseId : null,
  };

  try {
    const insight = await generateComparisonInsight(input);
    return NextResponse.json({ insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/comparison-insight] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
