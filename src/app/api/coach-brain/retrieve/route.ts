import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { retrieveHybrid } from "@/lib/server/coach-rag/retrieve";

/**
 * POST /api/coach-brain/retrieve
 *
 * Recherche top-k dans le corpus coach (chunks + syntheses).
 * Rate limit : 10 req/min/user (aligné coaching-debrief).
 *
 * Body : { query: string; topChunks?: number; topSyntheses?: number }
 * Response : { chunks: RetrievedChunk[]; syntheses: RetrievedSynthesis[] }
 */
export async function POST(request: NextRequest) {
  // Sous-PR Coach-4 : mode démo supporté. Rate-limit user-based si auth, sinon IP.
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `coach-brain-retrieve:user:${user.id}`
    : `coach-brain-retrieve:ip:${getClientIp(request)}`;
  const rateMax = user ? 10 : 5;
  const { allowed } = checkRateLimit(rateKey, rateMax, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { query?: unknown; topChunks?: unknown; topSyntheses?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query =
    typeof body.query === "string" ? body.query.trim() : "";
  if (query.length === 0) {
    return NextResponse.json(
      { error: "query is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  const topChunks =
    typeof body.topChunks === "number" && body.topChunks > 0
      ? Math.min(20, Math.floor(body.topChunks))
      : undefined;
  const topSyntheses =
    typeof body.topSyntheses === "number" && body.topSyntheses > 0
      ? Math.min(10, Math.floor(body.topSyntheses))
      : undefined;

  try {
    const bundle = await retrieveHybrid(query, { topChunks, topSyntheses });
    return NextResponse.json(bundle);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/coach-brain/retrieve] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
