import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOrGenerateWhyDanger } from "@/lib/server/coach-rag/why-danger-generator";
import {
  ALL_EXPERTISE_RATIOS,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

/**
 * POST /api/why-danger
 *
 * Génère (ou récupère depuis le cache) le contenu du drawer "Pourquoi ce
 * levier est en danger pour toi" : diagnosis + causes + practices RAG-enrichis.
 * Couvre Features 2 (why-danger) + 4 (best practices conseiller) de Coach-5.
 *
 * Body : { expertiseId, currentValue, targetValue }
 * Response : { whyDanger: WhyDangerOutput | null }
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
    ? `why-danger:user:${user.id}`
    : `why-danger:ip:${getClientIp(request)}`;
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
  const currentValue =
    typeof body.currentValue === "number" && Number.isFinite(body.currentValue)
      ? body.currentValue
      : 0;
  const targetValue =
    typeof body.targetValue === "number" && Number.isFinite(body.targetValue)
      ? body.targetValue
      : 0;

  try {
    const whyDanger = await getOrGenerateWhyDanger(
      body.expertiseId,
      currentValue,
      targetValue,
    );
    return NextResponse.json({ whyDanger });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/why-danger] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
