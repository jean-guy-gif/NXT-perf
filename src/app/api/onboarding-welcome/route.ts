import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateOnboardingWelcome,
  type OnboardingWelcomeInput,
} from "@/lib/server/coach-rag/onboarding-welcome-generator";

/**
 * POST /api/onboarding-welcome
 *
 * Body : { firstName, category, agentStatus?, profileType? }
 * Response : { welcome: OnboardingWelcomeOutput | null }
 */

const VALID_CATEGORIES = ["debutant", "confirme", "expert"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: unknown): value is ValidCategory {
  return typeof value === "string" && (VALID_CATEGORIES as readonly string[]).includes(value);
}

const VALID_STATUSES = ["salarie", "agent_commercial", "mandataire"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is ValidStatus {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

const VALID_PROFILES = [
  "AGENT",
  "MANAGER",
  "INSTITUTION",
  "COACH",
  "RESEAU",
] as const;
type ValidProfile = (typeof VALID_PROFILES)[number];

function isValidProfile(value: unknown): value is ValidProfile {
  return typeof value === "string" && (VALID_PROFILES as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `onboarding-welcome:user:${user.id}`
    : `onboarding-welcome:ip:${getClientIp(request)}`;
  const rateMax = user ? 5 : 3;
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
  if (!isValidCategory(body.category)) {
    return NextResponse.json(
      { error: "category must be debutant, confirme or expert" },
      { status: 400 },
    );
  }

  const input: OnboardingWelcomeInput = {
    firstName,
    category: body.category,
    agentStatus: isValidStatus(body.agentStatus) ? body.agentStatus : null,
    profileType: isValidProfile(body.profileType) ? body.profileType : null,
  };

  try {
    const welcome = await generateOnboardingWelcome(input);
    return NextResponse.json({ welcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/onboarding-welcome] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
