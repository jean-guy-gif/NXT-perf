import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCoachId, DEMO_COACH_CALENDAR_URL } from "@/config/coaching";

interface RequestBody {
  planId: string;
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

  if (!body.planId) {
    return NextResponse.json(
      { error: "MISSING_PLAN_ID", message: "planId requis" },
      { status: 400 }
    );
  }

  // 1. Récupérer le plan source + nxt_coaching resource
  const { data: planResource, error: planError } = await supabase
    .from("user_improvement_resources")
    .select("*")
    .eq("id", body.planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (planError || !planResource) {
    return NextResponse.json(
      { error: "PLAN_NOT_FOUND", message: "Plan introuvable" },
      { status: 404 }
    );
  }

  const { data: coachingResource } = await supabase
    .from("user_improvement_resources")
    .select("*")
    .eq("user_id", user.id)
    .eq("resource_type", "nxt_coaching")
    .is("archived_at", null)
    .maybeSingle();

  // 2. Résoudre le coach à assigner (V1 = Jean-Guy, V2 = pool)
  const coachId = await resolveCoachId(planResource.pain_ratio_id ?? undefined);

  // 3. Vérifier si un coach_assignment existe déjà (ACTIVE)
  const { data: existingAssignment } = await supabase
    .from("coach_assignments")
    .select("*")
    .eq("coach_id", coachId)
    .eq("target_type", "AGENT")
    .eq("target_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  let assignmentId: string;

  if (existingAssignment) {
    assignmentId = existingAssignment.id;
  } else {
    // Créer nouveau coach_assignment
    const { data: newAssignment, error: assignError } = await supabase
      .from("coach_assignments")
      .insert({
        coach_id: coachId,
        target_type: "AGENT",
        target_id: user.id,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (assignError || !newAssignment) {
      return NextResponse.json(
        {
          error: "ASSIGNMENT_FAILED",
          message: assignError?.message ?? "Echec creation assignment",
        },
        { status: 500 }
      );
    }

    assignmentId = newAssignment.id;
  }

  // 4. Importer le plan dans coach_plans avec FK traçabilité
  const planPayload = planResource.payload as Record<string, unknown>;
  const weeks = (planPayload?.weeks ?? []) as unknown[];

  const { error: coachPlanError } = await supabase.from("coach_plans").insert({
    coach_assignment_id: assignmentId,
    start_date: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
    weeks: weeks,
    source_improvement_resource_id: planResource.id,
  });

  if (coachPlanError) {
    return NextResponse.json(
      {
        error: "COACH_PLAN_IMPORT_FAILED",
        message: coachPlanError.message,
      },
      { status: 500 }
    );
  }

  // 5. Mettre à jour la ressource nxt_coaching en pending_human_coach
  const now = new Date().toISOString();

  if (coachingResource) {
    await supabase
      .from("user_improvement_resources")
      .update({
        status: "pending_human_coach",
        payload: {
          ...(coachingResource.payload as Record<string, unknown>),
          human_coach_requested_at: now,
          source_plan_id: planResource.id,
        },
      })
      .eq("id", coachingResource.id);
  } else {
    // Créer si n'existe pas (cas bord, normalement elle existe via trigger debrief_offered)
    await supabase.from("user_improvement_resources").insert({
      user_id: user.id,
      resource_type: "nxt_coaching",
      status: "pending_human_coach",
      payload: {
        human_coach_requested_at: now,
        source_plan_id: planResource.id,
      },
    });
  }

  return NextResponse.json({
    success: true,
    assignmentId,
    coachCalendarUrl: DEMO_COACH_CALENDAR_URL,
    message:
      "Coach assigne. Prenez RDV via le lien Calendar pour finaliser le raccordement.",
  });
}
