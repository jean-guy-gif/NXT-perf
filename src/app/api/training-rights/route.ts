import { NextResponse } from "next/server";
import { computeRights, extractInputFromDraft } from "@/lib/simulateTrainingRights";
import type { AgeficeDraft } from "@/lib/plan-storage";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const draft = body.draft as AgeficeDraft;

    if (!draft || !draft.nom || !draft.email) {
      return NextResponse.json(
        { error: "Données incomplètes" },
        { status: 400 },
      );
    }

    const input = extractInputFromDraft(draft);
    const result = computeRights(input);

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
