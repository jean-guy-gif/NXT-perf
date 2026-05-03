import { NextResponse } from "next/server";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import { loadCoachingPatternFromSupabase } from "@/lib/server/coach-brain/load-patterns";

/**
 * GET /api/manager/coach-brain/pattern?expertiseId=X
 *
 * (PR3.8 follow-up — PR-A).
 *
 * Endpoint de lecture serveur pour les patterns coaching ingérés depuis le
 * cerveau du coach (Drive). En V1 : la table peut être vide → l'endpoint
 * répond 404 et l'application continue sur le fallback hardcoded.
 *
 * SÉCURITÉ :
 *   - SUPABASE_SERVICE_ROLE_KEY n'est lue que dans `load-patterns.ts`.
 *   - Aucun secret n'est retourné au client.
 *   - Validation stricte de `expertiseId` contre `RATIO_EXPERTISE`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const expertiseId = url.searchParams.get("expertiseId");

  if (!expertiseId) {
    return NextResponse.json(
      { error: "Missing expertiseId" },
      { status: 400 },
    );
  }
  if (!(expertiseId in RATIO_EXPERTISE)) {
    return NextResponse.json(
      { error: "Invalid expertiseId" },
      { status: 400 },
    );
  }

  const pattern = await loadCoachingPatternFromSupabase(
    expertiseId as ExpertiseRatioId,
  );
  if (!pattern) {
    return NextResponse.json(
      { error: "No pattern found" },
      { status: 404 },
    );
  }
  return NextResponse.json(pattern, { status: 200 });
}
