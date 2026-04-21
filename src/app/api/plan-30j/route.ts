import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  PLAN_30J_DURATION_DAYS,
  type Plan30jPayload,
} from "@/config/coaching";
import {
  detectBiggestPainPoint,
  type MeasuredRatio,
  type PainPointResult,
} from "@/lib/pain-point-detector";
import {
  generatePlan30j,
  planToPayload,
} from "@/lib/plan-30-jours";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
  type ProfileLevel,
} from "@/data/ratio-expertise";

interface RequestBody {
  mode: "auto" | "targeted";
  ratioId?: ExpertiseRatioId;
  measuredRatios: MeasuredRatio[];
  profile: ProfileLevel;
  avgCommissionEur: number;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Vous devez etre connecte" },
      { status: 401 }
    );
  }

  // Parse body
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Corps de requete invalide" },
      { status: 400 }
    );
  }

  // Validation
  if (!body.mode || !["auto", "targeted"].includes(body.mode)) {
    return NextResponse.json(
      { error: "INVALID_MODE", message: "Mode doit etre auto ou targeted" },
      { status: 400 }
    );
  }

  if (body.mode === "targeted" && !body.ratioId) {
    return NextResponse.json(
      {
        error: "MISSING_RATIO_ID",
        message: "Mode targeted requiert ratioId",
      },
      { status: 400 }
    );
  }

  // Blocage (µQ2 option C) : refuser si plan actif
  const { data: existingPlan } = await supabase
    .from("user_improvement_resources")
    .select("*")
    .eq("user_id", user.id)
    .eq("resource_type", "plan_30j")
    .eq("status", "active")
    .is("archived_at", null)
    .maybeSingle();

  if (existingPlan) {
    return NextResponse.json(
      {
        error: "PLAN_ACTIVE_ALREADY",
        message: `Un plan est deja actif (${existingPlan.pain_ratio_id}). Terminez-le ou attendez son expiration.`,
        activePlan: existingPlan,
      },
      { status: 409 }
    );
  }

  // Détection douleur
  let painPoint: PainPointResult | null;
  if (body.mode === "auto") {
    painPoint = detectBiggestPainPoint(
      body.measuredRatios,
      body.profile,
      body.avgCommissionEur
    );
  } else {
    const ratioId = body.ratioId!;
    const measured = body.measuredRatios.find(
      (m) => m.expertiseId === ratioId
    );
    if (!measured) {
      return NextResponse.json(
        {
          error: "RATIO_NOT_FOUND",
          message: `Ratio ${ratioId} introuvable`,
        },
        { status: 400 }
      );
    }
    const expertise = RATIO_EXPERTISE[ratioId];
    const target = expertise.thresholds[body.profile];
    painPoint = {
      expertiseId: ratioId,
      expertise,
      currentValue: measured.currentValue,
      targetValue: target,
      normalizedGap:
        Math.abs(measured.currentValue - target) / (target || 1),
      estimatedCaLossEur: 0,
      painScore: 0,
    };
  }

  if (!painPoint) {
    return NextResponse.json(
      {
        error: "NO_PAIN_POINT",
        message: "Aucun ratio en sous-performance detecte",
      },
      { status: 422 }
    );
  }

  // Génération du plan
  const plan = generatePlan30j(painPoint);
  const payload: Plan30jPayload = planToPayload(plan);

  // Insertion BDD
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + PLAN_30J_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  const { data: insertedRow, error: insertError } = await supabase
    .from("user_improvement_resources")
    .insert({
      user_id: user.id,
      resource_type: "plan_30j",
      status: "active",
      payload: payload as unknown as Record<string, unknown>,
      pain_ratio_id: painPoint.expertiseId,
      pain_score: painPoint.painScore,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error: "INSERT_FAILED",
        message: insertError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    resource: insertedRow,
    plan,
  });
}
